import { PrismaClient } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { formatRelativeTimeArabic, getDateOnly, getTimeOnly } from '@/lib/utils'

const globalForPrisma = globalThis as typeof globalThis & { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

type ImportRow = {
  name?: string
  academicId?: string
  gpa?: number | string | null
  parentPhone?: string
  nationalId?: string
  divisionId?: string
  divisionCode?: string
  gradeLevel?: number | null
  level?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { rows?: ImportRow[]; divisions?: string[]; createdByUserId?: string }
    const rows = Array.isArray(body.rows) ? body.rows : []
    if (!rows.length) return NextResponse.json({ error: 'لا توجد صفوف صالحة للاستيراد.' }, { status: 400 })

    const actor = body.createdByUserId
      ? await prisma.user.findUnique({ where: { id: body.createdByUserId } })
      : null
    const fallbackActor = actor ?? await prisma.user.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'asc' } }) ?? await prisma.user.create({ data: { username: 'system', name: 'نظام ثَبَت', password: 'system-managed', role: 'PRINCIPAL', isActive: true } })

    const now = new Date()
    const validRows = rows.filter((row) => (typeof row.name === 'string' && row.name.trim()) || (typeof row.academicId === 'string' && row.academicId.trim()))
    const result = await prisma.$transaction(async (tx) => {
      let imported = 0
      let skipped = 0
      const createdStudents: Array<{ id: string; fullName: string; academicId: string | null; gpa: number | null; parentPhone: string | null; nationalId: string | null; divisionCode: string | null; divisionId: string | null; level: string | null }> = []
      const divisionIds = new Set<string>()
      for (const code of body.divisions ?? []) {
        const division = await tx.division.upsert({ where: { code: code.trim() }, update: {}, create: { code: code.trim(), name: code.trim() } })
        divisionIds.add(division.id)
      }
      for (const row of validRows) {
        const nationalId = row.nationalId?.trim() || null
        const academicId = row.academicId?.trim() || null
        if ((nationalId && await tx.student.findUnique({ where: { nationalId } })) || (academicId && await tx.student.findUnique({ where: { academicId } }))) {
          skipped += 1
          continue
        }
        const divisionCode = row.divisionId?.trim() || row.divisionCode?.trim() || row.level?.trim() || null
        const division = divisionCode
          ? await tx.division.upsert({ where: { code: divisionCode }, update: {}, create: { code: divisionCode, name: divisionCode } })
          : null
        if (division) divisionIds.add(division.id)
        const created = await tx.student.create({
          data: {
            fullName: row.name?.trim() || row.academicId!.trim(),
            arabicName: row.name?.trim() || null,
            academicId,
            gpa: row.gpa === null || row.gpa === undefined || row.gpa === '' ? null : Number(row.gpa),
            parentPhone: row.parentPhone?.trim() || null,
            nationalId,
            divisionId: division?.id ?? null,
            divisionCode,
            gradeLevel: row.gradeLevel ?? null,
            level: row.level?.trim() || null,
            behaviorScore: 100,
            attendanceScore: 100,
            createdDateOnly: getDateOnly(now),
            createdTimeOnly: getTimeOnly(now),
            lastUpdatedBy: fallbackActor.id,
            lastUpdatedByName: fallbackActor.name,
            lastUpdatedByRole: fallbackActor.role,
          },
        })
        imported += 1
        createdStudents.push({ id: created.id, fullName: created.fullName, academicId: created.academicId, gpa: created.gpa, parentPhone: created.parentPhone, nationalId: created.nationalId, divisionCode: created.divisionCode, divisionId: created.divisionId, level: created.level })
      }
      await tx.auditLog.create({
        data: {
          userId: fallbackActor.id,
          userName: fallbackActor.name,
          userRole: fallbackActor.role,
          action: 'BULK_IMPORT',
          targetType: 'Student',
          targetName: `${imported} طالب`,
          details: JSON.stringify({ imported, skipped }),
          dateOnly: getDateOnly(now),
          timeOnly: getTimeOnly(now),
          relativeTime: formatRelativeTimeArabic(now),
        },
      })
      return { imported, skipped, divisionCount: divisionIds.size, students: createdStudents }
    })

    return NextResponse.json({ data: result })
  } catch (error) {
    console.error('Student import failed:', error)
    return NextResponse.json({ error: 'تعذر حفظ بيانات الاستيراد.' }, { status: 500 })
  }
}
