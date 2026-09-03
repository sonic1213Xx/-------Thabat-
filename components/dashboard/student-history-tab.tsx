'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, User, AlertCircle, ArrowRight, Edit2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatRelativeTimeArabic, formatFullArabicDateTime, getAuditActionArabic } from '@/lib/utils'

interface StudentHistoryEntry {
  id: string
  action: string // STUDENT_CREATED, STUDENT_UPDATED, WARNING_ISSUED, STUDENT_TRANSFERRED, etc.
  performedBy: string
  performedByRole: string
  actionType: 'creation' | 'update' | 'warning' | 'transfer' | 'score_reset'
  details: string
  oldValue?: string
  newValue?: string
  timestamp: Date
  severity: 'low' | 'medium' | 'high'
  relativeTime: string
}

interface StudentHistoryTabProps {
  studentId: string
  studentName: string
  divisionCode: string
}

const mockHistoryData: StudentHistoryEntry[] = [
  {
    id: '1',
    action: 'STUDENT_CREATED',
    performedBy: 'أ. سارة علي خالد',
    performedByRole: 'PRINCIPAL',
    actionType: 'creation',
    details: 'تم إنشاء السجل الطالب بنجاح',
    timestamp: new Date('2026-09-01T08:00:00'),
    severity: 'low',
    relativeTime: '1 سبتمبر - 08:00',
  },
  {
    id: '2',
    action: 'STUDENT_TRANSFERRED',
    performedBy: 'أ. نورا محمد إبراهيم',
    performedByRole: 'VICE_PRINCIPAL',
    actionType: 'transfer',
    details: 'تم نقل الطالبة من الفصل 101 إلى الفصل 102',
    oldValue: 'الفصل 101 (أول ثانوي - أ)',
    newValue: 'الفصل 102 (أول ثانوي - ب)',
    timestamp: new Date('2026-09-03T10:30:00'),
    severity: 'medium',
    relativeTime: '3 سبتمبر - 10:30',
  },
  {
    id: '3',
    action: 'WARNING_ISSUED',
    performedBy: 'أ. نورا محمد إبراهيم',
    performedByRole: 'VICE_PRINCIPAL',
    actionType: 'warning',
    details: 'تم إصدار إنذار: التأخر عن الحضور',
    oldValue: 'السلوك: 100/100',
    newValue: 'السلوك: 98/100 (-2)',
    timestamp: new Date('2026-09-05T11:15:00'),
    severity: 'high',
    relativeTime: '5 سبتمبر - 11:15',
  },
  {
    id: '4',
    action: 'STUDENT_UPDATED',
    performedBy: 'أ. ليلى خالد سلمان',
    performedByRole: 'TEACHER',
    actionType: 'update',
    details: 'تم تحديث رقم الهوية الوطنية',
    oldValue: 'رقم قديم: XXXX-XXXX',
    newValue: 'رقم جديد: 1234567890',
    timestamp: new Date('2026-09-06T14:45:00'),
    severity: 'low',
    relativeTime: '6 سبتمبر - 14:45',
  },
  {
    id: '5',
    action: 'WARNING_ISSUED',
    performedBy: 'أ. نورا محمد إبراهيم',
    performedByRole: 'VICE_PRINCIPAL',
    actionType: 'warning',
    details: 'تم إصدار إنذار: عدم الامتثال للقواعس',
    oldValue: 'السلوك: 98/100',
    newValue: 'السلوك: 96/100 (-2)',
    timestamp: new Date('2026-09-07T09:00:00'),
    severity: 'high',
    relativeTime: '7 سبتمبر - 09:00',
  },
  {
    id: '6',
    action: 'BEHAVIOR_SCORE_RESET',
    performedBy: 'أ. سارة علي خالد',
    performedByRole: 'PRINCIPAL',
    actionType: 'score_reset',
    details: 'تم إعادة تعيين درجة السلوك (بداية الفصل الدراسي الجديد)',
    oldValue: 'السلوك: 96/100',
    newValue: 'السلوك: 100/100 (إعادة تعيين)',
    timestamp: new Date('2026-09-08T07:30:00'),
    severity: 'medium',
    relativeTime: '8 سبتمبر - 07:30',
  },
]

const actionTypeConfig = {
  creation: {
    icon: '✨',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    label: 'إنشاء',
  },
  update: {
    icon: '✏️',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    label: 'تعديل',
  },
  warning: {
    icon: '⚠️',
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-950/30',
    label: 'إنذار',
  },
  transfer: {
    icon: '↔️',
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-950/30',
    label: 'نقل',
  },
  score_reset: {
    icon: '🔄',
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-950/30',
    label: 'إعادة تعيين',
  },
}

