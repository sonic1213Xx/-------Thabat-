import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

export const MANAGEMENT_ROLES = new Set([
  'CREATOR',
  'PRINCIPAL',
  'VICE_PRINCIPAL',
  'VP_STUDENT_AFFAIRS',
  'VP_ACADEMIC_AFFAIRS',
  'VP_OPERATIONS',
])

type DivisionUser = {
  id: string
  name: string
  role: string
  isActive: boolean
  assignedDivisions: string
  subjectsTaught: string
  teachingAssignments: string
}

export type DivisionAuthorization =
  | { status: 401; error: string }
  | { status: 403; error: string }
  | { status: 200; user: DivisionUser; isTeacher: boolean; divisionCodes: string[] }

function parseArray(value: string): unknown[] {
  try {
    const parsed: unknown = JSON.parse(value || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function getTeacherDivisionCodes(user: DivisionUser): string[] {
  const directCodes = parseArray(user.assignedDivisions).filter((value): value is string => typeof value === 'string')
  const assignmentCodes = parseArray(user.teachingAssignments).flatMap((assignment) => {
    if (!assignment || typeof assignment !== 'object' || !Array.isArray((assignment as { divisions?: unknown }).divisions)) return []
    return (assignment as { divisions: unknown[] }).divisions.filter((value): value is string => typeof value === 'string')
  })

  return Array.from(new Set([...directCodes, ...assignmentCodes].map((code) => code.trim()).filter(Boolean)))
}

export async function authorizeDivisions(request: NextRequest, requireManagement = false): Promise<DivisionAuthorization> {
  const userId = request.cookies.get('THABAT_USER_ID')?.value || request.headers.get('x-thabat-user-id')
  if (!userId) return { status: 401, error: 'Authentication is required.' }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      role: true,
      isActive: true,
      assignedDivisions: true,
      subjectsTaught: true,
      teachingAssignments: true,
    },
  })

  if (!user || !user.isActive) return { status: 401, error: 'Authentication is required.' }

  const isManagement = MANAGEMENT_ROLES.has(user.role)
  const isTeacher = user.role === 'TEACHER'
  if (!isManagement && !isTeacher) return { status: 403, error: 'You are not authorized to access divisions.' }
  if (requireManagement && !isManagement) return { status: 403, error: 'Management access is required.' }

  return {
    status: 200,
    user,
    isTeacher,
    divisionCodes: isTeacher ? getTeacherDivisionCodes(user) : [],
  }
}

// THABAT_USER_ID is an unsigned development/prototype user-context lookup, not a cryptographically signed session token.
