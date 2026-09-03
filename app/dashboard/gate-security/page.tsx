'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, CheckCircle2, Keyboard, LogOut, ScanLine, ShieldCheck, XCircle } from 'lucide-react'
import { getSession } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { useLanguage } from '@/components/language-provider'

export default function GateSecurityPage() {
  const { locale } = useLanguage()
  const english = locale === 'en'
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [token, setToken] = useState('')
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const session = getSession()
  const canScan = hasPermission(session?.role, 'gate_passes', 'scan')

  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), [])

  const scanPass = async (value: string) => {
    const passId = value.trim()
    if (!passId || !session) return
    setStatus('scanning')
    try {
      const response = await fetch(`/api/gate-passes/${encodeURIComponent(passId)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-thabat-role': session.role, 'x-thabat-user-id': session.id }, body: JSON.stringify({ action: 'scan', actorId: session.id }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || (english ? 'Pass rejected.' : 'تم رفض التصريح.'))
      setStatus('success')
      setMessage(english ? 'Pass verified. Student may leave.' : 'تم التحقق من التصريح. يمكن للطالب المغادرة.')
      setToken('')
      new Audio('/audio/Breathing_Stone.mp3').play().catch(() => undefined)
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : (english ? 'Pass rejected.' : 'تم رفض التصريح.'))
    }
  }

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) { setMessage(english ? 'Camera access is unavailable. Use manual code entry.' : 'الكاميرا غير متاحة. استخدم إدخال الرمز يدوياً.'); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setStatus('scanning')
      const detector = 'BarcodeDetector' in window ? new (window as typeof window & { BarcodeDetector: new (options?: { formats?: string[] }) => { detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> } }).BarcodeDetector({ formats: ['qr_code', 'code_128'] }) : null
      if (!detector) { setMessage(english ? 'Scanner unavailable. Enter the pass code manually.' : 'الماسح غير متاح. أدخل رمز التصريح يدوياً.'); return }
      const poll = async () => {
        if (!videoRef.current || status === 'success') return
        const results = await detector.detect(videoRef.current)
        if (results[0]?.rawValue) { await scanPass(results[0].rawValue); return }
        window.requestAnimationFrame(() => void poll())
      }
      void poll()
    } catch { setMessage(english ? 'Camera permission was denied.' : 'تم رفض إذن الكاميرا.') }
  }

  if (!canScan) return <div className="rounded-2xl border border-border bg-card p-8 text-center text-foreground">{english ? 'Gate Security access is required.' : 'يلزم الدخول بدور حارس الأمن.'}</div>
  return <div className="mx-auto max-w-xl space-y-6 text-foreground" dir={english ? 'ltr' : 'rtl'}>
    <header><p className="text-sm font-semibold uppercase tracking-wider text-primary">{english ? 'Gate Security' : 'أمن البوابة'}</p><h1 className="mt-1 text-3xl font-bold">{english ? 'Gate pass scanner' : 'ماسح تصاريح الخروج'}</h1><p className="mt-2 text-sm text-foreground/65">{english ? 'Scan an approved pass to verify departure.' : 'امسح تصريحاً معتمداً للتحقق من المغادرة.'}</p></header>
    <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm"><div className="relative aspect-[4/3] bg-slate-950"><video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" /><div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-emerald-400/80 shadow-[0_0_40px_rgba(52,211,153,0.25)]"><ScanLine className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 text-emerald-300" /></div><div className="absolute inset-x-0 bottom-0 bg-slate-950/75 p-3 text-center text-xs text-emerald-100">{status === 'scanning' ? (english ? 'Point camera at the QR code' : 'وجّه الكاميرا إلى رمز QR') : (english ? 'Scanner ready' : 'الماسح جاهز')}</div></div><div className="space-y-3 p-5"><button type="button" onClick={() => void startCamera()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-white hover:opacity-90"><Camera className="h-5 w-5" />{english ? 'Open camera' : 'فتح الكاميرا'}</button><div className="flex items-center gap-3 text-xs text-foreground/45"><span className="h-px flex-1 bg-border" />{english ? 'or enter manually' : 'أو أدخل الرمز يدوياً'}<span className="h-px flex-1 bg-border" /></div><div className="flex gap-2"><input value={token} onChange={(event) => setToken(event.target.value)} placeholder={english ? 'Gate pass code' : 'رمز تصريح الخروج'} className="min-w-0 flex-1 rounded-xl border border-border bg-card px-3 py-3 outline-none focus:ring-2 focus:ring-emerald-500" /><button type="button" onClick={() => void scanPass(token)} disabled={!token.trim() || status === 'scanning'} className="rounded-xl border border-border px-4 text-foreground hover:bg-accent disabled:opacity-40"><Keyboard className="h-5 w-5" /></button></div></div></section>
    {status === 'success' && <div className="flex items-center gap-3 rounded-2xl border border-emerald-300/50 bg-emerald-50 p-4 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-200"><CheckCircle2 className="h-8 w-8 shrink-0" /><div><p className="font-bold">{english ? 'Approved to leave' : 'مصرح بالمغادرة'}</p><p className="text-sm">{message}</p></div></div>}
    {status === 'error' && <div className="flex items-center gap-3 rounded-2xl border border-red-300/50 bg-red-50 p-4 text-red-800 dark:bg-red-950/20 dark:text-red-200"><XCircle className="h-8 w-8 shrink-0" /><p className="font-semibold">{message}</p></div>}
    <div className="flex items-center justify-center gap-2 text-xs text-foreground/55"><ShieldCheck className="h-4 w-4 text-primary" />{english ? 'Only approved, unused passes are accepted.' : 'يتم قبول التصاريح المعتمدة وغير المستخدمة فقط.'}</div>
  </div>
}
