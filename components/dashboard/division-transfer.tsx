'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Plus, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Student {
  id: string
  name: string
  divisionCode: string
}

interface Division {
  code: string
  label: string
  grade: number
  studentCount: number
}

const divisions: Division[] = [
  { code: '101', label: 'الأول الثانوي - أ', grade: 1, studentCount: 18 },
  { code: '102', label: 'الأول الثانوي - ب', grade: 1, studentCount: 22 },
  { code: '201', label: 'الثاني الثانوي - أ', grade: 2, studentCount: 19 },
  { code: '202', label: 'الثاني الثانوي - ب', grade: 2, studentCount: 21 },
  { code: '301', label: 'الثالث الثانوي - أ', grade: 3, studentCount: 20 },
  { code: '302', label: 'الثالث الثانوي - ب', grade: 3, studentCount: 19 },
]

const mockStudents: Student[] = [
  { id: '1', name: 'فاطمة محمد أحمد', divisionCode: '101' },
  { id: '2', name: 'علي سعود أحمد', divisionCode: '102' },
  { id: '3', name: 'مريم خالد سلمان', divisionCode: '201' },
]

export function DivisionTransfer() {
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [targetDivision, setTargetDivision] = useState<string | null>(null)
  const [transferReason, setTransferReason] = useState('')

  const handleSelectStudent = (studentId: string) => {
    const newSelected = new Set(selectedStudents)
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId)
    } else {
      newSelected.add(studentId)
    }
    setSelectedStudents(newSelected)
  }

  const handleBulkTransfer = () => {
    if (selectedStudents.size > 0 && targetDivision) {
      // Perform transfer
      console.log('Transferring students:', selectedStudents, 'to', targetDivision)
      setShowTransferModal(false)
      setSelectedStudents(new Set())
      setTargetDivision(null)
      setTransferReason('')
    }
  }

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
            إدارة الفصول والنقل
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            نقل الطلاب بين الفصول الدراسية
          </p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 space-y-4"
        >
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
            قائمة الطلاب
          </h2>

          {/* Students List */}
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {mockStudents.map((student, idx) => {
                const division = divisions.find((d) => d.code === student.divisionCode)
                const isSelected = selectedStudents.has(student.id)

                return (
                  <motion.div
                    key={student.id}
                    layoutId={student.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{
                      type: 'spring',
                      stiffness: 300,
                      damping: 30,
                      delay: idx * 0.05,
                    }}
                    onClick={() => handleSelectStudent(student.id)}
                    className={cn(
                      'p-4 rounded-lg border-2 cursor-pointer transition-all duration-200',
                      isSelected
                        ? 'border-emerald-school-500 bg-emerald-school-50 dark:bg-emerald-school-950/30'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-school-300 dark:hover:border-emerald-school-700'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          {student.name}
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          الفصل الحالي: <span className="font-medium">{division?.label}</span>
                        </p>
                      </div>
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={isSelected ? { scale: 1, opacity: 1 } : { scale: 0.8, opacity: 0 }}
                        className={cn(
                          'w-6 h-6 rounded-full border-2 flex items-center justify-center',
                          isSelected
                            ? 'bg-emerald-school-500 border-emerald-school-500'
                            : 'border-slate-300 dark:border-slate-700'
                        )}
                      >
                        {isSelected && <Check className="h-4 w-4 text-white" />}
                      </motion.div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>

          {/* Transfer Button */}
          {selectedStudents.size > 0 && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setShowTransferModal(true)}
              className={cn(
                'w-full px-4 py-3 rounded-lg font-medium',
                'bg-emerald-school-600 hover:bg-emerald-school-700 text-white',
                'transition-all duration-200',
                'flex items-center justify-center gap-2'
              )}
            >
              <ArrowRight className="h-5 w-5" />
              نقل {selectedStudents.size} طالب/طالبة
            </motion.button>
          )}
        </motion.div>

        {/* Divisions Summary */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
            الفصول الدراسية
          </h2>

          <div className="space-y-2">
            {divisions.map((division) => (
              <motion.div
                key={division.code}
                whileHover={{ scale: 1.02 }}
                className={cn(
                  'p-4 rounded-lg border',
                  'bg-white dark:bg-slate-900',
                  'border-slate-200 dark:border-slate-800',
                  'hover:border-emerald-school-300 dark:hover:border-emerald-school-700',
                  'transition-all duration-200 cursor-pointer'
                )}
                onClick={() => targetDivision === division.code ? setTargetDivision(null) : setTargetDivision(division.code)}
              >
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                  {division.label}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  {division.studentCount} طالب/طالبة
                </p>
                {targetDivision === division.code && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-school-600 dark:text-emerald-school-400"
                  >
                    <Check className="h-3 w-3" />
                    الوجهة المختارة
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Transfer Modal */}
      <AnimatePresence>
        {showTransferModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowTransferModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-lg p-8 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                تأكيد النقل
              </h2>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                    عدد الطلاب المختارين
                  </label>
                  <p className="text-2xl font-bold text-emerald-school-600">
                    {selectedStudents.size}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                    الفصل الجديد
                  </label>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">
                    {divisions.find((d) => d.code === targetDivision)?.label || 'لم يتم الاختيار'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                    سبب النقل (اختياري)
                  </label>
                  <textarea
                    value={transferReason}
                    onChange={(e) => setTransferReason(e.target.value)}
                    placeholder="أدخل سبب النقل..."
                    className={cn(
                      'w-full px-3 py-2 rounded-lg border',
                      'border-slate-300 dark:border-slate-700',
                      'bg-white dark:bg-slate-800',
                      'text-slate-900 dark:text-white',
                      'focus:outline-none focus:ring-2 focus:ring-emerald-school-500',
                      'resize-none'
                    )}
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowTransferModal(false)}
                  className={cn(
                    'flex-1 px-4 py-2 rounded-lg font-medium',
                    'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700',
                    'text-slate-900 dark:text-white',
                    'transition-colors duration-200'
                  )}
                >
                  إلغاء
                </button>
                <button
                  onClick={handleBulkTransfer}
                  disabled={!targetDivision}
                  className={cn(
                    'flex-1 px-4 py-2 rounded-lg font-medium',
                    targetDivision
                      ? 'bg-emerald-school-600 hover:bg-emerald-school-700 text-white'
                      : 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed',
                    'transition-colors duration-200'
                  )}
                >
                  تأكيد النقل
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
