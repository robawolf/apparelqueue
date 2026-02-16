import {NextRequest, NextResponse} from 'next/server'
import {prisma} from '@/lib/db'

export async function POST(
  _request: NextRequest,
  {params}: {params: Promise<{id: string}>},
) {
  const {id} = await params

  await prisma.idea.update({
    where: {id},
    data: {status: 'rejected'},
  })

  return NextResponse.json({rejected: true})
}
