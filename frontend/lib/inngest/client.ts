import {EventSchemas, Inngest} from 'inngest'
import type {Events} from './events'

export const inngest = new Inngest({
  id: 'product-idea-queue',
  schemas: new EventSchemas().fromRecord<Events>(),
})
