import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try { return NextResponse.json({ data: await prisma.team.findMany({ orderBy: { label: 'asc' } }) }) }
  catch { return NextResponse.json({ error: 'Unable to fetch teams.' }, { status: 500 }) }
}

export async function POST(request: NextRequest) {
  try { const body = await request.json() as { label?: string }; if (!body.label?.trim()) return NextResponse.json({ error: 'Team name is required.' }, { status: 400 }); return NextResponse.json({ data: await prisma.team.create({ data: { label: body.label.trim() } }) }) }
  catch { return NextResponse.json({ error: 'Unable to create team.' }, { status: 500 }) }
}
