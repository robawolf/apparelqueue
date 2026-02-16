/**
 * Amazon Product Advertising API 5.0 Client
 *
 * Uses the official paapi5-nodejs-sdk with proper configuration for Next.js.
 * The SDK is loaded dynamically to avoid webpack bundling issues.
 *
 * @see https://webservices.amazon.com/paapi5/documentation/
 */

/**
 * Configuration for Amazon PA API
 */
const PA_API_CONFIG = {
  accessKey: process.env.AMAZON_PA_API_ACCESS_KEY || '',
  secretKey: process.env.AMAZON_PA_API_SECRET_KEY || '',
  partnerTag: process.env.AMAZON_PA_API_PARTNER_TAG || '',
  region: process.env.AMAZON_PA_API_REGION || 'us-east-1',
  host: 'webservices.amazon.com',
};

/**
 * Validates that all required credentials are present
 */
function validateCredentials(): void {
  if (!PA_API_CONFIG.accessKey) {
    throw new Error('AMAZON_PA_API_ACCESS_KEY is not configured');
  }
  if (!PA_API_CONFIG.secretKey) {
    throw new Error('AMAZON_PA_API_SECRET_KEY is not configured');
  }
  if (!PA_API_CONFIG.partnerTag) {
    throw new Error('AMAZON_PA_API_PARTNER_TAG is not configured');
  }
}

/**
 * Interface for product image data
 */
export interface ProductImage {
  url: string;
  width?: number;
  height?: number;
}

/**
 * Interface for product data returned from PA API
 */
export interface ProductData {
  asin: string;
  title?: string;
  images: {
    primary?: {
      small?: ProductImage;
      medium?: ProductImage;
      large?: ProductImage;
    };
    variants?: Array<{
      small?: ProductImage;
      medium?: ProductImage;
      large?: ProductImage;
    }>;
  };
  detailPageUrl?: string;
  fetchedAt: string; // ISO 8601 timestamp
}

/**
 * Extracts image data from PA API response item
 */
function extractImageData(item: any): ProductData['images'] {
  const images: ProductData['images'] = {};

  // Extract primary image
  if (item.Images?.Primary) {
    images.primary = {};
    if (item.Images.Primary.Small) {
      images.primary.small = {
        url: item.Images.Primary.Small.URL,
        width: item.Images.Primary.Small.Width,
        height: item.Images.Primary.Small.Height,
      };
    }
    if (item.Images.Primary.Medium) {
      images.primary.medium = {
        url: item.Images.Primary.Medium.URL,
        width: item.Images.Primary.Medium.Width,
        height: item.Images.Primary.Medium.Height,
      };
    }
    if (item.Images.Primary.Large) {
      images.primary.large = {
        url: item.Images.Primary.Large.URL,
        width: item.Images.Primary.Large.Width,
        height: item.Images.Primary.Large.Height,
      };
    }
  }

  // Extract variant images
  if (item.Images?.Variants && Array.isArray(item.Images.Variants)) {
    images.variants = item.Images.Variants.map((variant: any) => {
      const variantImage: any = {};
      if (variant.Small) {
        variantImage.small = {
          url: variant.Small.URL,
          width: variant.Small.Width,
          height: variant.Small.Height,
        };
      }
      if (variant.Medium) {
        variantImage.medium = {
          url: variant.Medium.URL,
          width: variant.Medium.Width,
          height: variant.Medium.Height,
        };
      }
      if (variant.Large) {
        variantImage.large = {
          url: variant.Large.URL,
          width: variant.Large.Width,
          height: variant.Large.Height,
        };
      }
      return variantImage;
    });
  }

  return images;
}

/**
 * Fetches product data by ASIN from Amazon PA API
 *
 * @param asin - Amazon Standard Identification Number (10 characters)
 * @returns Product data including images and metadata
 * @throws Error if API request fails or ASIN is invalid
 */
