export interface SeedData {
  brandConfig: {
    name: string
    verbiageTheme: string
    verbiagePromptContext: string
    toneGuidelines: string
    graphicThemes: string[]
    defaultApparelTypes: string[]
    defaultMarkupPercent: number
    canvaTemplateIds?: Record<string, string>
    aiModelPreference?: string
    ideaBatchSize: number
  }
  categories: Array<{
    name: string
    slug: string
    description?: string
    promptContext: string
    targetCount?: number
  }>
  buckets: Array<{
    stage: string
    name: string
    prompt: string
  }>
}
