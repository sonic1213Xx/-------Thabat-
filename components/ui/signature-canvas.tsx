'use client'

import { useEffect, useRef, useState } from 'react'
import { Eraser, X } from 'lucide-react'
import { useLanguage } from '@/components/language-provider'

export function SignatureCanvas({ initialSignature, onCancel, onSave, showDefaultOption = false }: { initialSignature?: string | null; onCancel: () => void; onSave: (signature: string, saveAsDefault?: boolean) => void; showDefaultOption?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const [empty, setEmpty] = useState(true)
  const [saveAsDefault, setSaveAsDefault] = useState(true)
  const { locale } = useLanguage()
  const text = locale === 'ar' ? { title: 'التوقيع الرقمي', hint: 'ارسم توقيعك بالماوس أو اللمس أو القلم.', clear: 'مسح', cancel: 'إلغاء', save: 'حفظ التوقيع', defaultOption: 'حفظ كـ توقيع افتراضي لحسابي' } : { title: 'Digital signature', hint: 'Draw your signature with a mouse, touch, or pen.', clear: 'Clear', cancel: 'Cancel', save: 'Save signature', defaultOption: 'Save as my default account signature' }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !initialSignature) return
    const image = new Image()
    image.onload = () => { canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height); setEmpty(false) }
    image.src = initialSignature
  }, [initialSignature])

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const bounds = canvas.getBoundingClientRect()
    return { x: (event.clientX - bounds.left) * canvas.width / bounds.width, y: (event.clientY - bounds.top) * canvas.height / bounds.height }
  }
  const start = (event: React.PointerEvent<HTMLCanvasElement>) => { const canvas = canvasRef.current!; const context = canvas.getContext('2d')!; const { x, y } = point(event); drawingRef.current = true; canvas.setPointerCapture(event.pointerId); context.beginPath(); context.moveTo(x, y) }
  const move = (event: React.PointerEvent<HTMLCanvasElement>) => { if (!drawingRef.current) return; const context = canvasRef.current!.getContext('2d')!; const { x, y } = point(event); context.lineWidth = 3; context.lineCap = 'round'; context.lineJoin = 'round'; context.strokeStyle = '#0f172a'; context.lineTo(x, y); context.stroke(); setEmpty(false) }
  const stop = () => { drawingRef.current = false }
  const clear = () => { const canvas = canvasRef.current!; canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height); setEmpty(true) }
  const save = () => { if (!empty) onSave(canvasRef.current!.toDataURL('image/png'), saveAsDefault) }

  return <div className="fixed inset-0 z-[1400] flex items-center justify-center bg-slate-900/70 p-4" dir={locale === 'ar' ? 'rtl' : 'ltr'}><div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900"><div className="flex items-start justify-between"><div><h2 className="text-xl font-bold">{text.title}</h2><p className="mt-1 text-sm text-slate-500">{text.hint}</p></div><button type="button" onClick={onCancel} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label={text.cancel}><X className="h-5 w-5" /></button></div><canvas ref={canvasRef} width={900} height={300} onPointerDown={start} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} className="mt-5 h-44 w-full touch-none rounded-xl border-2 border-dashed border-slate-300 bg-transparent dark:border-slate-700" />{showDefaultOption && <label className="mt-4 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><input type="checkbox" checked={saveAsDefault} onChange={(event) => setSaveAsDefault(event.target.checked)} className="h-4 w-4 accent-emerald-600" />{text.defaultOption}</label>}<div className="mt-4 flex gap-3"><button type="button" onClick={clear} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-3 text-sm dark:border-slate-700"><Eraser className="h-4 w-4" />{text.clear}</button><button type="button" onClick={onCancel} className="flex-1 rounded-lg border border-slate-300 px-4 py-3 text-sm dark:border-slate-700">{text.cancel}</button><button type="button" onClick={save} disabled={empty} className="flex-1 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-40">{text.save}</button></div></div></div>
}
