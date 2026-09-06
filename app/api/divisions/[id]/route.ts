import { NextRequest, NextResponse } from 'next/server'
import { invalidateCache } from '@/lib/redis'
import { prisma } from '@/lib/prisma'

async function teacherDenied(request: NextRequest) {
  const userId = request.headers.get('x-thabat-user-id')
  if (!userId) return false
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
  return user?.role === 'TEACHER'
}

export async function PUT(request: NextRequest, context: { params: { id: string } }) {
  try {
    if (await teacherDenied(request)) return NextResponse.json({ error: 'Teachers have read-only division access.' }, { status: 403 })
    const body = await request.json() as { code?: string; name?: string }
    const code = body.code?.trim()

    if (!code) {
      return NextResponse.json({ error: 'Division code is required.' }, { status: 400 })
    }

    const current = await prisma.division.findUnique({ where: { id: context.params.id }, select: { id: true, code: true, name: true } })
    if (!current) {
      return NextResponse.json({ error: 'Division not found.' }, { status: 404 })
    }

    const existing = await prisma.division.findUnique({ where: { code }, select: { id: true } })
    if (existing && existing.id !== context.params.id) {
      return NextResponse.json({ error: 'A division with this code already exists.' }, { status: 409 })
    }

    const division = await prisma.division.update({
      where: { id: context.params.id },
      select: { id: true, code: true, name: true, createdAt: true, updatedAt: true },
      data: {
        code,
        name: body.name?.trim() || current.name,
      },
    })

    await prisma.student.updateMany({
      where: { divisionCode: current.code },
      data: { divisionCode: code },
    })
    await invalidateCache('thabat:divisions:all')

    return NextResponse.json({ data: division })
  } catch {
    return NextResponse.json({ error: 'Unable to update division.' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, context: { params: { id: string } }) {
  return PUT(request, context)
}

export async function DELETE(request: NextRequest, context: { params: { id: string } }) {
  try {
    if (await teacherDenied(request)) return NextResponse.json({ error: 'Teachers have read-only division access.' }, { status: 403 })
    const current = await prisma.division.findUnique({ where: { id: context.params.id }, select: { id: true, code: true } })
    if (!current) {
      return NextResponse.json({ error: 'Division not found.' }, { status: 404 })
    }

    await prisma.student.updateMany({
      where: { divisionCode: current.code },
      data: { divisionCode: null },
    })

    await prisma.division.delete({ where: { id: context.params.id } })
    await invalidateCache('thabat:divisions:all')
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unable to delete division.' }, { status: 500 })
  }
}
