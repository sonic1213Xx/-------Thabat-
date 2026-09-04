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
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Creator verification failed:', error)
    return NextResponse.json({ error: 'Unable to verify creator credentials.' }, { status: 500 })
  }
}