'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, User, Filter, Search, FileText, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatFullArabicDateTime, formatRelativeTimeArabic, getAuditActionArabic, getUserRoleArabic } from '@/lib/utils'
import { StyledSelect } from '@/components/ui/styled-select'

interface AuditEntry {
  id: string
  action: string
  user: string
  userName: string
  userRole: string
  targetName: string
  details: string
  timestamp: Date
  dateOnly: string // YYYY-MM-DD
  timeOnly: string // HH:mm:ss
  severity: 'low' | 'medium' | 'high'
  relativeTime: string // e.g., "اليوم الساعة 10:45 ص"
}

interface DateRange {
  startDate: string
  endDate: string
}

const mockAuditLog: AuditEntry[] = [
  {
    id: '1',
    action: 'WARNING_ISSUED',
    user: 'نورا محمد',
    userName: 'أ. نورا محمد إبراهيم',
    userRole: 'VICE_PRINCIPAL',
    targetName: 'فاطمة محمد أحمد',
    details: 'إصدار إنذار تأخر (-2 نقاط)',
    timestamp: new Date(Date.now() - 15 * 60000),
    dateOnly: new Date(Date.now() - 15 * 60000).toISOString().split('T')[0],
    timeOnly: new Date(Date.now() - 15 * 60000).toLocaleTimeString('en-GB').slice(0, 8),
    severity: 'medium',
    relativeTime: 'اليوم الساعة 10:45 ص',
  },
  {
    id: '2',
    action: 'STUDENT_TRANSFERRED',
    user: 'سارة علي',
    userName: 'أ. سارة علي خالد',
    userRole: 'PRINCIPAL',
    targetName: 'علي سعود أحمد',
    details: 'نقل من الفصل 101 إلى الفصل 102',
    timestamp: new Date(Date.now() - 60 * 60000),
    dateOnly: new Date(Date.now() - 60 * 60000).toISOString().split('T')[0],
    timeOnly: new Date(Date.now() - 60 * 60000).toLocaleTimeString('en-GB').slice(0, 8),
    severity: 'medium',
    relativeTime: 'اليوم الساعة 09:15 ص',
  },
  {
    id: '3',
    action: 'STUDENT_CREATED',
    user: 'ليلى خالد',
    userName: 'أ. ليلى خالد سلمان',
    userRole: 'TEACHER',
    targetName: 'مريم خالد سلمان',
    details: 'إضافة طالبة جديدة - رقم هوية: 1234567892',
    timestamp: new Date(Date.now() - 2 * 60 * 60000),
    dateOnly: new Date(Date.now() - 2 * 60 * 60000).toISOString().split('T')[0],
    timeOnly: new Date(Date.now() - 2 * 60 * 60000).toLocaleTimeString('en-GB').slice(0, 8),
    severity: 'low',
    relativeTime: 'اليوم الساعة 08:30 ص',
  },
  {
    id: '4',
    action: 'BULK_IMPORT',
    user: 'سارة علي',
    userName: 'أ. سارة علي خالد',
    userRole: 'PRINCIPAL',
    targetName: 'استيراد من Excel',
    details: 'استيراد 45 طالب/طالبة من ملف الكشف',
    timestamp: new Date(Date.now() - 4 * 60 * 60000),
    dateOnly: new Date(Date.now() - 4 * 60 * 60000).toISOString().split('T')[0],
    timeOnly: new Date(Date.now() - 4 * 60 * 60000).toLocaleTimeString('en-GB').slice(0, 8),
    severity: 'high',
    relativeTime: 'اليوم الساعة 06:45 ص',
  },
]

