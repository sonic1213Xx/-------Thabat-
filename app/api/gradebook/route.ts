import { PrismaClient } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

const globalForPrisma = globalThis as typeof globalThis & { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

const scoreFields = ['taskPeriod1', 'taskPeriod2', 'examPeriod1', 'examPeriod2', 'finalExam'] as const

export async function GET(request: NextRequest) {
  const divisionId = request.nextUrl.searchParams.get('divisionId')
  const subject = request.nextUrl.searchParams.get('subject')
  const teacherId = request.nextUrl.searchParams.get('teacherId')
  if (!divisionId || !subject || !teacherId) return NextResponse.json({ error: 'divisionId, subject, and teacherId are required.' }, { status: 400 })
  const scores = await prisma.gradebookScore.findMany({ where: { divisionId, subject, teacherId } })
  return NextResponse.json({ data: scores.map((score) => ({ ...score, customScores: JSON.parse(score.customScoresJson || '{}') })) })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { studentId?: string; divisionId?: string; subject?: string; teacherId?: string; updatedBy?: string; field?: string; value?: number | null; customScores?: Record<string, number | null> }
    if (!body.studentId || !body.divisionId || !body.subject || !body.teacherId || (!body.field && !body.customScores)) return NextResponse.json({ error: 'studentId, divisionId, subject, teacherId, field or customScores are required.' }, { status: 400 })
    const field = body.field && scoreFields.includes(body.field as typeof scoreFields[number]) ? body.field as typeof scoreFields[number] : null
    const score = await prisma.gradebookScore.upsert({ where: { studentId_divisionId_subject_teacherId: { studentId: body.studentId, divisionId: body.divisionId, subject: body.subject, teacherId: body.teacherId } }, update: { ...(field ? { [field]: body.value } : {}), updatedBy: body.updatedBy, ...(body.customScores ? { customScoresJson: JSON.stringify(body.customScores) } : {}) }, create: { studentId: body.studentId, divisionId: body.divisionId, subject: body.subject, teacherId: body.teacherId, ...(field ? { [field]: body.value } : {}), updatedBy: body.updatedBy || null, customScoresJson: JSON.stringify(body.customScores ?? {}) } })
    return NextResponse.json({ data: score })
  } catch (error) {
    console.error('Gradebook score save failed:', error)
    return NextResponse.json({ error: 'Unable to save gradebook score.' }, { status: 500 })
  }
}
