import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json() as { id?: string; locale?: string }
    const id = request.cookies.get('THABAT_USER_ID')?.value
    const locale = body.locale === 'en' ? 'en' : body.locale === 'ar' ? 'ar' : null
    if (!id || !locale) return NextResponse.json({ error: 'An authenticated user and valid locale are required.' }, { status: 401 })

    const user = await prisma.user.update({ where: { id }, data: { locale }, select: { locale: true } })
    const response = NextResponse.json({ data: { locale: user.locale } })
    response.cookies.set('NEXT_LOCALE', user.locale, { maxAge: 31536000, path: '/', sameSite: 'lax' })
    return response
  } catch (error) {
    console.error('Locale preference update failed:', error)
    return NextResponse.json({ error: 'Unable to save locale preference.' }, { status: 500 })
  }
}
