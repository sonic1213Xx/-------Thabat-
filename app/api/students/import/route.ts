import { NextRequest, NextResponse } from 'next/server'
import { formatRelativeTimeArabic, getDateOnly, getTimeOnly } from '@/lib/utils'
import { prisma } from '@/lib/prisma'

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
      ? await prisma.user.findUnique({ where: { id: body.createdByUserId }, select: { id: true, name: true, role: true } })
      : null
    const fallbackActor = actor ?? await prisma.user.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'asc' }, select: { id: true, name: true, role: true } }) ?? await prisma.user.create({ data: { username: 'system', name: 'نظام ثَبَت', password: 'system-managed', role: 'PRINCIPAL', isActive: true }, select: { id: true, name: true, role: true } })

    const now = new Date()
    const validRows = rows.filter((row) => (typeof row.name === 'string' && row.name.trim()) || (typeof row.academicId === 'string' && row.academicId.trim()))
    const divisionCodes = Array.from(new Set([
      ...(body.divisions ?? []),
      ...validRows.map((row) => row.divisionId?.trim() || row.divisionCode?.trim() || row.level?.trim() || ''),
    ].filter(Boolean)))
    const existingDivisions = await prisma.division.findMany({ where: { code: { in: divisionCodes } } })
    const existingDivisionCodes = new Set(existingDivisions.map((division) => division.code))
    const missingDivisionCodes = divisionCodes.filter((code) => !existingDivisionCodes.has(code))
    if (missingDivisionCodes.length) {
      await prisma.division.createMany({ data: missingDivisionCodes.map((code) => ({ code, name: code })), skipDuplicates: true })
    }
    const divisions = await prisma.division.findMany({ where: { code: { in: divisionCodes } } })
    const divisionMap = new Map(divisions.map((division) => [division.code, division]))
    const divisionIds = new Set(divisions.map((division) => division.id))

    const nationalIds = validRows.map((row) => row.nationalId?.trim()).filter((value): value is string => Boolean(value))
    const academicIds = validRows.map((row) => row.academicId?.trim()).filter((value): value is string => Boolean(value))
    const existingStudents = await prisma.student.findMany({
      where: { OR: [{ nationalId: { in: nationalIds } }, { academicId: { in: academicIds } }] },
      select: { nationalId: true, academicId: true },
    })
    const existingNationalIds = new Set(existingStudents.map((student) => student.nationalId).filter(Boolean))
    const existingAcademicIds = new Set(existingStudents.map((student) => student.academicId).filter(Boolean))
    const studentRecords = validRows
      .filter((row) => !existingNationalIds.has(row.nationalId?.trim() || '') && !existingAcademicIds.has(row.academicId?.trim() || ''))
      .map((row) => {
        const divisionCode = row.divisionId?.trim() || row.divisionCode?.trim() || row.level?.trim() || null
        const division = divisionCode ? divisionMap.get(divisionCode) : null
        return {
          fullName: row.name?.trim() || row.academicId!.trim(),
          arabicName: row.name?.trim() || null,
          academicId: row.academicId?.trim() || null,
          gpa: row.gpa === null || row.gpa === undefined || row.gpa === '' ? null : Number(row.gpa),
          parentPhone: row.parentPhone?.trim() || null,
          nationalId: row.nationalId?.trim() || null,
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
        }
      })
    const createdStudents: Array<{ id: string; fullName: string; academicId: string | null; gpa: number | null; parentPhone: string | null; nationalId: string | null; divisionCode: string | null; divisionId: string | null; level: string | null }> = []
    for (let index = 0; index < studentRecords.length; index += 50) {
      const batch = await prisma.student.createManyAndReturn({ data: studentRecords.slice(index, index + 50), skipDuplicates: true })
      createdStudents.push(...batch)
    }
    const imported = createdStudents.length
    const skipped = validRows.length - imported
    await prisma.auditLog.create({
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
    const result = { imported, skipped, divisionCount: divisionIds.size, students: createdStudents }

    return NextResponse.json({ data: result })
  } catch (error) {
    console.error('Student import failed:', error)
    return NextResponse.json({ error: 'تعذر حفظ بيانات الاستيراد.' }, { status: 500 })
  }
}
