import bcrypt from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getRoleDefinition } from '@/types/roles'

type UserBody = { id?: string; name?: string; password?: string; role?: string; divisions?: string[]; subjectsTaught?: string[] }

function responseUser(user: { id: string; name: string; role: string; assignedDivisions: string; subjectsTaught: string }) {
  return { id: user.id, name: user.name, role: user.role, assigned_divisions: JSON.parse(user.assignedDivisions || '[]'), subjectsTaught: JSON.parse(user.subjectsTaught || '[]') }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as UserBody
    const id = body.id?.trim()
    const name = body.name?.trim()
    const role = body.role?.trim()
    if (!id || !name || !role || !body.password || !getRoleDefinition(role)) return NextResponse.json({ error: 'Invalid profile.' }, { status: 400 })
    const user = await prisma.user.create({ data: { id, username: id.toLowerCase(), name, role, password: await bcrypt.hash(body.password, 12), assignedDivisions: JSON.stringify(body.divisions ?? []), subjectsTaught: JSON.stringify(body.subjectsTaught ?? []) } })
    return NextResponse.json({ data: responseUser(user) }, { status: 201 })
  } catch (error) {
    console.error('User creation failed:', error)
    return NextResponse.json({ error: 'Unable to create profile.' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json() as UserBody
    const id = body.id?.trim()
    if (!id || !body.name?.trim() || !body.role || !getRoleDefinition(body.role)) return NextResponse.json({ error: 'Invalid profile.' }, { status: 400 })
    const user = await prisma.user.update({ where: { id }, data: { name: body.name.trim(), role: body.role, ...(body.password ? { password: await bcrypt.hash(body.password, 12) } : {}), assignedDivisions: JSON.stringify(body.divisions ?? []), subjectsTaught: JSON.stringify(body.subjectsTaught ?? []) } })
    return NextResponse.json({ data: responseUser(user) })
  } catch (error) {
    console.error('User update failed:', error)
    return NextResponse.json({ error: 'Unable to update profile.' }, { status: 500 })
  }
}