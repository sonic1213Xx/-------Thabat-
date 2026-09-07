"use client"

import { FileText, Phone, User, X } from "lucide-react"
import { Modal } from "@/components/ui/modal"
import { useLanguage } from "@/components/language-provider"

type DivisionStudent = {
  id: string
  fullName: string
  arabicName?: string | null
  academicId?: string | null
  nationalId?: string | null
  gradeLevel?: number | null
  level?: string | null
  gpa?: number | null
  parentPhone?: string | null
  behaviorScore?: number | null
  attendanceScore?: number | null
  isActive?: boolean
}

export function DivisionStudentsModal({ divisionCode, students, onClose }: { divisionCode: string; students: DivisionStudent[]; onClose: () => void }) {
  const { locale } = useLanguage()
  const english = locale === "en"
  return <Modal open={true} onOpenChange={(open) => !open && onClose()} className="max-w-6xl">
    <div className="space-y-5" dir={english ? "ltr" : "rtl"}>
      <header className="flex items-start justify-between gap-3 border-b border-border pb-4"><div><p className="text-sm font-semibold text-primary">{english ? "Division roster" : "كشف الشعبة"}</p><h2 className="text-2xl font-bold">{english ? `Division ${divisionCode}` : `الشعبة ${divisionCode}`}</h2><p className="mt-1 text-sm text-muted-foreground">{students.length} {english ? "students" : "طالباً"}</p></div><button type="button" onClick={onClose} aria-label={english ? "Close" : "إغلاق"} className="rounded-lg p-2 hover:bg-muted"><X className="h-5 w-5" /></button></header>
      {!students.length ? <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">{english ? "No students are assigned to this division." : "لا يوجد طلاب مسجلون في هذه الشعبة."}</div> : <div className="max-h-[65vh] overflow-auto rounded-xl border border-border"><table className="min-w-[62rem] w-full text-sm"><thead className="sticky top-0 z-10 bg-muted"><tr><th className="p-3 text-start">{english ? "Student" : "الطالب"}</th><th className="p-3 text-start">{english ? "IDs" : "المعرفات"}</th><th className="p-3 text-start">{english ? "Grade" : "الصف"}</th><th className="p-3 text-start">{english ? "Parent phone" : "هاتف ولي الأمر"}</th><th className="p-3 text-start">{english ? "GPA" : "المعدل"}</th><th className="p-3 text-start">{english ? "Behavior" : "السلوك"}</th><th className="p-3 text-start">{english ? "Attendance" : "الحضور"}</th></tr></thead><tbody>{students.map((student) => <tr key={student.id} className="border-t border-border align-top"><td className="p-3"><div className="flex items-start gap-2"><User className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><div><p className="font-semibold">{student.fullName}</p>{student.arabicName && student.arabicName !== student.fullName && <p className="text-xs text-muted-foreground">{student.arabicName}</p>}</div></div></td><td className="p-3"><div className="space-y-1 text-xs"><p><FileText className="me-1 inline h-3.5 w-3.5" />{student.academicId || "-"}</p><p><FileText className="me-1 inline h-3.5 w-3.5" />{student.nationalId || "-"}</p></div></td><td className="p-3">{student.gradeLevel ?? student.level ?? "-"}</td><td className="p-3">{student.parentPhone ? <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{student.parentPhone}</span> : "-"}</td><td className="p-3">{student.gpa ?? "-"}</td><td className="p-3">{student.behaviorScore ?? "-"}/100</td><td className="p-3">{student.attendanceScore ?? "-"}/100</td></tr>)}</tbody></table></div>}
    </div>
  </Modal>
}
