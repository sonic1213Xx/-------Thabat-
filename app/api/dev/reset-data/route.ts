import { PrismaClient } from '@prisma/client'
import { NextResponse } from 'next/server'

const prisma = new PrismaClient()

export async function POST() {
  try {
    // Delete all data in order (respecting foreign key constraints)
    await prisma.auditLog.deleteMany({})
    await prisma.attendance.deleteMany({})
    await prisma.warning.deleteMany({})
    await prisma.transferHistory.deleteMany({})
    await prisma.student.deleteMany({})
    await prisma.division.deleteMany({})
    await prisma.team.deleteMany({})
    await prisma.user.deleteMany({})

    return NextResponse.json({
      success: true,
      message: 'تم إعادة ضبط جميع البيانات بنجاح.',
    })
  } catch (error) {
    console.error('Reset data failed:', error)
    return NextResponse.json(
      { error: 'تعذر إعادة ضبط البيانات.' },
      { status: 500 }
    )
  }
}