const severityConfig = {
  low: { color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/20' },
  medium: { color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/20' },
  high: { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/20' },
}

export function StudentHistoryTab({
  studentId,
  studentName,
  divisionCode,
}: StudentHistoryTabProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filterAction, setFilterAction] = useState<string | 'all'>('all')

  const filteredHistory = mockHistoryData.filter((entry) => {
    const matchesFilter =
      filterAction === 'all' || entry.actionType === filterAction
    return matchesFilter
  })

  return (
    <div className="space-y-6 py-6">
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          سجل التعديلات والعمليات
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          جميع الإجراءات المنفذة على سجل الطالبة: <span className="font-medium">{studentName}</span>
        </p>
      </motion.div>

      {/* Filter Tabs */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex gap-2 flex-wrap"
      >
        {[
          { value: 'all', label: 'جميع العمليات' },
          { value: 'creation', label: 'الإنشاء' },
          { value: 'update', label: 'التعديلات' },
          { value: 'warning', label: 'الإنذارات' },
          { value: 'transfer', label: 'النقل' },
          { value: 'score_reset', label: 'إعادة التعيين' },
        ].map((tab) => (
          <motion.button
            key={tab.value}
            onClick={() => setFilterAction(tab.value)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
              'px-4 py-2 rounded-lg font-medium transition-all duration-200',
              filterAction === tab.value
                ? 'bg-emerald-school-600 text-white shadow-md'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700'
            )}
          >
            {tab.label}
          </motion.button>
        ))}
      </motion.div>

      {/* Statistics Card */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
        className={cn(
          'p-4 rounded-lg border',
          'bg-emerald-school-50 dark:bg-emerald-school-950/20',
          'border-emerald-school-200 dark:border-emerald-school-900/30'
        )}
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400">إجمالي العمليات</p>
            <p className="text-2xl font-bold text-emerald-school-600">
              {filteredHistory.length}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400">الإنذارات المسجلة</p>
            <p className="text-2xl font-bold text-red-600">
              {filteredHistory.filter((e) => e.actionType === 'warning').length}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400">الفصل الحالي</p>
            <p className="text-lg font-semibold text-slate-900 dark:text-white">
              {divisionCode}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Timeline */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {filteredHistory.map((entry, idx) => {
            const config = actionTypeConfig[entry.actionType]
            const isExpanded = expandedId === entry.id

            return (
              <motion.div
                key={entry.id}
                layoutId={entry.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 30,
                  delay: idx * 0.05,
                }}
                className={cn(
                  'rounded-lg border overflow-hidden transition-all duration-200',
                  config.bg,
                  isExpanded
                    ? 'border-emerald-school-400 dark:border-emerald-school-700 shadow-lg'
                    : 'border-slate-200 dark:border-slate-800'
                )}
              >
                <motion.button
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  className="w-full p-4 hover:opacity-80 transition-opacity text-left"
                >
                  <div className="flex items-start justify-between">
                    {/* Left Section */}
                    <div className="flex-1 flex gap-3">
                      {/* Icon */}
                      <div className={cn(
                        'text-2xl flex items-center justify-center w-8 h-8 rounded-lg',
                        config.bg
                      )}>
                        {config.icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className={cn(
                            'font-bold text-sm',
                            config.color
                          )}>
                            {getAuditActionArabic(entry.action)}
                          </h3>
                          <span className={cn(
                            'text-xs px-2 py-1 rounded-full font-semibold',
                            'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          )}>
                            {entry.performedByRole === 'PRINCIPAL'
                              ? 'مديرة'
                              : entry.performedByRole === 'VICE_PRINCIPAL'
                              ? 'مساعدة'
                              : 'معلمة'}
                          </span>
                        </div>

                        {/* Details */}
                        <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">
                          {entry.details}
                        </p>

                        {/* User & Time */}
                        <div className="flex items-center gap-4 flex-wrap text-xs text-slate-600 dark:text-slate-400">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span className="font-medium">{entry.performedBy}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{entry.relativeTime}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Section - Severity Badge & Expand Icon */}
                    <div className="flex items-center gap-3 ml-4">
                      <motion.div
                        className={cn(
                          'text-xs px-2 py-1 rounded-full font-semibold whitespace-nowrap',
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
                      <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </motion.div>
                    </div>
                  </div>
                </motion.button>

                {/* Expanded Details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className={cn(
                        'px-4 pb-4 border-t',
                        'border-slate-200 dark:border-slate-700'
                      )}
                    >
                      {/* Timestamp Details */}
                      <div className="mb-4">
                        <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">
                          التاريخ والوقت الدقيق:
                        </p>
                        <p className="text-sm text-slate-900 dark:text-white font-mono">
                          {formatFullArabicDateTime(entry.timestamp)}
                        </p>
                      </div>

                      {/* Before/After Values */}
                      {entry.oldValue && entry.newValue && (
                        <div className="space-y-3">
                          {/* Before */}
                          <div>
                            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">
                              القيمة السابقة:
                            </p>
                            <div className="p-2 rounded bg-slate-100 dark:bg-slate-800 text-sm text-slate-900 dark:text-white">
                              {entry.oldValue}
                            </div>
                          </div>

                          {/* Arrow */}
                          <div className="flex justify-center">
                            <ArrowRight className="h-4 w-4 text-emerald-school-600 rotate-180" />
                          </div>

                          {/* After */}
                          <div>
                            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">
                              القيمة الجديدة:
                            </p>
                            <div className="p-2 rounded bg-emerald-school-100 dark:bg-emerald-school-900/30 text-sm text-emerald-school-900 dark:text-emerald-school-100 font-medium">
                              {entry.newValue}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* No Change Details */}
                      {!entry.oldValue && !entry.newValue && (
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          <p>لا توجد تفاصيل إضافية متاحة</p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {filteredHistory.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center p-8 rounded-lg bg-slate-50 dark:bg-slate-900"
          >
            <p className="text-slate-600 dark:text-slate-400">
              لا توجد عمليات في هذه الفئة
            </p>
          </motion.div>
        )}
      </div>

      {/* Download History Button */}
      <motion.button
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className={cn(
          'w-full px-4 py-3 rounded-lg font-medium',
          'bg-emerald-school-600 hover:bg-emerald-school-700 text-white',
          'transition-all duration-200',
          'flex items-center justify-center gap-2'
        )}
      >
        <FileText className="h-4 w-4" />
        تنزيل السجل كملف PDF
      </motion.button>
    </div>
  )
}

// Import FileText icon if not already imported
import { FileText } from 'lucide-react'
