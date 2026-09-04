import bcrypt from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { id?: string; password?: string }
    const identifier = body.id?.trim()
    if (!identifier || !body.password) return NextResponse.json({ error: 'ID and password are required.' }, { status: 400 })

    const user = await prisma.user.findFirst({
      where: { OR: [{ id: identifier }, { username: identifier.toLowerCase() }] },
      select: { id: true, role: true, password: true, isActive: true },
    })
    const validPassword = user?.isActive ? await bcrypt.compare(body.password, user.password) : false
    if (!user || user.id !== '10' || !['CREATOR', 'CURATOR'].includes(user.role) || !validPassword) {
      return NextResponse.json({ error: 'كلمة المرور غير صحيحة' }, { status: 401 })
    }

    await prisma.$transaction([
      prisma.auditLog.deleteMany(),
      prisma.loginHistory.deleteMany(),
      prisma.excelImportLog.deleteMany(),
      prisma.transferNotification.deleteMany(),
      prisma.gatePass.deleteMany(),
      prisma.classAttendance.deleteMany(),
      prisma.gradebookModificationLog.deleteMany(),
      prisma.gradebookScore.deleteMany(),
      prisma.attendanceLog.deleteMany(),
      prisma.attendance.deleteMany(),
      prisma.warning.deleteMany(),
      prisma.transferHistory.deleteMany(),
      prisma.student.deleteMany(),
      prisma.division.deleteMany(),
      prisma.team.deleteMany(),
      prisma.user.deleteMany(),
    ])

    return NextResponse.json({ success: true, message: 'تم حذف جميع البيانات بنجاح.' })
  } catch (error) {
    console.error('Admin reset data failed:', error)
    return NextResponse.json({ error: 'تعذر حذف جميع البيانات.' }, { status: 500 })
  }
}
