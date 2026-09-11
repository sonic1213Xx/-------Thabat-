import { NextRequest, NextResponse } from 'next/server'
import { getDateOnly } from '@/lib/utils'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const requestUserId = request.cookies.get('THABAT_USER_ID')?.value || request.headers.get('x-thabat-user-id')
    if (!requestUserId) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })
    const user = await prisma.user.findUnique({ where: { id: requestUserId }, select: { id: true, isActive: true } })
    if (!user || !user.isActive) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })

    const dateOnly = new URL(request.url).searchParams.get('date') ?? getDateOnly(new Date())
    const warnings = await prisma.warning.findMany({ where: { issuedDateOnly: dateOnly }, include: { student: true }, orderBy: { issuedAt: 'desc' } })
    return NextResponse.json({ data: warnings, count: warnings.length, dateOnly })
  } catch {
    return NextResponse.json({ error: 'Unable to fetch today warnings.' }, { status: 500 })
  }
}
