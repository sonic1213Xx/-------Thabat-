import bcrypt from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRoleDefinition } from '@/types/roles'
import { authorizeDivisions } from '@/lib/division-auth'

type UserBody = { id?: string; name?: string; password?: string; role?: string; locale?: 'ar' | 'en'; divisions?: string[]; subjectsTaught?: string[]; teachingAssignments?: unknown[] }

export const dynamic = 'force-dynamic'
export const revalidate = 0

function responseUser(user: { id: string; name: string; role: string; locale: string; assignedDivisions: string; subjectsTaught: string; teachingAssignments: string }) {
  return { id: user.id, name: user.name, role: user.role, locale: user.locale === 'en' ? 'en' : 'ar', assigned_divisions: JSON.parse(user.assignedDivisions || '[]'), subjectsTaught: JSON.parse(user.subjectsTaught || '[]'), teachingAssignments: JSON.parse(user.teachingAssignments || '[]') }
}

export async function GET(request: NextRequest) {
  try {
    const authorization = await authorizeDivisions(request)
    if (authorization.status !== 200) {
      return NextResponse.json({ error: authorization.error }, { status: authorization.status })
    }

    const users = await prisma.user.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, role: true, locale: true, assignedDivisions: true, subjectsTaught: true, teachingAssignments: true },
    })
    return NextResponse.json({ data: users.map(responseUser) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('User list failed:', error)
    return NextResponse.json({ error: 'Unable to load profiles.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authorization = await authorizeDivisions(request, true)
    if (authorization.status !== 200) {
      return NextResponse.json({ error: authorization.error }, { status: authorization.status })
    }

    const body = await request.json() as UserBody
    const id = body.id?.trim()
    const name = body.name?.trim()
    const role = body.role?.trim()
    if (!id || !name || !role || !body.password || !getRoleDefinition(role)) return NextResponse.json({ error: 'Invalid profile.' }, { status: 400 })
    const user = await prisma.user.create({ data: { id, username: id.toLowerCase(), name, role, password: await bcrypt.hash(body.password, 12), locale: body.locale === 'en' ? 'en' : 'ar', assignedDivisions: JSON.stringify(body.divisions ?? []), subjectsTaught: JSON.stringify(body.subjectsTaught ?? []), teachingAssignments: JSON.stringify(body.teachingAssignments ?? []) } })
    return NextResponse.json({ data: responseUser(user) }, { status: 201 })
  } catch (error) {
    console.error('User creation failed:', error)
    const duplicate = error instanceof Error && error.message.includes('Unique constraint')
    return NextResponse.json({ error: duplicate ? 'This ID is already in use.' : 'Unable to create profile.' }, { status: duplicate ? 409 : 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authorization = await authorizeDivisions(request, true)
    if (authorization.status !== 200) {
      return NextResponse.json({ error: authorization.error }, { status: authorization.status })
    }

    const body = await request.json() as UserBody
    const id = body.id?.trim()
    if (!id || !body.name?.trim() || !body.role || !getRoleDefinition(body.role)) return NextResponse.json({ error: 'Invalid profile.' }, { status: 400 })
    const existing = await prisma.user.findUnique({ where: { id }, select: { assignedDivisions: true, subjectsTaught: true, teachingAssignments: true } })
    if (!existing) return NextResponse.json({ error: 'Profile not found.' }, { status: 404 })
    const user = await prisma.user.update({ where: { id }, data: { name: body.name.trim(), role: body.role, ...(body.locale ? { locale: body.locale } : {}), ...(body.password ? { password: await bcrypt.hash(body.password, 12) } : {}), ...(body.divisions !== undefined ? { assignedDivisions: JSON.stringify(body.divisions) } : {}), ...(body.subjectsTaught !== undefined ? { subjectsTaught: JSON.stringify(body.subjectsTaught) } : {}), ...(body.teachingAssignments !== undefined ? { teachingAssignments: JSON.stringify(body.teachingAssignments) } : {}) } })
    return NextResponse.json({ data: responseUser(user) })
  } catch (error) {
    console.error('User update failed:', error)
    return NextResponse.json({ error: 'Unable to update profile.' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authorization = await authorizeDivisions(request, true)
    if (authorization.status !== 200) {
      return NextResponse.json({ error: authorization.error }, { status: authorization.status })
    }

    const body = await request.json() as { id?: string }
    if (!body.id) return NextResponse.json({ error: 'Profile id is required.' }, { status: 400 })
    const target = await prisma.user.findUnique({ where: { id: body.id }, select: { id: true, role: true, isActive: true } })
    if (!target || !target.isActive) return NextResponse.json({ error: 'Profile not found.' }, { status: 404 })
    if (target.role === 'PRINCIPAL' || target.role === 'CREATOR') return NextResponse.json({ error: 'This profile cannot be deleted.' }, { status: 403 })
    await prisma.user.update({ where: { id: body.id }, data: { isActive: false } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('User deletion failed:', error)
    return NextResponse.json({ error: 'Unable to delete profile.' }, { status: 500 })
  }
}