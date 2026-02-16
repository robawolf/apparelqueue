import {NextRequest, NextResponse} from 'next/server'
import {prisma} from '@/lib/db'

export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: {name: 'asc'},
    include: {
      _count: {select: {ideas: true}},
    },
  })

  return NextResponse.json(categories)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const {name, slug, description, promptContext, targetCount, isActive} =
    body as {
      name: string
      slug: string
      description?: string
      promptContext?: string
      targetCount?: number
      isActive?: boolean
    }

  if (!name || !slug) {
    return NextResponse.json(
      {error: 'name and slug are required'},
      {status: 400},
    )
  }

  const category = await prisma.category.create({
    data: {
      name,
      slug,
      description: description ?? '',
      promptContext: promptContext ?? '',
      targetCount: targetCount ?? 10,
      isActive: isActive ?? true,
    },
  })

  return NextResponse.json(category, {status: 201})
}
