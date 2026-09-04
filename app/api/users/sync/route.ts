import { PrismaClient } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { getRoleDefinition } from '@/types/roles'

const globalForPrisma = globalThis as typeof globalThis & { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { id?: string; name?: string; role?: string; assigned_divisions?: string[]; subjectsTaught?: string[]; teachingAssignments?: unknown[] }
    if (!body.id || !body.name || !body.role || !getRoleDefinition(body.role)) return NextResponse.json({ error: 'Invalid profile.' }, { status: 400 })
    const user = await prisma.user.upsert({
      where: { id: body.id },
      update: { name: body.name, role: body.role, assignedDivisions: JSON.stringify(body.assigned_divisions ?? []), subjectsTaught: JSON.stringify(body.subjectsTaught ?? []), teachingAssignments: JSON.stringify(body.teachingAssignments ?? []) },
      create: { id: body.id, username: body.id.toLowerCase(), name: body.name, password: 'local-profile', role: body.role, isActive: true, assignedDivisions: JSON.stringify(body.assigned_divisions ?? []), subjectsTaught: JSON.stringify(body.subjectsTaught ?? []), teachingAssignments: JSON.stringify(body.teachingAssignments ?? []) },
    })
    return NextResponse.json({ data: { id: user.id, role: user.role } })
  } catch (error) {
    console.error('Profile sync failed:', error)
    return NextResponse.json({ error: 'Unable to sync profile.' }, { status: 500 })
  }
}