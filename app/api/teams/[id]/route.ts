import { PrismaClient } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient
}

const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export async function PUT(request: NextRequest, context: { params: { id: string } }) {
  try {
    const body = await request.json() as { label?: string }
    const label = body.label?.trim()

    if (!label) {
      return NextResponse.json({ error: 'Team name is required.' }, { status: 400 })
    }

    const team = await prisma.team.update({
      where: { id: context.params.id },
      data: { label },
    })

    return NextResponse.json({ data: team })
  } catch {
    return NextResponse.json({ error: 'Unable to update team.' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, context: { params: { id: string } }) {
  return PUT(request, context)
}

export async function DELETE(_request: NextRequest, context: { params: { id: string } }) {
  try {
    const team = await prisma.team.findUnique({ where: { id: context.params.id } })
    if (!team) {
      return NextResponse.json({ error: 'Team not found.' }, { status: 404 })
    }

    await prisma.team.delete({ where: { id: context.params.id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Unable to delete team.' }, { status: 500 })
  }
}
