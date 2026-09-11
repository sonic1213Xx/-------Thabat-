import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const categories = ['BUG', 'FIX', 'SUGGESTION'] as const
const statuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const

type Category = typeof categories[number]
type Status = typeof statuses[number]

function getUserId(request: NextRequest) {
  return request.cookies.get('THABAT_USER_ID')?.value
}

async function getCurrentUser(request: NextRequest) {
  const id = getUserId(request)
  if (!id) return null
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true, role: true, isActive: true } })
  return user?.isActive ? user : null
}

const reportSelect = {
  id: true,
  category: true,
  title: true,
  description: true,
  page: true,
  status: true,
  creatorNote: true,
  createdAt: true,
  updatedAt: true,
  reporterId: true,
  reporter: { select: { id: true, name: true, role: true } },
  resolvedBy: { select: { id: true, name: true } },
} as const

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })
    const reports = await prisma.supportReport.findMany({
      where: user.role === 'CREATOR' ? undefined : { reporterId: user.id },
      select: reportSelect,
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ data: reports, canManage: user.role === 'CREATOR' })
  } catch (error) {
    console.error('Support reports fetch failed:', error)
    return NextResponse.json({ error: 'Unable to load support reports.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })
    const body = await request.json() as { category?: string; title?: string; description?: string; page?: string }
    const category = body.category?.trim() as Category | undefined
    const title = body.title?.trim()
    const description = body.description?.trim()
    if (!category || !categories.includes(category) || !title || !description) return NextResponse.json({ error: 'Category, title, and description are required.' }, { status: 400 })
    if (title.length > 160 || description.length > 5000) return NextResponse.json({ error: 'Report text is too long.' }, { status: 400 })
    const report = await prisma.supportReport.create({ data: { reporterId: user.id, category, title, description, page: body.page?.trim().slice(0, 200) || null }, select: reportSelect })
    return NextResponse.json({ data: report }, { status: 201 })
  } catch (error) {
    console.error('Support report creation failed:', error)
    return NextResponse.json({ error: 'Unable to submit the report.' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })
    if (user.role !== 'CREATOR') return NextResponse.json({ error: 'Only the Creator can manage reports.' }, { status: 403 })
    const body = await request.json() as { id?: string; status?: string; creatorNote?: string }
    if (!body.id || !body.status || !statuses.includes(body.status as Status)) return NextResponse.json({ error: 'A valid report id and status are required.' }, { status: 400 })
    const report = await prisma.supportReport.update({ where: { id: body.id }, data: { status: body.status, creatorNote: body.creatorNote?.trim().slice(0, 5000) || null, resolvedById: body.status === 'RESOLVED' || body.status === 'CLOSED' ? user.id : null }, select: reportSelect })
    return NextResponse.json({ data: report })
  } catch (error) {
    console.error('Support report update failed:', error)
    return NextResponse.json({ error: 'Unable to update the report.' }, { status: 500 })
  }
}