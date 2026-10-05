import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'
import { getAuthenticatedUserId } from '@/lib/server-session'

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  try {
    const userId = await getAuthenticatedUserId(request)
    const user = userId ? await prisma.user.findUnique({ where: { id: userId }, select: { role: true } }) : null
    if (user?.role !== 'CREATOR') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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
