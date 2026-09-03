"use client"

import { useState } from "react"
import { Eye, Users, X } from "lucide-react"
import { Modal } from "@/components/ui/modal"
import { GradebookTable, type GradebookRow } from "@/components/gradebook-table"
import { useLanguage } from "@/components/language-provider"

export type TeacherProfile = { id: string; name: string; role: string; subject?: string }

export function TeacherInspectionView({
  teachers,
  assignments,
  students,
  availableDivisions,
  onAssignmentsChange,
}: {
  teachers: TeacherProfile[]
  assignments: Record<string, string[]>
  students: GradebookRow[]
  availableDivisions: string[]
  onAssignmentsChange: (assignments: Record<string, string[]>) => void
}) {
  const { locale } = useLanguage()
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherProfile | null>(null)
  const teacherDivisions = selectedTeacher ? assignments[selectedTeacher.id] ?? [] : []
  const labels = locale === "ar"
    ? { title: "كشوفات المعلمين", intro: "اختر ملف معلم لمراجعة الشعب المسندة والدرجات المسجلة للقراءة فقط.", teachers: "ملفات المعلمين", assignment: "الشعب المسندة", assignmentHint: "يحدد المدير أو المنشئ الشعب التي يمكن للمعلم إدارتها.", inspect: "فتح الكشف", empty: "لم يتم إسناد شعب لهذا المعلم بعد.", close: "إغلاق", noTeachers: "لا توجد ملفات معلمين محفوظة." }
    : { title: "Teacher inspection", intro: "Select a teacher profile to review assigned divisions and recorded grades in read-only mode.", teachers: "Teacher profiles", assignment: "Assigned divisions", assignmentHint: "The Principal or Creator controls which divisions this teacher can manage.", inspect: "Open inspection", empty: "No divisions have been assigned to this teacher yet.", close: "Close", noTeachers: "No teacher profiles have been saved." }

  return (
    <section className="space-y-4" dir="rtl">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{labels.title}</h2>
        <p className="mt-1 text-sm text-slate-500">{labels.intro}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {teachers.map((teacher) => (
          <button key={teacher.id} type="button" onClick={() => setSelectedTeacher(teacher)} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 text-start transition hover:border-emerald-400 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <span className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"><Users className="h-5 w-5" /></span>
              <span><span className="block font-semibold text-slate-900 dark:text-white">{teacher.name}</span><span className="block text-xs text-slate-500">{assignments[teacher.id]?.length ?? 0} {locale === "ar" ? "شعبة مسندة" : "assigned divisions"}</span></span>
            </span>
            <Eye className="h-4 w-4 text-emerald-600" />
          </button>
        ))}
      </div>
      {!teachers.length && <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">{labels.noTeachers}</div>}

      {selectedTeacher && (
        <Modal open={true} onOpenChange={(open) => !open && setSelectedTeacher(null)} className="max-w-6xl">
          <div className="space-y-5" dir="rtl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
              <div><p className="text-sm font-semibold text-emerald-600">{labels.teachers}</p><h3 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedTeacher.name}</h3>{selectedTeacher.subject && <p className="mt-1 text-sm text-slate-500">{selectedTeacher.subject}</p>}</div>
              <button type="button" onClick={() => setSelectedTeacher(null)} aria-label={labels.close} className="rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <p className="text-sm font-semibold">{labels.assignment}</p>
              <p className="mt-1 text-xs text-slate-500">{labels.assignmentHint}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {availableDivisions.map((division) => {
                  const checked = teacherDivisions.includes(division)
                  return <label key={division} className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900">
                    <input type="checkbox" checked={checked} onChange={() => {
                      const nextForTeacher = checked ? teacherDivisions.filter((item) => item !== division) : [...teacherDivisions, division]
                      const next = { ...assignments, [selectedTeacher.id]: nextForTeacher }
                      onAssignmentsChange(next)
                    }} />
                    {division}
                  </label>
                })}
              </div>
            </div>
            {teacherDivisions.length ? teacherDivisions.map((divisionName) => (
              <GradebookTable key={divisionName} divisionName={divisionName} subject={selectedTeacher.subject ?? 'Unassigned subject'} teacherId={selectedTeacher.id} students={students.filter((student) => student.divisionCode === divisionName)} readOnly />
            )) : <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">{labels.empty}</div>}
          </div>
        </Modal>
      )}
    </section>
  )
}
