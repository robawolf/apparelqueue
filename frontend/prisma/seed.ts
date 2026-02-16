import {PrismaClient} from '@prisma/client'
import type {SeedData} from './seeds/types'

const prisma = new PrismaClient()

async function main() {
  const brandSeed = process.env.BRAND_SEED || 'chismewear'
  console.log(`Seeding database with brand: ${brandSeed}`)

  // Dynamically import the brand seed data
  const {data}: {data: SeedData} = await import(`./seeds/${brandSeed}`)

  // Upsert BrandConfig singleton
  await prisma.brandConfig.upsert({
    where: {id: 'default'},
    update: {
      name: data.brandConfig.name,
      verbiageTheme: data.brandConfig.verbiageTheme,
      verbiagePromptContext: data.brandConfig.verbiagePromptContext,
      toneGuidelines: data.brandConfig.toneGuidelines,
      graphicThemes: JSON.stringify(data.brandConfig.graphicThemes),
      canvaTemplateIds: data.brandConfig.canvaTemplateIds
        ? JSON.stringify(data.brandConfig.canvaTemplateIds)
        : null,
      defaultApparelTypes: JSON.stringify(data.brandConfig.defaultApparelTypes),
      defaultMarkupPercent: data.brandConfig.defaultMarkupPercent,
      aiModelPreference: data.brandConfig.aiModelPreference || null,
      ideaBatchSize: data.brandConfig.ideaBatchSize,
    },
    create: {
      id: 'default',
      name: data.brandConfig.name,
      verbiageTheme: data.brandConfig.verbiageTheme,
      verbiagePromptContext: data.brandConfig.verbiagePromptContext,
      toneGuidelines: data.brandConfig.toneGuidelines,
      graphicThemes: JSON.stringify(data.brandConfig.graphicThemes),
      canvaTemplateIds: data.brandConfig.canvaTemplateIds
        ? JSON.stringify(data.brandConfig.canvaTemplateIds)
        : null,
      defaultApparelTypes: JSON.stringify(data.brandConfig.defaultApparelTypes),
      defaultMarkupPercent: data.brandConfig.defaultMarkupPercent,
      aiModelPreference: data.brandConfig.aiModelPreference || null,
      ideaBatchSize: data.brandConfig.ideaBatchSize,
    },
  })
  console.log('BrandConfig upserted')

  // Upsert categories by slug
  for (const cat of data.categories) {
    await prisma.category.upsert({
      where: {slug: cat.slug},
      update: {
        name: cat.name,
        description: cat.description || null,
        promptContext: cat.promptContext,
        targetCount: cat.targetCount ?? 10,
      },
      create: {
        name: cat.name,
        slug: cat.slug,
        description: cat.description || null,
        promptContext: cat.promptContext,
        targetCount: cat.targetCount ?? 10,
      },
    })
  }
  console.log(`${data.categories.length} categories upserted`)

  // Upsert buckets by stage+name
  for (let i = 0; i < data.buckets.length; i++) {
    const bucket = data.buckets[i]
    const existing = await prisma.bucket.findFirst({
      where: {stage: bucket.stage, name: bucket.name},
    })

    if (existing) {
      await prisma.bucket.update({
        where: {id: existing.id},
        data: {prompt: bucket.prompt, sortOrder: i},
      })
    } else {
      await prisma.bucket.create({
        data: {
          stage: bucket.stage,
          name: bucket.name,
          prompt: bucket.prompt,
          sortOrder: i,
        },
      })
    }
  }
  console.log(`${data.buckets.length} buckets upserted`)

  // Create default admin user if env vars are set
  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD

  if (adminEmail && adminPassword) {
    const existingUser = await prisma.user.findUnique({
      where: {email: adminEmail},
    })

    if (!existingUser) {
      // Use BetterAuth's password hashing (bcrypt-compatible via better-auth)
      const {hash} = await import('better-auth/crypto')
      const hashedPassword = await hash(adminPassword)
      const userId = crypto.randomUUID()

      await prisma.user.create({
        data: {
          id: userId,
          name: 'Admin',
          email: adminEmail,
          emailVerified: true,
        },
      })

      await prisma.account.create({
        data: {
          id: crypto.randomUUID(),
          accountId: userId,
          providerId: 'credential',
          userId: userId,
          password: hashedPassword,
        },
      })

      console.log(`Admin user created: ${adminEmail}`)
    } else {
      console.log(`Admin user already exists: ${adminEmail}`)
    }
  } else {
    console.log('ADMIN_EMAIL/ADMIN_PASSWORD not set, skipping admin user creation')
  }

  console.log('Seed complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
