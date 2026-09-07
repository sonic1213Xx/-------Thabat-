"use client"

import { useEffect, useMemo, useState } from "react"
import { BookOpen, CalendarCheck, Loader2 } from "lucide-react"
import { Modal } from "@/components/ui/modal"
import { StyledSelect } from "@/components/ui/styled-select"
import { GradebookTable, type GradebookRow } from "@/components/gradebook-table"
import { useLanguage } from "@/components/language-provider"

export type LoungeTeacher = { id: string; name: string; subjects: string[]; divisions: string[] }
type AttendanceSession = { id: string; date: string; divisionId: string; subject: string; presentCount: number; absentCount: number }
type AttendanceRow = { studentId: string; studentName: string; divisionCode?: string | null; status: string }

export function TeachersLoungeDetail({ teacher, onClose }: { teacher: LoungeTeacher; onClose: () => void }) {
  const { locale } = useLanguage()
  const english = locale === "en"
  const [view, setView] = useState<"attendance" | "gradebook">("attendance")
  const [subject, setSubject] = useState(teacher.subjects[0] ?? "")
  const [division, setDivision] = useState(teacher.divisions[0] ?? "ALL")
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [sessions, setSessions] = useState<AttendanceSession[]>([])
  const [selectedDate, setSelectedDate] = useState("")
  const [attendanceRows, setAttendanceRows] = useState<AttendanceRow[]>([])
  const [gradebookRows, setGradebookRows] = useState<GradebookRow[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingRows, setLoadingRows] = useState(false)

  useEffect(() => {
    setSubject(teacher.subjects[0] ?? "")
    setDivision(teacher.divisions[0] ?? "ALL")
    setSelectedDate("")
  }, [teacher.id])

  useEffect(() => {
    if (!subject) return
    setLoading(true)
    const params = new URLSearchParams({ logs: "true", mode: "CLASS", month, teacherId: teacher.id, subject, divisionId: "ALL" })
    void fetch(`/api/attendance?${params}`, { cache: "no-store" }).then((response) => response.json()).then((json: { data?: AttendanceSession[] }) => {
      const nextSessions = json.data ?? []
      setSessions(nextSessions)
      setSelectedDate((current) => current && nextSessions.some((session) => session.date === current) ? current : nextSessions[0]?.date ?? "")
    }).catch(() => { setSessions([]); setSelectedDate("") }).finally(() => setLoading(false))
  }, [teacher.id, subject, month])

  useEffect(() => {
    if (view !== "attendance" || !subject || !selectedDate) { setAttendanceRows([]); return }
    setLoadingRows(true)
    const params = new URLSearchParams({ logs: "true", mode: "CLASS", date: selectedDate, teacherId: teacher.id, subject, divisionId: division })
    void fetch(`/api/attendance?${params}`, { cache: "no-store" }).then((response) => response.json()).then((json: { data?: AttendanceRow[] }) => setAttendanceRows(json.data ?? [])).catch(() => setAttendanceRows([])).finally(() => setLoadingRows(false))
  }, [view, teacher.id, subject, division, selectedDate])

  useEffect(() => {
    if (view !== "gradebook" || division === "ALL") { setGradebookRows([]); return }
    void fetch(`/api/students?division=${encodeURIComponent(division)}`, { cache: "no-store" }).then((response) => response.json()).then((json: { data?: Array<{ id: string; fullName: string; academicId?: string | null; nationalId?: string | null; divisionCode?: string | null }> }) => setGradebookRows((json.data ?? []).map((student) => ({ id: student.id, fullName: student.fullName, academicId: student.academicId, nationalId: student.nationalId, divisionCode: student.divisionCode })))).catch(() => setGradebookRows([]))
  }, [view, division])

  const statusLabel = (status: string) => ({ PRESENT: english ? "Present" : "حاضر", ABSENT_UNEXCUSED: english ? "Absent" : "غائب", ABSENT_EXCUSED: english ? "Excused" : "غائب بعذر", LATE: english ? "Late" : "متأخر", ESCAPED: english ? "Escaped" : "هروب", UNMARKED: english ? "Unmarked" : "غير محدد" }[status] ?? status)
  const availableSessions = useMemo(() => Array.from(new Map(sessions.map((session) => [session.date, session])).values()), [sessions])

  return <Modal open={true} onOpenChange={(open) => !open && onClose()} className="max-w-6xl">
    <div className="space-y-5" dir={english ? "ltr" : "rtl"}>
      <header className="border-b border-border pb-4"><div><p className="text-sm font-semibold text-primary">{english ? "Teacher profile" : "ملف المعلم"}</p><h2 className="text-2xl font-bold">{teacher.name}</h2><div className="mt-2 flex flex-wrap gap-2">{teacher.subjects.map((item) => <span key={item} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item === subject ? "bg-primary text-white" : "bg-muted"}`}>{item}</span>)}</div></div></header>
      <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setView("attendance")} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${view === "attendance" ? "bg-primary text-white" : "border border-border hover:bg-muted"}`}><CalendarCheck className="h-4 w-4" />{english ? "Class attendance" : "حضور الفصول"}</button><button type="button" onClick={() => setView("gradebook")} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${view === "gradebook" ? "bg-primary text-white" : "border border-border hover:bg-muted"}`}><BookOpen className="h-4 w-4" />{english ? "Gradebooks" : "كشوف الدرجات"}</button></div>
      <div className="grid gap-3 md:grid-cols-3"><label className="text-sm font-semibold"><span className="mb-1 block">{english ? "Subject" : "المادة"}</span><StyledSelect value={subject} onValueChange={setSubject} options={teacher.subjects.map((item) => ({ value: item, label: item }))} placeholder={english ? "Choose subject" : "اختر المادة"} /></label><label className="text-sm font-semibold"><span className="mb-1 block">{english ? "Division" : "الشعبة"}</span><StyledSelect value={division} onValueChange={setDivision} options={[{ value: "ALL", label: english ? "All assigned divisions" : "كل الشعب المسندة" }, ...teacher.divisions.map((item) => ({ value: item, label: item }))]} /></label>{view === "attendance" && <label className="text-sm font-semibold">{english ? "Month" : "الشهر"}<input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="mt-1 block w-full rounded-lg border border-border bg-card px-3 py-2 font-normal" /></label>}</div>
      {view === "attendance" ? <div className="grid gap-4 lg:grid-cols-[15rem_1fr]">{loading ? <div className="p-8 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div> : <div className="space-y-2">{availableSessions.map((session) => <button key={session.date} type="button" onClick={() => setSelectedDate(session.date)} className={`w-full rounded-lg border p-3 text-start ${selectedDate === session.date ? "border-primary bg-primary/10" : "border-border hover:bg-muted"}`}><p className="font-semibold">{session.date}</p><p className="text-xs text-muted-foreground">{session.presentCount} {english ? "present" : "حاضر"} · {session.absentCount} {english ? "absent" : "غياب"}</p></button>)}{!availableSessions.length && <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{english ? "No saved attendance sessions." : "لا توجد سجلات حضور محفوظة."}</p>}</div>}{loadingRows ? <div className="p-8 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div> : selectedDate ? <div className="max-h-[55vh] overflow-auto rounded-xl border border-border"><table className="min-w-full text-sm"><thead className="sticky top-0 bg-muted"><tr><th className="p-3 text-start">{english ? "Student" : "الطالب"}</th><th className="p-3 text-start">{english ? "Division" : "الشعبة"}</th><th className="p-3 text-start">{english ? "Status" : "الحالة"}</th></tr></thead><tbody>{attendanceRows.map((row) => <tr key={row.studentId} className="border-t border-border"><td className="p-3 font-medium">{row.studentName}</td><td className="p-3">{row.divisionCode ?? division}</td><td className="p-3">{statusLabel(row.status)}</td></tr>)}</tbody></table></div> : <p className="p-8 text-center text-muted-foreground">{english ? "Choose a saved date." : "اختر يوماً محفوظاً."}</p>}</div> : division === "ALL" ? <p className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">{english ? "Choose a division to open its gradebook." : "اختر شعبة لفتح كشف درجاتها."}</p> : <GradebookTable divisionName={division} subject={subject} teacherId={teacher.id} students={gradebookRows} readOnly />}
    </div>
  </Modal>
}
