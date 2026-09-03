'use client'

import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  id: string
  label: string
  value: string
  change: string
  icon: LucideIcon
  color: 'emerald' | 'blue' | 'orange' | 'purple'
}

const colorMap = {
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-200 dark:border-emerald-900/30',
    icon: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400',
    text: 'text-emerald-600 dark:text-emerald-400',
  },
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-900/30',
    icon: 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400',
    text: 'text-blue-600 dark:text-blue-400',
  },
  orange: {
    bg: 'bg-orange-50 dark:bg-orange-950/30',
    border: 'border-orange-200 dark:border-orange-900/30',
    icon: 'bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400',
    text: 'text-orange-600 dark:text-orange-400',
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-950/30',
    border: 'border-purple-200 dark:border-purple-900/30',
    icon: 'bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400',
    text: 'text-purple-600 dark:text-purple-400',
  },
}

export function StatCard({ id, label, value, change, icon: Icon, color }: StatCardProps) {
  const colors = colorMap[color]
  const normalizedChange = typeof change === 'string' ? change.trim() : ''
  const isBadgeVisible = Boolean(normalizedChange && normalizedChange !== '0' && normalizedChange !== '+0' && normalizedChange !== '-0')

  return (
    <motion.div
      whileHover={{ scale: 1.02, translateY: -4 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'rounded-lg p-6 border',
        'transition-all duration-300',
        colors.bg,
        colors.border
      )}
    >
      <div className="flex min-h-[104px] items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            {label}
          </p>
          <div className="mt-auto flex items-center gap-2 pt-3">
            <h3 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              {value}
            </h3>
            {isBadgeVisible && (
              <span className={cn('text-xs font-semibold', colors.text)}>
                {normalizedChange}
              </span>
            )}
          </div>
        </div>
        <motion.div
          initial={{ rotate: -10, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 30,
            delay: 0.2,
          }}
          className={cn('rounded-lg p-3', colors.icon)}
        >
          <Icon className="h-5 w-5" />
        </motion.div>
      </div>
    </motion.div>
  )
}
