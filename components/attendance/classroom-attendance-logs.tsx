"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Eye, Loader2, Users } from "lucide-react";
import { StyledSelect } from "@/components/ui/styled-select";
import { getSession } from "@/lib/auth";
import { useLanguage } from "@/components/language-provider";

type Assignment = { subject: string; divisions: string[]; attendance?: boolean };
type Teacher = { id: string; name: string; role: string; teachingAssignments?: Assignment[] };
type Session = { id: string; date: string; divisionId: string; teacherId: string; subject: string; presentCount: number; absentCount: number };
type StudentRow = { studentId: string; studentName: string; divisionCode?: string | null; status: string; notes?: string | null };

const statusLabels: Record<string, { ar: string; en: string; className: string }> = {
  PRESENT: { ar: "حاضر", en: "Present", className: "text-emerald-700 bg-emerald-50" },
  ABSENT_UNEXCUSED: { ar: "غائب", en: "Absent", className: "text-red-700 bg-red-50" },
  ABSENT_EXCUSED: { ar: "غائب بعذر", en: "Excused", className: "text-amber-700 bg-amber-50" },
  LATE: { ar: "متأخر", en: "Late", className: "text-blue-700 bg-blue-50" },
  ESCAPED: { ar: "هروب", en: "Escaped", className: "text-fuchsia-700 bg-fuchsia-50" },
  OTHER: { ar: "أخرى", en: "Other", className: "text-slate-700 bg-slate-100" },
  UNMARKED: { ar: "غير محدد", en: "Unmarked", className: "text-slate-500 bg-slate-100" },
};

