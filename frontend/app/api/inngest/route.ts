import {serve} from 'inngest/next'
import {inngest} from '@/lib/inngest/client'
import {functions} from '@/lib/inngest/functions'

// Inngest webhook endpoint
// This receives events from Inngest Cloud and executes the functions
export const {GET, POST, PUT} = serve({
  client: inngest,
  functions,
})
