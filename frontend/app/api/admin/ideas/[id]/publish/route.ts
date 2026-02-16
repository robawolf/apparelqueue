import {NextRequest, NextResponse} from 'next/server'
import {prisma} from '@/lib/db'
import {inngest} from '@/lib/inngest/client'

export async function POST(
  _request: NextRequest,
  {params}: {params: Promise<{id: string}>},
) {
  const {id} = await params

  const idea = await prisma.idea.findUniqueOrThrow({where: {id}})

  if (idea.stage !== 'publish') {
    return NextResponse.json({error: 'Idea must be at publish stage'}, {status: 400})
  }

  // Validate required fields
  const missing: string[] = []
  if (!idea.printfulCatalogId) missing.push('printfulCatalogId')
  if (!idea.variants) missing.push('variants')
  if (!idea.productTitle) missing.push('productTitle')
  if (!idea.designFileUrl && !idea.canvaDesignId) missing.push('designFileUrl or canvaDesignId')

  if (missing.length > 0) {
    return NextResponse.json(
      {error: `Missing required fields: ${missing.join(', ')}`},
      {status: 400},
    )
  }

  await prisma.idea.update({
    where: {id},
    data: {status: 'processing'},
  })

  await inngest.send({
    name: 'job/create-printful-product',
    data: {ideaId: id},
  })

  return NextResponse.json({publishing: true})
}