export function ClassroomAttendanceLogs() {
  const { locale } = useLanguage();
  const english = locale === "en";
  const session = getSession();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teacherId, setTeacherId] = useState("");
  const [subject, setSubject] = useState("");
  const [division, setDivision] = useState("ALL");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const selectedTeacher = teachers.find((teacher) => teacher.id === teacherId);
  const assignments = selectedTeacher?.teachingAssignments?.filter((assignment) => assignment.attendance !== false) ?? [];
  const subjects = Array.from(new Set(assignments.map((assignment) => assignment.subject).filter(Boolean)));
  const divisions = Array.from(new Set(assignments.filter((assignment) => !subject || assignment.subject === subject).flatMap((assignment) => assignment.divisions))).sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));

  useEffect(() => {
    if (!session) return;
    void fetch("/api/users", { cache: "no-store" }).then((response) => response.json()).then((result: { data?: Teacher[] }) => {
      const teacherProfiles = (result.data ?? []).filter((teacher) => teacher.role === "TEACHER");
      setTeachers(teacherProfiles);
      if (teacherProfiles[0]) setTeacherId(teacherProfiles[0].id);
    }).catch(() => setTeachers([]));
  }, [session?.id]);

  useEffect(() => {
    const nextSubject = subjects[0] ?? "";
    if (!subjects.includes(subject)) setSubject(nextSubject);
  }, [teacherId, subjects.join(",")]);

  useEffect(() => {
    if (!session || !teacherId || !subject) return;
    setLoading(true);
    const params = new URLSearchParams({ logs: "true", mode: "CLASS", month, teacherId, subject, divisionId: "ALL" });
    void fetch(`/api/attendance?${params}`, { headers: { "x-thabat-user-id": session.id } }).then((response) => response.json()).then((result: { data?: Session[] }) => setSessions(result.data ?? [])).catch(() => setSessions([])).finally(() => setLoading(false));
  }, [session?.id, teacherId, subject, month]);

  const loadDate = (date: string) => {
    if (!session || !teacherId || !subject) return;
    setSelectedDate(date);
    setDivision("");
    setStudents([]);
  };

  useEffect(() => {
    if (!session || !teacherId || !subject || !selectedDate || !division) return;
    setLoadingStudents(true);
    const params = new URLSearchParams({ logs: "true", mode: "CLASS", date: selectedDate, teacherId, subject, divisionId: division });
    void fetch(`/api/attendance?${params}`, { headers: { "x-thabat-user-id": session.id } }).then((response) => response.json()).then((result: { data?: StudentRow[] }) => setStudents(result.data ?? [])).catch(() => setStudents([])).finally(() => setLoadingStudents(false));
  }, [session?.id, teacherId, subject, selectedDate, division]);

  const sessionByDate = useMemo(() => Array.from(new Map(sessions.map((item) => [item.date, item])).values()), [sessions]);

  return <div className="space-y-6" dir={english ? "ltr" : "rtl"}>
    <header className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><Eye className="h-5 w-5" /></div><div><p className="text-sm font-semibold text-emerald-700">{english ? "Classroom attendance" : "حضور الفصول"}</p><h1 className="text-2xl font-bold">{english ? "Teacher attendance review" : "مراجعة حضور المعلمين"}</h1><p className="mt-1 text-sm text-muted-foreground">{english ? "Read-only view of saved classroom attendance." : "عرض للقراءة فقط لسجلات حضور الفصول المحفوظة."}</p></div></div>
        <label className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm"><CalendarDays className="h-4 w-4 text-emerald-600" /><input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="bg-transparent outline-none" /></label>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2"><StyledSelect key={`teacher-${teachers.length}-${teacherId}`} value={teacherId} onValueChange={(value) => { setTeacherId(value); setSubject(""); setDivision("ALL"); setSelectedDate(""); }} options={teachers.map((teacher) => ({ value: teacher.id, label: teacher.name }))} placeholder={english ? "Choose teacher" : "اختر المعلم"} /><StyledSelect key={`subject-${teacherId}-${subject}-${subjects.join("|")}`} value={subject} onValueChange={(value) => { setSubject(value); setDivision("ALL"); setSelectedDate(""); }} options={subjects.map((item) => ({ value: item, label: item }))} placeholder={english ? "Choose subject" : "اختر المادة"} /></div>
    </header>
    {selectedDate ? <section className="rounded-2xl border border-border bg-card shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4"><div><p className="text-sm text-muted-foreground">{english ? "Choose a division filter" : "اختر تصفية الشعبة"}</p><h2 className="text-lg font-bold">{selectedDate} · {subject}</h2></div><button type="button" onClick={() => { setSelectedDate(""); setDivision("ALL"); setStudents([]); }} className="rounded-lg border border-border px-3 py-2 text-sm font-semibold">{english ? "Back to saved dates" : "العودة للأيام المحفوظة"}</button></div><div className="border-b border-border p-4"><StyledSelect key={`date-division-${selectedDate}-${divisions.join("|")}`} value={division} onValueChange={setDivision} options={[{ value: "ALL", label: english ? "All assigned divisions" : "كل الشعب المسندة" }, ...divisions.map((item) => ({ value: item, label: english ? `Division ${item}` : `الشعبة ${item}` }))]} placeholder={english ? "Choose division" : "اختر الشعبة"} /></div>{!division ? <div className="p-12 text-center text-muted-foreground">{english ? "Choose a division to view students." : "اختر شعبة لعرض الطلاب."}</div> : loadingStudents ? <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-emerald-600" /></div> : <div className="max-h-[55vh] overflow-auto"><table className="min-w-full text-sm"><thead className="sticky top-0 bg-muted"><tr><th className="p-3 text-start">{english ? "Student" : "الطالب"}</th><th className="p-3 text-start">{english ? "Division" : "الشعبة"}</th><th className="p-3 text-start">{english ? "Status" : "الحالة"}</th></tr></thead><tbody>{students.map((student) => { const label = statusLabels[student.status] ?? statusLabels.UNMARKED; return <tr key={student.studentId} className="border-t border-border"><td className="p-3 font-medium">{student.studentName}</td><td className="p-3">{student.divisionCode ?? division}</td><td className="p-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${label.className}`}>{english ? label.en : label.ar}</span></td></tr> })}</tbody></table></div>}</section> : <section><div className="mb-3 flex items-center gap-2"><Users className="h-5 w-5 text-emerald-600" /><h2 className="text-lg font-bold">{english ? "Saved classroom days" : "أيام حضور الفصول المحفوظة"}</h2></div>{loading ? <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-emerald-600" /></div> : sessionByDate.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{sessionByDate.map((item) => <button key={item.id} type="button" onClick={() => loadDate(item.date)} className="rounded-2xl border border-border bg-card p-4 text-start shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-500"><div className="flex items-center justify-between"><span className="font-bold">{item.date}</span><span className="text-xs text-muted-foreground">{item.presentCount} {english ? "present" : "حاضر"}</span></div><p className="mt-2 text-sm text-muted-foreground">{subject}</p></button>)}</div> : <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">{english ? "No saved classroom attendance for this teacher and subject." : "لا توجد سجلات حضور محفوظة لهذا المعلم وهذه المادة."}</div>}</section>}
  </div>;
}
