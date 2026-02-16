import {NextRequest, NextResponse} from 'next/server'
import {prisma} from '@/lib/db'

export async function PATCH(
  request: NextRequest,
  {params}: {params: Promise<{id: string}>},
) {
  const {id} = await params
  const body = await request.json()

  const category = await prisma.category.update({
    where: {id},
    data: body,
  })

  return NextResponse.json(category)
}

export async function DELETE(
  _request: NextRequest,
  {params}: {params: Promise<{id: string}>},
) {
  const {id} = await params

  const ideaCount = await prisma.idea.count({where: {categoryId: id}})
  if (ideaCount > 0) {
    return NextResponse.json(
      {error: `Cannot delete category with ${ideaCount} ideas. Reassign or delete them first.`},
      {status: 400},
    )
  }

  await prisma.category.delete({where: {id}})

  return NextResponse.json({deleted: true})
}
