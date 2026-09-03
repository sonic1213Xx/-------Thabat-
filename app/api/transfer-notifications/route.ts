import { PrismaClient } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

const globalForPrisma = globalThis as typeof globalThis & { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

async function requestUser(request: NextRequest) {
  const id = request.headers.get('x-thabat-user-id')
  return id ? prisma.user.findUnique({ where: { id }, select: { id: true, role: true, isActive: true } }) : null
}

export async function GET(request: NextRequest) {
  const user = await requestUser(request)
  if (!user?.isActive) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const notifications = await prisma.transferNotification.findMany({ where: { recipientId: user.id }, orderBy: { createdAt: 'desc' }, take: 50 })
  return NextResponse.json({ data: notifications.map((notification) => ({ ...notification, studentIds: JSON.parse(notification.studentIdsJson), students: JSON.parse(notification.studentSnapshotJson), grades: JSON.parse(notification.gradeSnapshotJson) })) })
}

export async function PATCH(request: NextRequest) {
  const user = await requestUser(request)
  if (!user?.isActive) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await request.json() as { id?: string; action?: 'read' | 'reviewed' }
  if (!body.id || !body.action) return NextResponse.json({ error: 'Notification id and action are required.' }, { status: 400 })
  const data = body.action === 'reviewed' ? { reviewedAt: new Date(), readAt: new Date() } : { readAt: new Date() }
  const notification = await prisma.transferNotification.updateMany({ where: { id: body.id, recipientId: user.id }, data })
  if (!notification.count) return NextResponse.json({ error: 'Notification not found.' }, { status: 404 })
  return NextResponse.json({ success: true })
}