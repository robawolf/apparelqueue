import {NextRequest, NextResponse} from 'next/server'
import {prisma} from '@/lib/db'

export async function PATCH(
  request: NextRequest,
  {params}: {params: Promise<{id: string}>},
) {
  const {id} = await params
  const body = await request.json()

  const idea = await prisma.idea.update({
    where: {id},
    data: body,
  })

  return NextResponse.json(idea)
}
