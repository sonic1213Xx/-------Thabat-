import bcrypt from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { id?: string; password?: string }
    const username = body.id?.trim()
    if (!username || !body.password) return NextResponse.json({ error: 'Credentials are required' }, { status: 400 })

    const user = await prisma.user.findFirst({ where: { OR: [{ id: username }, { username: username.toLowerCase() }] } })
    if (!user || !user.isActive || !(await bcrypt.compare(body.password, user.password))) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }
    const response = NextResponse.json({ data: { id: user.id, name: user.name, role: user.role, locale: user.locale === 'en' ? 'en' : 'ar', assigned_divisions: JSON.parse(user.assignedDivisions || '[]'), subjectsTaught: JSON.parse(user.subjectsTaught || '[]'), teachingAssignments: JSON.parse(user.teachingAssignments || '[]') } })
    response.cookies.set('NEXT_LOCALE', user.locale === 'en' ? 'en' : 'ar', { maxAge: 31536000, path: '/', sameSite: 'lax' })
    response.cookies.set('THABAT_USER_ID', user.id, { maxAge: 31536000, path: '/', sameSite: 'lax' })
    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Unable to sign in' }, { status: 500 })
  }
}