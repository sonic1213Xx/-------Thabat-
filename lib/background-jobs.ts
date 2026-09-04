import { Client } from '@upstash/qstash'

const qstash = process.env.QSTASH_TOKEN ? new Client({ token: process.env.QSTASH_TOKEN }) : null

export async function enqueueBackgroundJob<T>(url: string, body: T): Promise<{ queued: boolean; messageId?: string }> {
  if (!qstash) return { queued: false }
  const result = await qstash.publishJSON({ url, body, retries: 3 })
  return { queued: true, messageId: result.messageId }
}
