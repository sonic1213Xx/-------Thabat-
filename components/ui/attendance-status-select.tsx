'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, Check, CheckCircle2, ChevronDown, Circle, XCircle } from 'lucide-react'

const palettes: Record<string, { label: string; icon: typeof Circle; classes: string }> = {
  UNMARKED: { label: 'اتركه دون تحديد', icon: Circle, classes: 'text-slate-500' },
  PRESENT: { label: 'حاضر', icon: CheckCircle2, classes: 'text-emerald-600' },
  ABSENT_UNEXCUSED: { label: 'غائب', icon: XCircle, classes: 'text-red-600' },
  ABSENT_EXCUSED: { label: 'غياب بعذر', icon: AlertCircle, classes: 'text-amber-600' },
  LATE: { label: 'متأخر', icon: AlertCircle, classes: 'text-yellow-600' },
}

type Props = { value: string; onValueChange: (value: string) => void; options: Array<{ value: string; label?: string }>; english?: boolean; className?: string }

export function AttendanceStatusSelect({ value, onValueChange, options, english = false, className = '' }: Props) {
  const [open, setOpen] = useState(false)
  const selected = palettes[value] ?? palettes.UNMARKED
  const SelectedIcon = selected.icon
  const labels: Record<string, string> = { UNMARKED: english ? 'Leave unmarked' : 'اتركه دون تحديد', PRESENT: english ? 'Present' : 'حاضر', ABSENT_UNEXCUSED: english ? 'Absent' : 'غائب', ABSENT_EXCUSED: english ? 'Excused' : 'غياب بعذر', LATE: english ? 'Late' : 'متأخر' }
  const label = labels[value] ?? selected.label

  return <div className={`relative ${className}`}>
    <button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)} className="flex h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-white/80 px-3 text-start text-sm shadow-sm transition hover:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-900/80 dark:text-white">
      <span className="flex items-center gap-2"><SelectedIcon className={`h-4 w-4 ${selected.classes}`} />{label}</span><ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
    <AnimatePresence>
      {open && <motion.div initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }} transition={{ duration: 0.16 }} role="listbox" className="absolute inset-x-0 top-12 z-[1200] rounded-xl border border-slate-200 bg-white/90 p-1 shadow-xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
        {options.map((option) => { const palette = palettes[option.value] ?? palettes.UNMARKED; const Icon = palette.icon; const optionLabel = english ? (labels[option.value] ?? option.label ?? option.value) : (option.label ?? palette.label); return <button key={option.value} type="button" role="option" aria-selected={value === option.value} onClick={() => { onValueChange(option.value); setOpen(false) }} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition hover:bg-emerald-50 dark:hover:bg-emerald-950/30"><span className="flex items-center gap-2"><Icon className={`h-4 w-4 ${palette.classes}`} />{optionLabel}</span>{value === option.value && <Check className="h-4 w-4 text-emerald-600" />}</button> })}
      </motion.div>}
    </AnimatePresence>
  </div>
}
