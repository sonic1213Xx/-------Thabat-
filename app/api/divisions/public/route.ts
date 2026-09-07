import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const divisions = await prisma.division.findMany({
      orderBy: { code: 'asc' },
      select: { id: true, code: true, name: true },
    })
    return NextResponse.json({ data: divisions }, { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' } })
  } catch {
    return NextResponse.json({ error: 'Unable to fetch divisions.' }, { status: 500 })
  }
}