export async function getProductByAsin(asin: string): Promise<ProductData> {
  validateCredentials();

  // Validate ASIN format
  if (!asin || asin.length !== 10) {
    throw new Error(`Invalid ASIN format: ${asin}. ASIN must be exactly 10 characters.`);
  }

  // Dynamic import to avoid webpack bundling issues
  const ProductAdvertisingAPIv1 = await import('paapi5-nodejs-sdk');

  // Initialize API client
  const defaultClient = ProductAdvertisingAPIv1.ApiClient.instance;
  defaultClient.accessKey = PA_API_CONFIG.accessKey;
  defaultClient.secretKey = PA_API_CONFIG.secretKey;
  defaultClient.host = PA_API_CONFIG.host;
  defaultClient.region = PA_API_CONFIG.region;

  const api = new ProductAdvertisingAPIv1.DefaultApi();

  // Create GetItems request
  const getItemsRequest = new ProductAdvertisingAPIv1.GetItemsRequest();
  getItemsRequest.PartnerTag = PA_API_CONFIG.partnerTag;
  getItemsRequest.PartnerType = 'Associates';
  getItemsRequest.ItemIds = [asin];

  // Request all image sizes and basic product info
  getItemsRequest.Resources = [
    'Images.Primary.Small',
    'Images.Primary.Medium',
    'Images.Primary.Large',
    'Images.Variants.Small',
    'Images.Variants.Medium',
    'Images.Variants.Large',
    'ItemInfo.Title',
  ];

  try {
    // Make API request
    const data = await api.getItems(getItemsRequest);
    const response = ProductAdvertisingAPIv1.GetItemsResponse.constructFromObject(data);

    // Check for errors
    if (response.Errors && response.Errors.length > 0) {
      const firstError = response.Errors[0];
      throw new Error(`PA API Error: ${firstError.Code} - ${firstError.Message}`);
    }

    // Extract item data
    if (!response.ItemsResult || !response.ItemsResult.Items || response.ItemsResult.Items.length === 0) {
      throw new Error(`No product found for ASIN: ${asin}`);
    }

    const item = response.ItemsResult.Items[0];

    // Build product data
    const productData: ProductData = {
      asin: item.ASIN,
      title: item.ItemInfo?.Title?.DisplayValue,
      images: extractImageData(item),
      detailPageUrl: item.DetailPageURL,
      fetchedAt: new Date().toISOString(),
    };

    return productData;
  } catch (error: any) {
    console.error('Error fetching product from PA API:', error);

    // Provide more helpful error messages
    if (error.status === 403) {
      throw new Error('PA API authentication failed. Check your credentials.');
    } else if (error.status === 429) {
      throw new Error('PA API rate limit exceeded. Please try again later.');
    } else if (error.message) {
      throw error;
    } else {
      throw new Error(`Failed to fetch product data for ASIN: ${asin}`);
    }
  }
}

/**
 * Fetches multiple products by ASINs (batch request)
 *
 * @param asins - Array of ASINs (up to 10 per request as per PA API limits)
 * @returns Map of ASIN to ProductData
 */
export async function getProductsByAsins(asins: string[]): Promise<Map<string, ProductData>> {
  validateCredentials();

  // Validate ASINs
  if (!asins || asins.length === 0) {
    throw new Error('At least one ASIN is required');
  }
  if (asins.length > 10) {
    throw new Error('Maximum 10 ASINs allowed per request');
  }

  // Validate each ASIN format
  for (const asin of asins) {
    if (!asin || asin.length !== 10) {
      throw new Error(`Invalid ASIN format: ${asin}. ASIN must be exactly 10 characters.`);
    }
  }

  // Dynamic import to avoid webpack bundling issues
  const ProductAdvertisingAPIv1 = await import('paapi5-nodejs-sdk');

  // Initialize API client
  const defaultClient = ProductAdvertisingAPIv1.ApiClient.instance;
  defaultClient.accessKey = PA_API_CONFIG.accessKey;
  defaultClient.secretKey = PA_API_CONFIG.secretKey;
  defaultClient.host = PA_API_CONFIG.host;
  defaultClient.region = PA_API_CONFIG.region;

  const api = new ProductAdvertisingAPIv1.DefaultApi();

  // Create GetItems request
  const getItemsRequest = new ProductAdvertisingAPIv1.GetItemsRequest();
  getItemsRequest.PartnerTag = PA_API_CONFIG.partnerTag;
  getItemsRequest.PartnerType = 'Associates';
  getItemsRequest.ItemIds = asins;

  // Request all image sizes and basic product info
  getItemsRequest.Resources = [
    'Images.Primary.Small',
    'Images.Primary.Medium',
    'Images.Primary.Large',
    'Images.Variants.Small',
    'Images.Variants.Medium',
    'Images.Variants.Large',
    'ItemInfo.Title',
  ];

  try {
    // Make API request
    const data = await api.getItems(getItemsRequest);
    const response = ProductAdvertisingAPIv1.GetItemsResponse.constructFromObject(data);

    // Check for errors (but continue processing valid items)
    if (response.Errors && response.Errors.length > 0) {
      console.warn('PA API returned errors for some items:', response.Errors);
    }

    // Extract items data
    const productsMap = new Map<string, ProductData>();

    if (response.ItemsResult?.Items) {
      for (const item of response.ItemsResult.Items) {
        const productData: ProductData = {
          asin: item.ASIN,
          title: item.ItemInfo?.Title?.DisplayValue,
          images: extractImageData(item),
          detailPageUrl: item.DetailPageURL,
          fetchedAt: new Date().toISOString(),
        };
        productsMap.set(item.ASIN, productData);
      }
    }

    return productsMap;
  } catch (error: any) {
    console.error('Error fetching products from PA API:', error);

    // Provide more helpful error messages
    if (error.status === 403) {
      throw new Error('PA API authentication failed. Check your credentials.');
    } else if (error.status === 429) {
      throw new Error('PA API rate limit exceeded. Please try again later.');
    } else if (error.message) {
      throw error;
    } else {
      throw new Error('Failed to fetch products from PA API');
    }
  }
}

/**
 * Determines if cached image data needs to be refreshed (> 24 hours old)
 *
 * @param fetchedAt - ISO 8601 timestamp string
 * @returns true if data is stale and needs refresh
 */
export function isImageDataStale(fetchedAt: string | null | undefined): boolean {
  if (!fetchedAt) return true;

  const fetchedTime = new Date(fetchedAt).getTime();
  const now = Date.now();
  const twentyFourHours = 24 * 60 * 60 * 1000;

  return (now - fetchedTime) > twentyFourHours;
}
