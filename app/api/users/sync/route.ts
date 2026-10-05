import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUserId } from '@/lib/server-session'

export async function POST(request: NextRequest) {
  try {
    const id = await getAuthenticatedUserId(request)
    if (!id) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 })
    const user = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } })
    if (!user) return NextResponse.json({ error: 'Profile not found.' }, { status: 404 })
    return NextResponse.json({ data: user })
  } catch (error) {
    console.error('Profile sync failed:', error)
    return NextResponse.json({ error: 'Unable to sync profile.' }, { status: 500 })
  }
}