const severityConfig = {
  low: { color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/30' },
  medium: { color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/30' },
  high: { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/30' },
}

export function EnhancedAuditLogView() {
  const [auditLog, setAuditLog] = useState<AuditEntry[]>(mockAuditLog)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterAction, setFilterAction] = useState<string | 'all'>('all')
  const [filterSeverity, setFilterSeverity] = useState<string | 'all'>('all')
  const [showDateRangePicker, setShowDateRangePicker] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  })

  const filteredLog = auditLog.filter((entry) => {
    const entryDate = entry.dateOnly
    const matchesSearch =
      entry.userName.includes(searchQuery) ||
      entry.targetName.includes(searchQuery) ||
      entry.details.includes(searchQuery)
    const matchesAction =
      filterAction === 'all' || entry.action === filterAction
    const matchesSeverity =
      filterSeverity === 'all' || entry.severity === filterSeverity
    const matchesDateRange =
      entryDate >= dateRange.startDate && entryDate <= dateRange.endDate

    return matchesSearch && matchesAction && matchesSeverity && matchesDateRange
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
            سجل ثَبَت الشامل للعمليات
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            تتبع دقيق لجميع عمليات النظام مع التوقيت الكامل والمسؤول عن كل تغيير
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
        className="space-y-4"
      >
        {/* Top Filter Row */}
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-xs">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input type="text" placeholder="ابحث عن مستخدم أو هدف أو تفاصيل..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
            </div>
          </div>

          <StyledSelect value={filterAction} onValueChange={setFilterAction} options={[{ value: 'all', label: 'جميع الإجراءات' }, ...uniqueActions.map((action) => ({ value: action, label: getAuditActionArabic(action) }))]} className="min-w-48" />

          <StyledSelect value={filterSeverity} onValueChange={setFilterSeverity} options={[{ value: 'all', label: 'جميع المستويات' }, { value: 'low', label: 'منخفضة' }, { value: 'medium', label: 'متوسطة' }, { value: 'high', label: 'عالية' }]} className="min-w-44" />

          {/* Date Range Picker Button */}
          <motion.button
            onClick={() => setShowDateRangePicker(!showDateRangePicker)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg border',
              'border-slate-300 dark:border-slate-700',
              'bg-white dark:bg-slate-900',
              'text-slate-900 dark:text-white',
              'hover:bg-slate-50 dark:hover:bg-slate-800',
              'transition-all duration-200'
            )}
          >
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">التاريخ</span>
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform',
                showDateRangePicker && 'rotate-180'
              )}
            />
          </motion.button>
        </div>

        {/* Date Range Picker */}
        <AnimatePresence>
          {showDateRangePicker && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={cn(
                'p-4 rounded-lg border',
                'bg-slate-50 dark:bg-slate-800/50',
                'border-slate-200 dark:border-slate-700'
              )}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                    من التاريخ
                  </label>
                  <input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) =>
                      setDateRange({ ...dateRange, startDate: e.target.value })
                    }
                    className={cn(
                      'w-full px-3 py-2 rounded-lg border',
                      'border-slate-300 dark:border-slate-600',
                      'bg-white dark:bg-slate-900',
                      'text-slate-900 dark:text-white',
                      'focus:outline-none focus:ring-2 focus:ring-emerald-school-500'
                    )}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                    إلى التاريخ
                  </label>
                  <input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) =>
                      setDateRange({ ...dateRange, endDate: e.target.value })
                    }
                    className={cn(
                      'w-full px-3 py-2 rounded-lg border',
                      'border-slate-300 dark:border-slate-600',
                      'bg-white dark:bg-slate-900',
                      'text-slate-900 dark:text-white',
                      'focus:outline-none focus:ring-2 focus:ring-emerald-school-500'
                    )}
                  />
                </div>
              </div>
              <button
                onClick={() => setShowDateRangePicker(false)}
                className="mt-3 w-full px-3 py-2 text-sm rounded-lg bg-emerald-school-600 hover:bg-emerald-school-700 text-white transition-colors"
              >
                تطبيق الفلتر
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Statistics Bar */}
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
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              إجمالي العمليات المسجلة
            </p>
            <p className="text-2xl font-bold text-emerald-school-600 dark:text-emerald-school-400">
              {filteredLog.length}
            </p>
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400">
            من {dateRange.startDate} إلى {dateRange.endDate}
          </div>
        </div>
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
                'p-5 rounded-lg border',
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
                  {idx < filteredLog.length - 1 && (
                    <div className="w-0.5 h-20 bg-gradient-to-b from-emerald-school-300 to-transparent mt-2" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 pt-1">
                  {/* Action & Timestamp */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {getAuditActionArabic(entry.action)}
                        </span>
                        <span
                          className={cn(
                            'text-xs px-2 py-1 rounded-full font-semibold',
                            'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          )}
                        >
                          {getUserRoleArabic(entry.userRole)}
                        </span>
                      </div>

                      {/* User Attribution Card */}
                      <div className={cn(
                        'p-3 rounded-lg mb-3',
                        'bg-slate-50 dark:bg-slate-800/50',
                        'border border-slate-200 dark:border-slate-700'
                      )}>
                        <div className="flex items-center gap-2 mb-2">
                          <User className="h-4 w-4 text-emerald-school-600" />
                          <span className="font-medium text-slate-900 dark:text-white">
                            {entry.userName}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          على: <span className="font-medium">{entry.targetName}</span>
                        </p>
                      </div>

                      {/* Details */}
                      <p className={cn(
                        'text-sm mb-3 px-3 py-2 rounded',
                        severityConfig[entry.severity].bg,
                        severityConfig[entry.severity].color
                      )}>
                        {entry.details}
                      </p>

                      {/* Timestamp Info */}
                      <div className="flex flex-col gap-2 text-xs text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          <span className="font-medium">{entry.relativeTime}</span>
                        </div>
                        <div className="text-slate-500 dark:text-slate-500 ml-5">
                          {formatFullArabicDateTime(entry.timestamp)}
                        </div>
                      </div>
                    </div>

                    {/* Severity Badge */}
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      className={cn(
                        'px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap',
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
                </div>
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
              لم يتم العثور على عمليات في النطاق المحدد
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
