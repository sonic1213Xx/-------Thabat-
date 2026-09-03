'use client'

import { Dialog, DialogContent } from './dialog'

export function Modal({ open, onOpenChange, children, className = '' }: { open: boolean; onOpenChange: (open: boolean) => void; children: React.ReactNode; className?: string }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className={className}>{children}</DialogContent></Dialog>
}
