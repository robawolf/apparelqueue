import {Inngest} from 'inngest'
import type {Events} from './events'

export const inngest = new Inngest({
  id: 'product-idea-queue',
  schemas: new Map() as unknown as Events,
})
