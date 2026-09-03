'use client'

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/components/language-provider'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

export function DialogContent({ className, children, ...props }: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>) {
  const { dir, t } = useLanguage()
  return <DialogPrimitive.Portal><DialogPrimitive.Overlay className="fixed inset-0 z-[40] h-screen w-screen bg-black/60 backdrop-blur-sm data-[state=open]:animate-[fadeIn_0.2s_ease-out] data-[state=closed]:animate-[fadeOut_0.18s_ease-in]" /><DialogPrimitive.Content {...props} dir={dir} className={cn('fixed left-1/2 top-1/2 z-[50] max-h-[90vh] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-2xl data-[state=open]:animate-[dialogEnter_0.28s_cubic-bezier(0.22,1,0.36,1)] data-[state=closed]:animate-[dialogExit_0.18s_ease-in] dark:border-slate-700 dark:bg-slate-900', className)}><div className="relative">{children}<DialogPrimitive.Close className="absolute end-0 top-0 rounded-md p-2 text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-0 dark:hover:bg-slate-800" aria-label={t('close')}><X className="h-4 w-4" /></DialogPrimitive.Close></div></DialogPrimitive.Content></DialogPrimitive.Portal>
}
