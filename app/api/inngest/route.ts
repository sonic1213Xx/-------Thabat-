import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest/client'

const isLocalDevelopment = process.env.NODE_ENV === 'development' || process.env.INNGEST_DEV === '1'

export const { GET, POST, PUT } = serve({
	client: inngest,
	functions: [],
	...(isLocalDevelopment ? { skipSignatureValidation: true } : {}),
})