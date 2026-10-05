import { createHmac, timingSafeEqual } from 'node:crypto'
import type { NextRequest, NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'

export const SESSION_COOKIE_NAME = 'THABAT_SESSION'
const SESSION_TTL_SECONDS = 60 * 60 * 12
const REMEMBER_TTL_SECONDS = 60 * 60 * 24 * 30

type SessionPayload = { sub: string; exp: number }

function signingKey() {
  const secret = process.env.SESSION_SECRET || process.env.DATABASE_URL
  if (!secret) throw new Error('SESSION_SECRET must be configured.')
  return createHmac('sha256', secret).update('thabat-session-signing-key').digest()
}

function signature(value: string) {
  return createHmac('sha256', signingKey()).update(value).digest('base64url')
}

function encodeSession(userId: string, maxAge: number) {
  const payload: SessionPayload = { sub: userId, exp: Math.floor(Date.now() / 1000) + maxAge }
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${encoded}.${signature(encoded)}`
}

export function setSessionCookie(response: NextResponse, userId: string, remember = false) {
  const maxAge = remember ? REMEMBER_TTL_SECONDS : SESSION_TTL_SECONDS
  response.cookies.set(SESSION_COOKIE_NAME, encodeSession(userId, maxAge), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: remember ? maxAge : undefined,
  })
  response.cookies.set('THABAT_USER_ID', '', { httpOnly: true, path: '/', maxAge: 0 })
}

export function clearSessionCookies(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 })
  response.cookies.set('THABAT_USER_ID', '', { httpOnly: true, path: '/', maxAge: 0 })
}

export function getUserIdFromSessionToken(token?: string | null): string | null {
  if (!token) return null
  try {
    const [encoded, suppliedSignature, extra] = token.split('.')
    if (!encoded || !suppliedSignature || extra) return null
    const expected = Buffer.from(signature(encoded))
    const supplied = Buffer.from(suppliedSignature)
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as Partial<SessionPayload>
    if (typeof payload.sub !== 'string' || !payload.sub || typeof payload.exp !== 'number' || payload.exp <= Math.floor(Date.now() / 1000)) return null
    return payload.sub
  } catch {
    return null
  }
}

export async function getAuthenticatedUserId(request: NextRequest): Promise<string | null> {
  return getActiveUserId(getUserIdFromSessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value))
}

export async function getAuthenticatedUserIdFromToken(token?: string | null): Promise<string | null> {
  return getActiveUserId(getUserIdFromSessionToken(token))
}

async function getActiveUserId(userId: string | null): Promise<string | null> {
  if (!userId) return null
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, isActive: true } })
  return user?.isActive ? user.id : null
}

export function isSafeSameOriginMutation(request: NextRequest) {
  const origin = request.headers.get('origin')
  if (!origin) return true
  try {
    return new URL(origin).host === request.headers.get('host')
  } catch {
    return false
  }
}
