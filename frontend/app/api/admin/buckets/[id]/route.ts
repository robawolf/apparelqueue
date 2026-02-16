import {NextRequest, NextResponse} from 'next/server'
import {prisma} from '@/lib/db'

export async function PATCH(
  request: NextRequest,
  {params}: {params: Promise<{id: string}>},
) {
  const {id} = await params
  const body = await request.json()

  const bucket = await prisma.bucket.update({
    where: {id},
    data: body,
  })

  return NextResponse.json(bucket)
}

export async function DELETE(
  _request: NextRequest,
  {params}: {params: Promise<{id: string}>},
) {
  const {id} = await params

  await prisma.bucket.delete({where: {id}})

  return NextResponse.json({deleted: true})
}
