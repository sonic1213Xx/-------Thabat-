import { PrismaClient } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { getCached, invalidateCache, setCached } from '@/lib/redis'

const globalForPrisma = globalThis as typeof globalThis & { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

const scoreFields = ['taskPeriod1', 'taskPeriod2', 'examPeriod1', 'examPeriod2', 'finalExam'] as const

export async function GET(request: NextRequest) {
  const divisionId = request.nextUrl.searchParams.get('divisionId')
  const subject = request.nextUrl.searchParams.get('subject')
  const teacherId = request.nextUrl.searchParams.get('teacherId')
  if (!divisionId || !subject || !teacherId) return NextResponse.json({ error: 'divisionId, subject, and teacherId are required.' }, { status: 400 })
  const cacheKey = `thabat:gradebook:${divisionId}:${subject}:${teacherId}`
  const cached = await getCached<unknown[]>(cacheKey)
  if (cached) return NextResponse.json({ data: cached })
  const scores = await prisma.gradebookScore.findMany({ where: { divisionId, subject, teacherId } })
  const data = scores.map((score) => ({ ...score, customScores: JSON.parse(score.customScoresJson || '{}') }))
  await setCached(cacheKey, data, 15)
  return NextResponse.json({ data })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { studentId?: string; divisionId?: string; subject?: string; teacherId?: string; updatedBy?: string; field?: string; value?: number | null; customScores?: Record<string, number | null>; entries?: Array<{ studentId: string; fields?: Partial<Record<typeof scoreFields[number], number | null>>; customScores?: Record<string, number | null> }> }
    if (body.entries?.length && body.divisionId && body.subject && body.teacherId) {
      const operations = body.entries.map((entry) => prisma.gradebookScore.upsert({
        where: { studentId_divisionId_subject_teacherId: { studentId: entry.studentId, divisionId: body.divisionId!, subject: body.subject!, teacherId: body.teacherId! } },
        update: { ...entry.fields, updatedBy: body.updatedBy, ...(entry.customScores ? { customScoresJson: JSON.stringify(entry.customScores) } : {}) },
        create: { studentId: entry.studentId, divisionId: body.divisionId!, subject: body.subject!, teacherId: body.teacherId!, ...entry.fields, updatedBy: body.updatedBy || null, customScoresJson: JSON.stringify(entry.customScores ?? {}) },
      }))
      const scores = await prisma.$transaction(operations)
      await invalidateCache(`thabat:gradebook:${body.divisionId}:${body.subject}:${body.teacherId}`)
      return NextResponse.json({ data: scores, count: scores.length })
    }
    if (!body.studentId || !body.divisionId || !body.subject || !body.teacherId || (!body.field && !body.customScores)) return NextResponse.json({ error: 'studentId, divisionId, subject, teacherId, field or customScores are required.' }, { status: 400 })
    const field = body.field && scoreFields.includes(body.field as typeof scoreFields[number]) ? body.field as typeof scoreFields[number] : null
    const score = await prisma.gradebookScore.upsert({ where: { studentId_divisionId_subject_teacherId: { studentId: body.studentId, divisionId: body.divisionId, subject: body.subject, teacherId: body.teacherId } }, update: { ...(field ? { [field]: body.value } : {}), updatedBy: body.updatedBy, ...(body.customScores ? { customScoresJson: JSON.stringify(body.customScores) } : {}) }, create: { studentId: body.studentId, divisionId: body.divisionId, subject: body.subject, teacherId: body.teacherId, ...(field ? { [field]: body.value } : {}), updatedBy: body.updatedBy || null, customScoresJson: JSON.stringify(body.customScores ?? {}) } })
    await invalidateCache(`thabat:gradebook:${body.divisionId}:${body.subject}:${body.teacherId}`)
    return NextResponse.json({ data: score })
  } catch (error) {
    console.error('Gradebook score save failed:', error)
    return NextResponse.json({ error: 'Unable to save gradebook score.' }, { status: 500 })
  }
}
