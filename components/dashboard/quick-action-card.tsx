'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { LucideIcon, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/components/language-provider'

interface QuickActionCardProps {
  id: string
  label: string
  icon: LucideIcon
  href: string
  description: string
}

export function QuickActionCard({
  id,
  label,
  icon: Icon,
  href,
  description,
}: QuickActionCardProps) {
  const { t } = useLanguage()
  return (
    <motion.div
      whileHover={{ scale: 1.04, translateY: -8 }}
      whileTap={{ scale: 0.96 }}
      className="group"
    >
      <Link href={href} prefetch={false} className="block h-full">
        <div className={cn(
          'flex h-full min-h-[190px] flex-col items-center justify-center rounded-lg p-5 text-center',
          'bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900',
          'border border-slate-200 dark:border-slate-700',
          'hover:border-emerald-school-300 dark:hover:border-emerald-school-700',
          'transition-all duration-300 cursor-pointer'
        )}>
          <motion.div
            initial={{ rotate: -10, scale: 0.8 }}
            whileHover={{ rotate: 5, scale: 1.1 }}
            className="mb-3 p-3 rounded-lg bg-emerald-school-100 dark:bg-emerald-school-950/30 text-emerald-school-600 dark:text-emerald-school-400"
          >
            <Icon className="h-6 w-6" />
          </motion.div>
          
          <h3 className="font-semibold text-slate-900 dark:text-white mb-1 group-hover:text-emerald-school-600 dark:group-hover:text-emerald-school-400 transition-colors">
            {label}
          </h3>
          
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
            {description}
          </p>
          
          <motion.div
            initial={{ x: 4, opacity: 0 }}
            whileHover={{ x: -4, opacity: 1 }}
            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-school-600 dark:text-emerald-school-400"
          >
            <span>{t('open')}</span>
            <ArrowLeft className="h-3 w-3" />
          </motion.div>
        </div>
      </Link>
    </motion.div>
  )
}
