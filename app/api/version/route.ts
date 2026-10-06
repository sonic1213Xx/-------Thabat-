import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const version = process.env.NEXT_PUBLIC_BUILD_VERSION || process.env.VERCEL_GIT_COMMIT_SHA || 'development'
  return NextResponse.json({ version }, { headers: { 'Cache-Control': 'no-store, max-age=0' } })
}