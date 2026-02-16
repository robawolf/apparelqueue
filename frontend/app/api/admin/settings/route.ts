import {NextRequest, NextResponse} from 'next/server'
import {prisma} from '@/lib/db'

export async function GET() {
  const config = await prisma.brandConfig.findUnique({
    where: {id: 'default'},
  })

  if (!config) {
    return NextResponse.json(
      {error: 'Brand config not found. Run database seed first.'},
      {status: 404},
    )
  }

  return NextResponse.json(config)
}

export async function PATCH(request: NextRequest) {
  const body = await request.json()

  const config = await prisma.brandConfig.update({
    where: {id: 'default'},
    data: body,
  })

  return NextResponse.json(config)
}
