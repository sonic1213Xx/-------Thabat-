import bcrypt from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getRoleDefinition } from '@/types/roles'
import type { TeachingAssignment } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { id?: string; name?: string; password?: string; divisions?: string[]; subjectsTaught?: string[]; teachingAssignments?: TeachingAssignment[] }
    const username = body.id?.trim()
    const name = body.name?.trim()
    if (!username || !name || !body.password) return NextResponse.json({ error: 'Name, ID, and password are required' }, { status: 400 })
    const normalizedUsername = username.toLowerCase()
    const existing = await prisma.user.findUnique({ where: { username: normalizedUsername } })
    if (existing) return NextResponse.json({ error: 'This ID is already in use' }, { status: 409 })
    const user = await prisma.user.create({
      data: {
        id: username,
        username: normalizedUsername,
        name,
        password: await bcrypt.hash(body.password, 12),
        role: getRoleDefinition('TEACHER')?.key ?? 'TEACHER',
        assignedDivisions: JSON.stringify(body.divisions ?? []),
        subjectsTaught: JSON.stringify(body.subjectsTaught ?? []),
        teachingAssignments: JSON.stringify(body.teachingAssignments ?? []),
      },
    })
    return NextResponse.json({ data: { id: user.id, name: user.name, role: user.role, assigned_divisions: body.divisions ?? [], subjectsTaught: body.subjectsTaught ?? [], teachingAssignments: body.teachingAssignments ?? [] } }, { status: 201 })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json({ error: 'Unable to create account' }, { status: 500 })
  }
}