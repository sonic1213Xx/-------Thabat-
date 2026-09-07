import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { MANAGEMENT_ROLES } from '@/lib/division-auth'
import { formatRelativeTimeArabic, getDateOnly, getTimeOnly, isValidDivisionCode } from '@/lib/utils'

const scoreFields = ['taskPeriod1', 'taskPeriod2', 'examPeriod1', 'examPeriod2', 'finalExam'] as const
const navigationPaths = new Set(['/dashboard', '/dashboard/students', '/dashboard/attendance', '/dashboard/class-attendance', '/dashboard/teacher-referrals', '/dashboard/divisions', '/dashboard/gradebook', '/dashboard/reports', '/dashboard/audit-log', '/dashboard/settings'])
type ScoreField = typeof scoreFields[number]
type ActionPlan =
  | { type: 'transfer_student'; studentId?: string; studentName?: string; toDivision: string; reason?: string }
  | { type: 'update_grade'; studentId?: string; studentName?: string; divisionCode: string; subject: string; teacherId?: string; field: ScoreField; value: number | null }
  | { type: 'navigate'; path: string; tabName: string }

type Actor = { id: string; name: string; role: string; isActive: boolean; assignedDivisions: string }

function parseDivisions(value: string) {
  try { return JSON.parse(value || '[]') as string[] } catch { return [] }
}

async function getActor(request: NextRequest): Promise<Actor | null> {
  const userId = request.cookies.get('THABAT_USER_ID')?.value || request.headers.get('x-thabat-user-id')
  if (!userId) return null
  return prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, role: true, isActive: true, assignedDivisions: true } })
}

function auditData(actor: Actor, action: string, targetType: string, targetId: string, targetName: string, details: unknown, oldValue?: string, newValue?: string) {
  const now = new Date()
  return { userId: actor.id, userName: actor.name, userRole: actor.role, action, targetType, targetId, targetName, details: JSON.stringify(details), oldValue, newValue, dateOnly: getDateOnly(now), timeOnly: getTimeOnly(now), relativeTime: formatRelativeTimeArabic(now) }
}

