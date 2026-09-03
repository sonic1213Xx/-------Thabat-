'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, User, Filter, Search, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDateArabic, getAuditActionArabic } from '@/lib/utils'
import { StyledSelect } from '@/components/ui/styled-select'

interface AuditEntry {
  id: string
  action: string
  user: string
  userRole: string
  targetName: string
  details: string
  timestamp: Date
  severity: 'low' | 'medium' | 'high'
}

const mockAuditLog: AuditEntry[] = [
  {
    id: '1',
    action: 'WARNING_ISSUED',
    user: 'أ. نورا محمد',
    userRole: 'VICE_PRINCIPAL',
    targetName: 'فاطمة محمد أحمد',
    details: 'إصدار إنذار تأخر (-2 نقاط)',
    timestamp: new Date(Date.now() - 15 * 60000),
    severity: 'medium',
  },
  {
    id: '2',
    action: 'STUDENT_TRANSFERRED',
    user: 'أ. سارة علي',
    userRole: 'PRINCIPAL',
    targetName: 'علي سعود أحمد',
    details: 'نقل من الفصل 101 إلى الفصل 102',
    timestamp: new Date(Date.now() - 60 * 60000),
    severity: 'medium',
  },
  {
    id: '3',
    action: 'STUDENT_CREATED',
    user: 'أ. ليلى خالد',
    userRole: 'TEACHER',
    targetName: 'مريم خالد سلمان',
    details: 'إضافة طالبة جديدة - رقم هوية: 1234567892',
    timestamp: new Date(Date.now() - 2 * 60 * 60000),
    severity: 'low',
  },
  {
    id: '4',
    action: 'BULK_IMPORT',
    user: 'أ. سارة علي',
    userRole: 'PRINCIPAL',
    targetName: 'استيراد من Excel',
    details: 'استيراد 45 طالب/طالبة من ملف الكشف',
    timestamp: new Date(Date.now() - 4 * 60 * 60000),
    severity: 'high',
  },
  {
    id: '5',
    action: 'BEHAVIOR_SCORE_RESET',
    user: 'أ. نورا محمد',
    userRole: 'VICE_PRINCIPAL',
    targetName: 'فاطمة محمد أحمد',
    details: 'إعادة تعيين درجة السلوك من 85 إلى 100',
    timestamp: new Date(Date.now() - 6 * 60 * 60000),
    severity: 'high',
  },
]

const severityConfig = {
  low: { color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/30' },
  medium: { color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/30' },
  high: { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/30' },
}

export function AuditLogView() {
  const [auditLog, setAuditLog] = useState<AuditEntry[]>(mockAuditLog)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterAction, setFilterAction] = useState<string | 'all'>('all')
  const [filterSeverity, setFilterSeverity] = useState<string | 'all'>('all')

  const filteredLog = auditLog.filter((entry) => {
    const matchesSearch =
      entry.user.includes(searchQuery) ||
      entry.targetName.includes(searchQuery) ||
      entry.details.includes(searchQuery)
    const matchesAction =
      filterAction === 'all' || entry.action === filterAction
    const matchesSeverity =
      filterSeverity === 'all' || entry.severity === filterSeverity
    return matchesSearch && matchesAction && matchesSeverity
  })

  const uniqueActions = [...new Set(auditLog.map((e) => e.action))]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <motion.div
        initial={{ y: -20 }}
        animate={{ y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            سجل ثَبَت للعمليات
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            تتبع شامل لجميع عمليات النظام والتغييرات
          </p>
        </div>
        <button
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg font-medium',
            'bg-emerald-school-600 hover:bg-emerald-school-700 text-white',
            'transition-all duration-200'
          )}
        >
          <FileText className="h-4 w-4" />
          تصدير التقرير
        </button>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex gap-4 flex-wrap"
      >
        <div className="flex-1 min-w-xs">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="ابحث عن مستخدم أو هدف أو تفاصيل..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                'w-full pl-10 pr-4 py-2 rounded-lg border',
                'border-slate-300 dark:border-slate-700',
                'bg-white dark:bg-slate-900',
                'text-slate-900 dark:text-white',
                'focus:outline-none focus:ring-2 focus:ring-emerald-school-500',
                'transition-all duration-200'
              )}
            />
          </div>
        </div>

          <StyledSelect value={filterAction} onValueChange={setFilterAction} options={[{ value: 'all', label: 'جميع الإجراءات' }, ...uniqueActions.map((action) => ({ value: action, label: getAuditActionArabic(action) }))]} className="min-w-48" />

        <StyledSelect value={filterSeverity} onValueChange={setFilterSeverity} options={[{ value: 'all', label: 'جميع المستويات' }, { value: 'low', label: 'منخفضة' }, { value: 'medium', label: 'متوسطة' }, { value: 'high', label: 'عالية' }]} className="min-w-44" />
      </motion.div>

      {/* Timeline */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        <AnimatePresence mode="popLayout">
          {filteredLog.map((entry, idx) => (
            <motion.div
              key={entry.id}
              layoutId={entry.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 30,
                delay: idx * 0.05,
              }}
              className={cn(
                'p-4 rounded-lg border',
                'bg-white dark:bg-slate-900',
                'border-slate-200 dark:border-slate-800',
                'hover:shadow-md dark:hover:shadow-lg transition-all duration-200'
              )}
            >
              <div className="flex gap-4">
                {/* Timeline Marker */}
                <div className="flex flex-col items-center">
                  <motion.div
                    whileHover={{ scale: 1.2 }}
                    className={cn(
                      'w-4 h-4 rounded-full border-2 border-emerald-school-500',
                      'bg-white dark:bg-slate-900'
                    )}
                  />
                </div>

                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-emerald-school-600" />
                    <span className="font-semibold text-slate-900 dark:text-white">{getAuditActionArabic(entry.action)}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                          {entry.userRole === 'PRINCIPAL'
                            ? 'مديرة'
                            : entry.userRole === 'VICE_PRINCIPAL'
                            ? 'مساعدة'
                            : 'معلمة'}
                        </span>
                      </div>

                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                        <span className="font-medium">{entry.user}</span>
                        {' • '}
                        <span className="font-medium">{entry.targetName}</span>
                      </p>

                      <p className={cn(
                        'text-sm mb-2 px-3 py-1 rounded',
                        severityConfig[entry.severity].bg,
                        severityConfig[entry.severity].color
                      )}>
                        {entry.details}
                      </p>

                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <Calendar className="h-3 w-3" />
                        {formatDateArabic(entry.timestamp)}
                      </div>
                    </div>

                    {/* Severity Badge */}
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      className={cn(
                        'px-3 py-1 rounded-lg text-xs font-semibold',
                        severityConfig[entry.severity].bg,
                        severityConfig[entry.severity].color
                      )}
                    >
                      {entry.severity === 'low'
                        ? 'منخفضة'
                        : entry.severity === 'medium'
                        ? 'متوسطة'
                        : 'عالية'}
                    </motion.div>
                  </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredLog.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center p-8"
          >
            <p className="text-slate-600 dark:text-slate-400">
              لم يتم العثور على عمليات
            </p>
          </motion.div>
        )}
      </motion.div>

      {/* Pagination */}
      {filteredLog.length > 10 && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex justify-center gap-2"
        >
          <button className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
            السابق
          </button>
          <button className="px-4 py-2 rounded-lg bg-emerald-school-600 text-white">
            1
          </button>
          <button className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
            2
          </button>
          <button className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
            التالي
          </button>
        </motion.div>
      )}
    </motion.div>
  )
}
