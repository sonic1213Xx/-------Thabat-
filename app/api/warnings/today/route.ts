import { NextRequest, NextResponse } from 'next/server'
import { getDateOnly } from '@/lib/utils'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const dateOnly = new URL(request.url).searchParams.get('date') ?? getDateOnly(new Date())
    const warnings = await prisma.warning.findMany({ where: { issuedDateOnly: dateOnly }, include: { student: true }, orderBy: { issuedAt: 'desc' } })
    return NextResponse.json({ data: warnings, count: warnings.length, dateOnly })
  } catch {
    return NextResponse.json({ error: 'Unable to fetch today warnings.' }, { status: 500 })
  }
}