async function resolvePlan(actor: Actor, plan: ActionPlan) {
  if (plan.type === 'navigate') {
    if (!navigationPaths.has(plan.path)) throw new Error('That tab is not available for assistant navigation.')
    return { plan }
  }
  if (plan.type === 'transfer_student') {
    if (!MANAGEMENT_ROLES.has(actor.role)) throw new Error('You do not have permission to transfer students.')
    if (!isValidDivisionCode(plan.toDivision)) throw new Error('The target division is invalid.')
    const student = await prisma.student.findFirst({ where: plan.studentId ? { id: plan.studentId } : { fullName: { contains: plan.studentName?.trim() || '' } }, select: { id: true, fullName: true, divisionCode: true } })
    if (!student) throw new Error('The requested student was not found.')
    if (student.divisionCode === plan.toDivision) throw new Error('The student is already in that division.')
    return { plan: { ...plan, studentId: student.id }, student }
  }

  if (!scoreFields.includes(plan.field) || !plan.subject.trim() || !isValidDivisionCode(plan.divisionCode)) throw new Error('The grade request is incomplete or invalid.')
  const teacherId = plan.teacherId || actor.id
  if (actor.role === 'TEACHER' && (teacherId !== actor.id || !parseDivisions(actor.assignedDivisions).includes(plan.divisionCode))) throw new Error('You do not have permission to modify this gradebook.')
  if (!MANAGEMENT_ROLES.has(actor.role) && actor.role !== 'TEACHER') throw new Error('You do not have permission to modify grades.')
  const student = await prisma.student.findFirst({ where: plan.studentId ? { id: plan.studentId } : { fullName: { contains: plan.studentName?.trim() || '' }, divisionCode: plan.divisionCode }, select: { id: true, fullName: true } })
  if (!student) throw new Error('The requested student was not found in that division.')
  const score = await prisma.gradebookScore.findUnique({ where: { studentId_divisionId_subject_teacherId: { studentId: student.id, divisionId: plan.divisionCode, subject: plan.subject.trim(), teacherId } } })
  return { plan: { ...plan, studentId: student.id, teacherId }, student, score }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await getActor(request)
    if (!actor?.isActive) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })
    const body = await request.json() as { mode?: 'preview' | 'execute' | 'restore'; plan?: ActionPlan; actionId?: string; confirmed?: boolean; locale?: string; currentPath?: string }

    if (body.mode === 'restore') {
      if (!body.actionId) return NextResponse.json({ error: 'A restore point is required.' }, { status: 400 })
      const action = await prisma.agentAction.findFirst({ where: { id: body.actionId, userId: actor.id, status: 'EXECUTED' } })
      if (!action) return NextResponse.json({ error: 'Restore point not found or already restored.' }, { status: 404 })
      const before = JSON.parse(action.beforeJson) as { type: string; path?: string; studentId: string; fromDivision?: string; score?: Record<string, unknown> | null; scoreKey?: { divisionId: string; subject: string; teacherId: string } }
      const now = new Date()
      await prisma.$transaction(async (tx) => {
        if (before.type === 'transfer_student') {
          await tx.student.update({ where: { id: before.studentId }, data: { divisionCode: before.fromDivision, lastUpdatedBy: actor.id, lastUpdatedByName: actor.name, lastUpdatedByRole: actor.role } })
          await tx.transferHistory.create({ data: { studentId: before.studentId, fromDivision: '', toDivision: before.fromDivision ?? '', changedBy: actor.id, performedByName: actor.name, performedByRole: actor.role, reason: `AI action restore: ${action.id}`, transferredAt: now, transferDateOnly: getDateOnly(now), transferTimeOnly: getTimeOnly(now), timestamp: now } })
        } else if (before.type === 'navigate') {
          // Navigation has no data mutation; restoring it returns to the saved route.
        } else if (before.scoreKey) {
          if (before.score) await tx.gradebookScore.update({ where: { studentId_divisionId_subject_teacherId: { studentId: before.studentId, ...before.scoreKey } }, data: before.score as never })
          else await tx.gradebookScore.deleteMany({ where: { studentId: before.studentId, ...before.scoreKey } })
        }
        await tx.agentAction.update({ where: { id: action.id }, data: { status: 'RESTORED', restoredAt: now } })
        await tx.auditLog.create({ data: auditData(actor, 'AI_ACTION_RESTORED', 'AI Action', action.id, action.actionType, { restorePoint: action.id, restoredAction: action.actionType }) })
      })
      return NextResponse.json({ restored: true, actionId: action.id, path: before.type === 'navigate' ? before.path : undefined })
    }

    if (!body.plan) return NextResponse.json({ error: 'An action plan is required.' }, { status: 400 })
    const resolved = await resolvePlan(actor, body.plan)
    if (body.mode !== 'execute') {
      if (resolved.plan.type === 'navigate') {
        const arabic = body.locale === 'ar'
        return NextResponse.json({ preview: true, requiresConfirmation: true, actionType: resolved.plan.type, steps: arabic ? [`التحقق من أن ${resolved.plan.path} تبويب معتمد في ثَبَت`, `فتح ${resolved.plan.tabName === 'Students' ? 'الطلاب' : resolved.plan.tabName}`, 'إبقاء المحادثة الحالية متاحة'] : [`Check that ${resolved.plan.path} is an approved Thabat tab`, `Open ${resolved.plan.tabName}`, 'Keep the current chat available'], target: arabic && resolved.plan.tabName === 'Students' ? 'الطلاب' : resolved.plan.tabName })
      }
      const previewResolved = resolved as { plan: Exclude<ActionPlan, { type: 'navigate' }>; student: { fullName: string } }
      const steps = previewResolved.plan.type === 'transfer_student'
        ? [`Check ${actor.name}'s transfer permission`, `Move ${previewResolved.student.fullName} to division ${previewResolved.plan.toDivision}`, 'Write an immutable audit entry']
        : [`Check ${actor.name}'s gradebook permission`, `Set ${previewResolved.student.fullName}'s ${previewResolved.plan.field} score to ${previewResolved.plan.value ?? 'blank'}`, 'Write an immutable audit entry']
      return NextResponse.json({ preview: true, requiresConfirmation: true, actionType: previewResolved.plan.type, steps, target: previewResolved.student.fullName })
    }
    if (body.confirmed !== true) return NextResponse.json({ error: 'Explicit confirmation is required before execution.' }, { status: 409 })

    if (resolved.plan.type === 'navigate') {
      const navigationPlan = resolved.plan as Extract<ActionPlan, { type: 'navigate' }>
      const restorePoint = await prisma.$transaction(async (tx) => {
        const action = await tx.agentAction.create({ data: { userId: actor.id, actionType: navigationPlan.type, requestJson: JSON.stringify(navigationPlan), beforeJson: JSON.stringify({ type: 'navigate', path: body.currentPath ?? '/dashboard' }), afterJson: JSON.stringify({ path: navigationPlan.path }) } })
        await tx.auditLog.create({ data: auditData(actor, 'AI_NAVIGATION', 'Navigation', navigationPlan.path, navigationPlan.tabName, { path: navigationPlan.path, fromPath: body.currentPath ?? '/dashboard' }) })
        return action
      })
      return NextResponse.json({ executed: true, path: navigationPlan.path, navigation: true, actionId: restorePoint.id })
    }

    const executable = resolved as {
      plan: Exclude<ActionPlan, { type: 'navigate' }>
      student: { id: string; fullName: string; divisionCode?: string | null }
      score?: { taskPeriod1: number | null; taskPeriod2: number | null; examPeriod1: number | null; examPeriod2: number | null; finalExam: number | null; customScoresJson: string; updatedBy: string | null; [key: string]: unknown } | null
    }
    const currentDivision = executable.student.divisionCode ?? null
    const before = executable.plan.type === 'transfer_student'
      ? { type: executable.plan.type, studentId: executable.student.id, fromDivision: currentDivision }
      : { type: executable.plan.type, studentId: executable.student.id, score: executable.score ? { taskPeriod1: executable.score.taskPeriod1, taskPeriod2: executable.score.taskPeriod2, examPeriod1: executable.score.examPeriod1, examPeriod2: executable.score.examPeriod2, finalExam: executable.score.finalExam, customScoresJson: executable.score.customScoresJson, updatedBy: executable.score.updatedBy } : null, scoreKey: { divisionId: executable.plan.divisionCode, subject: executable.plan.subject.trim(), teacherId: executable.plan.teacherId! } }
    const now = new Date()
    const action = await prisma.$transaction(async (tx) => {
      if (executable.plan.type === 'transfer_student') {
        await tx.student.update({ where: { id: executable.student.id }, data: { divisionCode: executable.plan.toDivision, lastUpdatedBy: actor.id, lastUpdatedByName: actor.name, lastUpdatedByRole: actor.role } })
        await tx.transferHistory.create({ data: { studentId: executable.student.id, fromDivision: currentDivision ?? '', toDivision: executable.plan.toDivision, changedBy: actor.id, performedByName: actor.name, performedByRole: actor.role, reason: executable.plan.reason?.trim() || 'AI assistant transfer', transferredAt: now, transferDateOnly: getDateOnly(now), transferTimeOnly: getTimeOnly(now), timestamp: now } })
        await tx.auditLog.create({ data: auditData(actor, 'AI_STUDENT_TRANSFERRED', 'Student', executable.student.id, executable.student.fullName, { fromDivision: currentDivision, toDivision: executable.plan.toDivision, reason: executable.plan.reason ?? null }, currentDivision ?? undefined, executable.plan.toDivision) })
      } else {
        await tx.gradebookScore.upsert({ where: { studentId_divisionId_subject_teacherId: { studentId: executable.student.id, divisionId: executable.plan.divisionCode, subject: executable.plan.subject.trim(), teacherId: executable.plan.teacherId! } }, update: { [executable.plan.field]: executable.plan.value, updatedBy: actor.id }, create: { studentId: executable.student.id, divisionId: executable.plan.divisionCode, subject: executable.plan.subject.trim(), teacherId: executable.plan.teacherId!, [executable.plan.field]: executable.plan.value, updatedBy: actor.id, customScoresJson: '{}' } })
        await tx.auditLog.create({ data: auditData(actor, 'AI_GRADEBOOK_UPDATED', 'Gradebook', executable.student.id, executable.student.fullName, { divisionCode: executable.plan.divisionCode, subject: executable.plan.subject, field: executable.plan.field }, executable.score ? String(executable.score[executable.plan.field]) : undefined, executable.plan.value == null ? undefined : String(executable.plan.value)) })
      }
      return tx.agentAction.create({ data: { userId: actor.id, actionType: executable.plan.type, requestJson: JSON.stringify(executable.plan), beforeJson: JSON.stringify(before), afterJson: JSON.stringify({ executedAt: now.toISOString() }) } })
    })
    return NextResponse.json({ executed: true, actionId: action.id, restoreAvailable: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to process the AI action.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
