/**
 * Amazon Product Images API Route
 *
 * This serverless function fetches fresh product image URLs from Amazon's
 * Product Advertising API. It's designed to be called:
 * 1. From Sanity Studio when creating/editing products
 * 2. From the frontend when cached image URLs are stale (>24 hours)
 *
 * API Endpoints:
 * - GET  /api/amazon-images?asin=B123456789
 * - POST /api/amazon-images { asins: ['B123456789', 'B987654321'] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getProductByAsin, getProductsByAsins, type ProductData } from '@/lib/amazon-pa-api';

/**
 * Rate limiting configuration
 * Amazon PA API has rate limits - we implement basic protection
 */
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 20;
const requestCounts = new Map<string, { count: number; resetTime: number }>();

/**
 * Simple rate limiter based on IP address
 */
function checkRateLimit(identifier: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = requestCounts.get(identifier);

  if (!record || now > record.resetTime) {
    // New window
    requestCounts.set(identifier, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return { allowed: true };
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    // Rate limit exceeded
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }

  // Increment count
  record.count++;
  return { allowed: true };
}

/**
 * GET /api/amazon-images?asin=B123456789
 * Fetches product images for a single ASIN
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const identifier = request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitResult = checkRateLimit(identifier);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfter: rateLimitResult.retryAfter },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter),
          },
        }
      );
    }

    // Extract ASIN from query params
    const searchParams = request.nextUrl.searchParams;
    const asin = searchParams.get('asin');

    if (!asin) {
      return NextResponse.json(
        { error: 'Missing required parameter: asin' },
        { status: 400 }
      );
    }

    // Validate ASIN format
    if (asin.length !== 10) {
      return NextResponse.json(
        { error: 'Invalid ASIN format. ASIN must be exactly 10 characters.' },
        { status: 400 }
      );
    }

    // Fetch product data from PA API
    const productData = await getProductByAsin(asin);

    return NextResponse.json({
      success: true,
      data: productData,
    });

  } catch (error: any) {
    console.error('Error in GET /api/amazon-images:', error);

    // Handle specific error cases
    if (error.message?.includes('authentication failed')) {
      return NextResponse.json(
        { error: 'Amazon PA API authentication failed. Check server configuration.' },
        { status: 500 }
      );
    }

    if (error.message?.includes('rate limit exceeded')) {
      return NextResponse.json(
        { error: 'Amazon PA API rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    if (error.message?.includes('No product found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to fetch product images' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/amazon-images
 * Body: { asins: ['B123456789', 'B987654321'] }
 * Fetches product images for multiple ASINs (batch request)
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting (batch requests count as multiple)
    const identifier = request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitResult = checkRateLimit(identifier);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfter: rateLimitResult.retryAfter },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter),
          },
        }
      );
    }

    // Parse request body
    const body = await request.json();
    const { asins } = body;

    if (!asins || !Array.isArray(asins)) {
      return NextResponse.json(
        { error: 'Missing or invalid parameter: asins (must be an array)' },
        { status: 400 }
      );
    }

    if (asins.length === 0) {
      return NextResponse.json(
        { error: 'At least one ASIN is required' },
        { status: 400 }
      );
    }

    if (asins.length > 10) {
      return NextResponse.json(
        { error: 'Maximum 10 ASINs allowed per request' },
        { status: 400 }
      );
    }

    // Validate ASIN formats
    for (const asin of asins) {
      if (typeof asin !== 'string' || asin.length !== 10) {
        return NextResponse.json(
          { error: `Invalid ASIN format: ${asin}. All ASINs must be exactly 10 characters.` },
          { status: 400 }
        );
      }
    }

    // Fetch products data from PA API
    const productsMap = await getProductsByAsins(asins);

    // Convert Map to object for JSON response
    const productsData: Record<string, ProductData> = {};
    productsMap.forEach((data, asin) => {
      productsData[asin] = data;
    });

    return NextResponse.json({
      success: true,
      data: productsData,
      count: productsMap.size,
    });

  } catch (error: any) {
    console.error('Error in POST /api/amazon-images:', error);

    // Handle specific error cases
    if (error.message?.includes('authentication failed')) {
      return NextResponse.json(
        { error: 'Amazon PA API authentication failed. Check server configuration.' },
        { status: 500 }
      );
    }

    if (error.message?.includes('rate limit exceeded')) {
      return NextResponse.json(
        { error: 'Amazon PA API rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to fetch product images' },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS handler for CORS preflight requests
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
