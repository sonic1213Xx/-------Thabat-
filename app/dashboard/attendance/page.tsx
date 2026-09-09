"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarCheck, Check, FileText, Loader2, Save, Upload, X } from "lucide-react";
import { AttendanceStatusSelect } from "@/components/ui/attendance-status-select";
import { useLanguage } from "@/components/language-provider";
import { getCurrentProfile, getSession } from "@/lib/auth";
import { exportAttendanceWorkbook, type AttendanceCalendar } from "@/lib/export-attendance-fixed";
import { exportAttendancePdf } from "@/lib/export-attendance-pdf";
import { useToast } from "@/components/toast-provider";
import { runExport } from "@/lib/export-feedback";
import { fetchCached, invalidateCached } from "@/lib/client-cache";
import { AttendanceLogsModal } from "@/components/attendance/attendance-logs-modal";
import { AttendanceImportModal } from "@/components/attendance/attendance-import-modal";
import { EditAttendanceModal } from "@/components/attendance/edit-attendance-modal";
import { StyledSelect } from "@/components/ui/styled-select";
import { usePathname, useRouter } from "next/navigation";
import { getConfiguredClassroomDefaultAttendance, getConfiguredLateTime } from "@/lib/school-settings";

type Status =
  | "UNMARKED"
  | "PRESENT"
  | "ABSENT_EXCUSED"
  | "ABSENT_UNEXCUSED"
  | "LATE"
  | "OTHER"
  | "ESCAPED"
  | "LEFT_WITH_PERMISSION";
type Student = {
  id: string;
  studentId?: string;
  academicId?: string | null;
  nationalId?: string | null;
  fullName: string;
  divisionCode?: string | null;
  isActive?: boolean;
  gradeLevel?: number | null;
  status?: Status;
  entryTime?: string | null;
  notes?: string;
};
type DivisionGroup = {
  code: string;
  grade: number | null;
  students: Student[];
};

const options = (english: boolean, classroom: boolean) => [
  { value: "PRESENT", label: english ? "Present" : "حاضر" },
  { value: "ABSENT_UNEXCUSED", label: english ? "Absent" : "غائب" },
  { value: "ABSENT_EXCUSED", label: english ? "Excused" : "غياب بعذر" },
  { value: "LATE", label: english ? "Late" : "متأخر" },
  ...(classroom ? [{ value: "ESCAPED", label: english ? "Escaped" : "هروب" }] : []),
];
const lateDuration = (entryTime: string, english: boolean) => {
  const [hour, minute] = entryTime.split(":").map(Number);
  const [startHour, startMinute] = getConfiguredLateTime().split(":").map(Number);
  const schoolStartMinutes = startHour * 60 + startMinute;
  const total = hour * 60 + minute - schoolStartMinutes;
  if (total <= 0) return english ? "after start time" : "بعد بداية الدوام";
  return total >= 60 ? `${Math.floor(total / 60)} ${english ? "hour" : "ساعة"} ${total % 60} ${english ? "minutes" : "دقيقة"}` : `${total} ${english ? "minutes" : "دقيقة"}`;
};

export default function AttendancePage() {
  const { dir, locale } = useLanguage();
  const { showToast, updateToast } = useToast();
  const english = locale === "en";
  const session = getSession();
  const profile = getCurrentProfile();
  const classroom = usePathname() === "/dashboard/class-attendance";
  const router = useRouter();
  const isTeacher = session?.role === "TEACHER";
  const teachingAssignments = profile?.teachingAssignments?.filter((assignment) => assignment.attendance !== false) ?? [];
  const subjects = Array.from(new Set(teachingAssignments.map((assignment) => assignment.subject).filter(Boolean)));
  const [selectedSubject, setSelectedSubject] = useState(subjects[0] ?? "");
  const teachingDivisions = Array.from(new Set(teachingAssignments.filter((assignment) => !selectedSubject || assignment.subject === selectedSubject).flatMap((assignment) => assignment.divisions)));
  const isClassroomPage = classroom;
  const canClassAttendance = isTeacher && isClassroomPage;
  const canExportAttendanceTemplates = Boolean(session);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const mode: "SCHOOL" | "CLASS" = isClassroomPage ? "CLASS" : "SCHOOL";
  const [students, setStudents] = useState<Student[]>([]);
  const [statuses, setStatuses] = useState<Record<string, Status | null>>({});
  const [entryTimes, setEntryTimes] = useState<Record<string, string | null>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [selectedDivision, setSelectedDivision] = useState("ALL");
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [message, setMessage] = useState("");
  const [attendanceTemplateDivisions, setAttendanceTemplateDivisions] =
    useState<string[]>([]);
  const [templateSelectionReady, setTemplateSelectionReady] = useState(false);
  const [exportPanelOpen, setExportPanelOpen] = useState(false);
  const [desktopHeaderCompact, setDesktopHeaderCompact] = useState(false);
  const desktopHeaderCompactRef = useRef(false);
  const [exportType, setExportType] = useState<"EXCEL" | "PDF">("EXCEL");
  const [exportCalendar, setExportCalendar] = useState<AttendanceCalendar>("both");
  const [isExporting, setIsExporting] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const [attendanceImportOpen, setAttendanceImportOpen] = useState(false);
  const [attendanceRevision, setAttendanceRevision] = useState(0);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<{
    id: string;
    studentId: string;
    studentName: string;
    date: string;
    status: Status;
    notes: string;
  } | null>(null);
  const studentsRequestRef = useRef<string | null>(null);
  const attendanceRequestRef = useRef<string | null>(null);
  const hasFetchedRef = useRef<string | null>(null);
  const [attendanceLoadedKey, setAttendanceLoadedKey] = useState<string | null>(null);
  const initialAttendanceMapRef = useRef<Map<string, { status: Status; note: string }>>(new Map());
  useEffect(() => {
    if (isTeacher && !classroom) router.replace("/dashboard/class-attendance");
  }, [classroom, isTeacher, router]);
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 3000);
    return () => window.clearTimeout(timer);
  }, [message]);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    if (saving) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [saving]);
  useEffect(() => {
    const scrollContainer = document.querySelector<HTMLElement>(".dashboard-main");
    if (!scrollContainer) return;
    let previousScrollY = scrollContainer.scrollTop;
    let downwardDistance = 0;
    let upwardDistance = 0;
    let frame = 0;
    const handleScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!window.matchMedia("(min-width: 768px)").matches) return;
        const currentScrollY = scrollContainer.scrollTop;
        const scrollDelta = currentScrollY - previousScrollY;
        if (currentScrollY <= 96) {
          downwardDistance = 0;
          upwardDistance = 0;
          if (desktopHeaderCompactRef.current) {
            desktopHeaderCompactRef.current = false;
            setDesktopHeaderCompact(false);
          }
        } else if (scrollDelta > 0) {
          downwardDistance += scrollDelta;
          upwardDistance = 0;
          if (downwardDistance >= 48 && !desktopHeaderCompactRef.current) {
            desktopHeaderCompactRef.current = true;
            setDesktopHeaderCompact(true);
            downwardDistance = 0;
          }
        } else if (scrollDelta < 0) {
          upwardDistance -= scrollDelta;
          downwardDistance = 0;
          if (upwardDistance >= 64 && desktopHeaderCompactRef.current) {
            desktopHeaderCompactRef.current = false;
            setDesktopHeaderCompact(false);
            upwardDistance = 0;
          }
        }
        previousScrollY = currentScrollY;
      });
    };
    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      scrollContainer.removeEventListener("scroll", handleScroll);
    };
  }, []);
  const assigned = profile?.assigned_divisions ?? [];
  const divisions = useMemo<DivisionGroup[]>(
    () =>
      Array.from(
        new Set(
          students
            .map((student) => student.divisionCode)
            .filter((code): code is string => Boolean(code)),
        ),
      )
            .filter((code) => !canClassAttendance || teachingDivisions.includes(code) || (isTeacher && assigned.includes(code)))
        .sort((a, b) => a.localeCompare(b, "en", { numeric: true }))
        .map((code) => ({
          code,
          grade:
            students.find((student) => student.divisionCode === code)
              ?.gradeLevel ?? null,
          students: students.filter((student) => student.divisionCode === code),
        })),
    [students, canClassAttendance, teachingDivisions.join(","), isTeacher, assigned],
  );
  const divisionKey = divisions.map((group) => group.code).join(",");

  useEffect(() => {
    const codes = divisions.map((group) => group.code);
    if (!templateSelectionReady && codes.length) {
      setAttendanceTemplateDivisions(codes);
      setTemplateSelectionReady(true);
    }
  }, [divisions, templateSelectionReady]);

  useEffect(() => {
    const requestKey = `${session?.id ?? "anonymous"}:${isTeacher}:${assigned.join(",")}:${profile?.id ?? ""}`;
    if (studentsRequestRef.current === requestKey) return;
    studentsRequestRef.current = requestKey;
    const headers = session?.id
      ? { "x-thabat-user-id": session.id }
      : undefined;
    const allowedTeachingDivisions = teachingDivisions.length ? teachingDivisions : assigned;
    const load = async () => {
      setLoadingStudents(true);
      try {
        const syncKey = session?.id ? `thabat-profile-synced:${session.id}` : null;
        if (session && profile && (!syncKey || !window.sessionStorage.getItem(syncKey)))
          await fetch("/api/users/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: session.id,
              name: session.name,
              role: session.role,
              assigned_divisions: profile.assigned_divisions ?? [],
            }),
          }).then(() => { if (syncKey) window.sessionStorage.setItem(syncKey, "true"); });
        const responses = canClassAttendance
          ? await Promise.all(
            allowedTeachingDivisions.map((code) =>
                fetchCached<{ data?: Student[] }>(`students:${code}`, `/api/students?division=${encodeURIComponent(code)}`, {
                  headers,
                }),
              ),
            )
          : [await fetchCached<{ data?: Student[] }>("students:all", "/api/students", { headers })];
        const payloads = await Promise.all(
        responses.map((response) => response instanceof Response ? response.json() : response),
        );
        setStudents(payloads.flatMap((payload) => payload.data ?? []));
      } finally {
        setLoadingStudents(false);
      }
    };
    if (canClassAttendance && !allowedTeachingDivisions.length) {
      setStudents([]);
      setLoadingStudents(false);
    }
    else void load().catch(() => setMessage("تعذر تحميل الحضور."));
  }, [
    isTeacher,
    canClassAttendance,
    teachingDivisions.join(","),
    assigned.join(","),
    session?.id,
    session?.role,
    session?.name,
    profile?.id,
  ]);

  useEffect(() => {
    const requestKey = `${session?.id ?? "anonymous"}:${date}:${mode}:${divisionKey}:${attendanceRevision}`;
    if (!students.length || !session?.id || !divisions.length) {
      setLoadingAttendance(false);
      setAttendanceLoadedKey(requestKey);
      return;
    }
    if (hasFetchedRef.current === requestKey || attendanceRequestRef.current === requestKey) return;
    hasFetchedRef.current = requestKey;
    attendanceRequestRef.current = requestKey;
    setAttendanceLoadedKey(null);
    const load = async () => {
      setLoadingAttendance(true);
      try {
        const params = new URLSearchParams({ date, mode });
        if (mode === "CLASS") {
          params.set("teacherId", session.id);
          params.set("subject", selectedSubject);
        }
        const response = await fetchCached<{ data?: Student[] }>(`attendance:${date}:${mode}:${divisionKey}:${session.id}`, `/api/attendance?${params}`, {
          headers: { "x-thabat-user-id": session.id },
        });
        const records = response.data ?? [];
        const classroomDefault = mode === "CLASS" ? getConfiguredClassroomDefaultAttendance() : "UNMARKED";
        setStatuses(Object.fromEntries(records.map((record) => [record.studentId ?? record.id, record.status === "UNMARKED" ? classroomDefault : record.status ?? classroomDefault])));
        setEntryTimes(Object.fromEntries(records.map((record) => [record.studentId ?? record.id, record.entryTime ?? null])));
        setNotes(Object.fromEntries(records.map((record) => [record.studentId ?? record.id, record.notes ?? ""])));
        const fetchedRecords = new Map(records.map((record) => [record.studentId ?? record.id, { status: record.status ?? "UNMARKED", note: record.notes ?? "" }]));
        initialAttendanceMapRef.current = new Map(students.flatMap((student) => {
          const record = fetchedRecords.get(student.id);
          return [[student.id, { status: record?.status === "UNMARKED" ? classroomDefault : record?.status ?? classroomDefault, note: record?.note ?? "" }]];
        }));
      } finally {
        setLoadingAttendance(false);
        setAttendanceLoadedKey(requestKey);
      }
    };
    void load().catch(() => setMessage("تعذر تحميل الحضور."));
  }, [date, mode, divisionKey, session?.id, attendanceRevision, selectedSubject]);

  const applyStatus = (studentIds: string[], status: Status) => {
    const eligibleIds = studentIds.filter((studentId) => statuses[studentId] !== "LEFT_WITH_PERMISSION");
    const entryTime = status === "LATE" ? new Date().toTimeString().slice(0, 5) : null;
    setStatuses((current) => ({ ...current, ...Object.fromEntries(eligibleIds.map((studentId) => [studentId, status])) }));
    setEntryTimes((current) => ({ ...current, ...Object.fromEntries(eligibleIds.map((studentId) => [studentId, entryTime])) }));
    if (status === "LATE" && !isClassroomPage) setNotes((current) => ({ ...current, ...Object.fromEntries(eligibleIds.map((studentId) => [studentId, `${english ? "Entry time" : "وقت الدخول"}: ${entryTime} | ${english ? "Late by" : "التأخر"}: ${lateDuration(entryTime!, english)}`])) }));
  };
  const setStudentStatus = (studentId: string, status: Status) => applyStatus([studentId], status);
  const setDivisionStatus = (code: string, status: Status) => applyStatus(students.filter((student) => student.divisionCode === code).map((student) => student.id), status);
  const setMasterStatus = (status: Status) => applyStatus(students.map((student) => student.id), status);
  const clearMasterStatus = () => {
    const hasNotes = Object.values(notes).some((note) => note.trim());
    if (hasNotes && !window.confirm("تنبيه: سيتم حذف جميع الملاحظات وتفريغ حالات الحضور. هل تريد المتابعة؟")) return;
    const eligibleStudents = students.filter((student) => statuses[student.id] !== "LEFT_WITH_PERMISSION");
    setStatuses((current) => ({
      ...current,
      ...Object.fromEntries(eligibleStudents.map((student) => [student.id, null])),
    }));
    setNotes((current) => ({
      ...current,
      ...Object.fromEntries(students.map((student) => [student.id, ""])),
    }));
    setEntryTimes((current) => ({
      ...current,
      ...Object.fromEntries(students.map((student) => [student.id, null])),
    }));
  };
  const save = async () => {
    if (!session?.id) return;
    const currentRecords = divisions.flatMap((group) =>
      group.students.map((student) => {
        const selectedStatus = statuses[student.id] ?? "UNMARKED";
        return {
          studentId: student.id,
          divisionId: group.code,
          date,
          status: (selectedStatus.startsWith("OTHER:") ? "OTHER" : selectedStatus) as Status,
          note: selectedStatus.startsWith("OTHER:") ? selectedStatus.slice(6) : notes[student.id] ?? "",
        };
      }),
    );
    const initialMap = initialAttendanceMapRef.current;
    const changedRecords = currentRecords.filter((record) => {
      if (statuses[record.studentId] === "LEFT_WITH_PERMISSION") return false;
      const initial = initialMap.get(record.studentId);
      return record.status !== initial?.status || record.note !== initial?.note;
    });
    if (!changedRecords.length) {
      setMessage(english ? "No changes to save" : "لا توجد تغييرات للحفظ");
      return;
    }
    setSaving(true);
    setProgress(0);
    try {
      const headers = {
        "Content-Type": "application/json",
        "x-thabat-user-id": session.id,
      };
      const chunks = Array.from({ length: Math.ceil(changedRecords.length / 100) }, (_, index) => changedRecords.slice(index * 100, (index + 1) * 100));
      const totalChunks = chunks.length;
      for (let index = 0; index < totalChunks; index += 1) {
        setProgress(Math.max(5, Math.round((index / totalChunks) * 100)));
        await new Promise((resolve) => window.setTimeout(resolve, 120));
        const response = await fetch("/api/attendance", {
          method: "POST",
          headers,
          body: JSON.stringify({
            date,
            mode,
            teacherId: session.id,
            subject: selectedSubject,
            markedBy: session.id,
            records: chunks[index].map((record) => ({ ...record, notes: record.note, entryTime: entryTimes[record.studentId] ?? undefined })),
          }),
        });
        if (!response.ok) throw new Error("Attendance save failed");
        setProgress(Math.round(((index + 1) / totalChunks) * 100));
      }
      await new Promise((resolve) => window.setTimeout(resolve, 450));
      setMessage(
        english ? "Attendance saved." : "تم حفظ الحضور.",
      );
      initialAttendanceMapRef.current = new Map(initialMap);
      for (const record of changedRecords) initialAttendanceMapRef.current.set(record.studentId, { status: record.status, note: record.note });
      invalidateCached("dashboard:attendance", `attendance:${date}:${mode}:${divisionKey}:${session.id}`);
      window.dispatchEvent(new CustomEvent("thabat-attendance-changed"));
    } catch {
      setMessage(english ? "Unable to save attendance." : "تعذر حفظ الحضور.");
    } finally {
      setSaving(false);
      setProgress(0);
    }
  };
  const visibleDivisions =
    selectedDivision === "ALL"
      ? divisions
      : divisions.filter((group) => group.code === selectedDivision);
  const selectDivision = (code: string) => {
    setSelectedDivision(code);
    if (typeof window === "undefined") return;
    if (window.matchMedia("(max-width: 767px)").matches || code === "ALL") {
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }
    window.requestAnimationFrame(() => {
      document.getElementById(`division-${code}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };
  const exportRecord = (student: Student) => ({
    ...student,
    id: student.academicId || student.nationalId || student.id,
    status: statuses[student.id] ?? "UNMARKED",
  });
  const exportExcel = () =>
    exportAttendanceWorkbook(
      attendanceTemplateDivisions,
      date,
      students.map(exportRecord),
      {
        name: profile?.name || session?.name || "غير محدد",
        role: profile?.role || session?.role || "TEACHER",
      },
      session?.id,
      false,
      exportCalendar,
    );
  const exportPdf = () =>
    exportAttendancePdf(
      students.map(exportRecord),
      attendanceTemplateDivisions,
      date,
      {
        name: profile?.name || session?.name || "غير محدد",
        role: profile?.role || session?.role || "TEACHER",
      },
    );
  const handleExport = () => {
    if (!attendanceTemplateDivisions.length) return;
    setIsExporting(true);
    void runExport(exportType === "PDF" ? exportPdf : exportExcel, showToast, updateToast).finally(() => setIsExporting(false));
    setExportPanelOpen(false);
  };
  const text = english
    ? {
        title: "Attendance",
        date: "Date",
        skip: "Skip to division",
        all: "Show all",
        school: "School attendance",
        class: "Class attendance",
        save: "Save attendance",
        saving: "Saving...",
        masterPresent: "Mark everyone present",
        masterAbsent: "Mark everyone absent",
        divisionPresent: "Mark division present",
        divisionAbsent: "Mark division absent",
        student: "Student",
        status: "Status",
        notes: "Notes",
        choose: "Choose status",
        present: "Present",
        absent: "Absent",
        excused: "Doctor note",
        late: "Late",
        other: "Other",
        otherPlaceholder: "Write a custom status...",
        empty: "No divisions available.",
        loading: "Loading attendance...",
      }
    : {
        title: "الحضور والغياب",
        date: "التاريخ",
        skip: "تخطي إلى الشعبة",
        all: "عرض الكل",
        school: "حضور المدرسة",
        class: "حضور الحصة",
        save: "حفظ الحضور",
        saving: "جارٍ الحفظ...",
        masterPresent: "تسجيل حضور الجميع",
        masterAbsent: "تسجيل غياب الجميع",
        divisionPresent: "تسجيل حضور الشعبة",
        divisionAbsent: "تسجيل غياب الشعبة",
        student: "الطالب",
        status: "الحالة",
        notes: "ملاحظات",
        choose: "اختر الحالة",
        present: "حاضر",
        absent: "غائب",
        excused: "غياب بعذر طبي",
        late: "متأخر",
        other: "أخرى",
        otherPlaceholder: "اكتب حالة مخصصة...",
        empty: "لا توجد شعب متاحة.",
          loading: "جارٍ تحميل بيانات الحضور...",
      };

  const statusOverlay = (status?: Status) => status === "PRESENT"
    ? "border-emerald-300 bg-emerald-50/80 shadow-[inset_0_0_22px_rgba(16,185,129,0.16)] dark:bg-emerald-950/20"
    : status === "ABSENT_UNEXCUSED"
      ? "border-red-300 bg-red-50/80 shadow-[inset_0_0_22px_rgba(239,68,68,0.16)] dark:bg-red-950/20"
      : status === "ABSENT_EXCUSED"
        ? "border-amber-300 bg-amber-50/80 shadow-[inset_0_0_22px_rgba(245,158,11,0.16)] dark:bg-amber-950/20"
        : status === "LATE"
          ? "border-yellow-300 bg-yellow-50/80 shadow-[inset_0_0_22px_rgba(234,179,8,0.18)] dark:bg-yellow-950/20"
          : status === "LEFT_WITH_PERMISSION"
            ? "border-blue-300 bg-blue-50/80 shadow-[inset_0_0_24px_rgba(59,130,246,0.22)] dark:bg-blue-950/25"
            : "border-slate-200 dark:border-slate-700";

        const attendanceKey = `${session?.id ?? "anonymous"}:${date}:${mode}:${divisionKey}:${attendanceRevision}`;
        const isLoading = loadingStudents || loadingAttendance || (Boolean(students.length && divisions.length && session?.id) && attendanceLoadedKey !== attendanceKey);

  return (
    <div className="attendance-page space-y-6" dir={dir}>
      <header className={`isolate sticky top-0 z-30 -mx-4 overflow-hidden border-b border-slate-200 bg-slate-50 px-3 py-2 shadow-sm transition-[padding] duration-300 dark:border-slate-800 dark:bg-slate-950 md:top-0 md:-mx-6 md:overflow-visible md:px-6 ${desktopHeaderCompact ? "md:py-2" : "md:py-4"}`}>
        <div className={`flex flex-wrap items-center justify-between gap-2 transition-[max-height,opacity,transform] duration-300 md:gap-4 ${desktopHeaderCompact ? "md:max-h-0 md:-translate-y-2 md:overflow-hidden md:opacity-0" : "md:max-h-96 md:translate-y-0 md:opacity-100"}`}>
          <div className="flex items-center gap-2 md:gap-3">
            <CalendarCheck className="h-6 w-6 text-emerald-600 md:h-7 md:w-7" />
            <h1 className="text-xl font-bold md:text-2xl">{text.title}</h1>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 md:w-auto">
            <input
              aria-label={text.date}
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="h-10 w-full min-w-0 rounded-lg border px-3 py-2 text-sm dark:bg-slate-900 md:w-auto"
            />
            {isClassroomPage && <div className="min-w-48"><StyledSelect key={`subject-${selectedSubject}-${subjects.join("|")}`} value={selectedSubject} onValueChange={setSelectedSubject} options={subjects.map((subject) => ({ value: subject, label: subject }))} placeholder={english ? "Choose subject" : "اختر المادة"} /></div>}
            <button
              type="button"
              onClick={clearMasterStatus}
              className="h-10 min-w-0 rounded-lg border border-slate-300 px-3 py-2 text-xs whitespace-nowrap text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800 md:text-sm"
            >
              {english ? "Deselect all" : "إلغاء تحديد الكل"}
            </button>
            <button
              type="button"
              onClick={() => setMasterStatus("PRESENT")}
              className="h-10 min-w-0 rounded-lg bg-emerald-600 px-3 py-2 text-xs whitespace-nowrap text-white hover:bg-emerald-500 md:text-sm"
            >
              {text.masterPresent}
            </button>
            <button
              type="button"
              onClick={() => setMasterStatus("ABSENT_UNEXCUSED")}
              className="h-10 min-w-0 rounded-lg border border-red-300 px-3 py-2 text-xs whitespace-nowrap text-red-700 hover:bg-red-950/40 dark:border-red-400 dark:text-red-300 md:text-sm"
            >
              {text.masterAbsent}
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving || !divisions.length}
              className="inline-flex h-10 min-w-0 items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold whitespace-nowrap text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white md:px-4 md:text-sm"
            >
              <Save className="h-4 w-4" />
              {saving ? text.saving : text.save}
            </button>
            <button type="button" onClick={() => setLogsOpen(true)} className="inline-flex h-10 min-w-0 items-center justify-center gap-2 rounded-lg border border-emerald-600 bg-transparent px-3 py-2 text-xs font-semibold whitespace-nowrap text-emerald-700 transition-colors hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40 md:px-4 md:text-sm">
              {english ? "Attendance logs" : "سجل الحضور"}
            </button>
            {!isTeacher && <button type="button" onClick={() => setAttendanceImportOpen(true)} className="inline-flex h-10 min-w-0 items-center justify-center gap-2 rounded-lg border border-sky-600 bg-transparent px-3 py-2 text-xs font-semibold whitespace-nowrap text-sky-700 transition-colors hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-950/40 md:px-4 md:text-sm">
              <Upload className="h-4 w-4" />
              {english ? "Import Excel" : "استيراد Excel"}
            </button>}
          </div>
        </div>
        <div className={`mt-2 flex max-w-full items-center gap-1.5 overflow-x-auto pb-0.5 transition-[margin,gap] duration-300 md:mt-3 md:gap-2 ${desktopHeaderCompact ? "md:mt-0 md:flex-nowrap md:overflow-x-auto" : "md:flex-wrap md:overflow-visible"}`}>
          <span className="shrink-0 text-xs font-semibold md:text-sm">{text.skip}</span>
          <button
            type="button"
            onClick={() => selectDivision("ALL")}
            className={`shrink-0 rounded-full border px-2.5 py-1 text-xs dark:border-slate-500 dark:text-slate-100 md:px-3 md:py-1.5 md:text-sm ${selectedDivision === "ALL" ? "border-emerald-600 bg-emerald-600 text-white" : "hover:border-emerald-400 dark:hover:border-emerald-300"}`}
          >
            {text.all}
          </button>
          {divisions.map((group) => (
            <button
              key={group.code}
              type="button"
              onClick={() => selectDivision(group.code)}
              className={`shrink-0 rounded-full border px-2.5 py-1 text-xs dark:border-slate-500 dark:text-slate-100 md:px-3 md:py-1.5 md:text-sm ${selectedDivision === group.code ? "border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" : "hover:border-emerald-400 dark:hover:border-emerald-300"}`}
            >
              {group.code}
            </button>
          ))}
        </div>
      </header>
      {canExportAttendanceTemplates && (
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-emerald-600" />
            <div>
              <h2 className="font-bold text-card-foreground">
                {english ? "Export attendance" : "تصدير سجل الحضور"}
              </h2>
              <p className="text-xs text-card-foreground/60">
                {english
                  ? `${attendanceTemplateDivisions.length} divisions selected`
                  : `تم تحديد ${attendanceTemplateDivisions.length} شعبة`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setExportPanelOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
          >
            <FileText className="h-4 w-4" />
            {english ? "Choose export" : "اختيار التصدير"}
          </button>
        </section>
      )}
      {exportPanelOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="animate-[fadeIn_0.2s_ease-out] fixed inset-0 z-[10001] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="export-attendance-title">
            <div className="animate-[slideInUp_0.35s_ease-out] max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
                <div>
                  <h2 id="export-attendance-title" className="text-lg font-bold">{english ? "Export attendance" : "تصدير سجل الحضور"}</h2>
                  <p className="mt-1 text-sm text-card-foreground/60">{english ? "Choose a file type and the divisions to include." : "اختر نوع الملف والشعب التي تريد تضمينها."}</p>
                </div>
                <button type="button" onClick={() => setExportPanelOpen(false)} className="rounded-lg p-2 text-card-foreground/60 transition hover:bg-muted hover:text-card-foreground" aria-label={english ? "Close export form" : "إغلاق نموذج التصدير"}><X className="h-5 w-5" /></button>
              </div>
              <fieldset className="mt-5">
                <legend className="text-sm font-bold">{english ? "File type" : "نوع الملف"}</legend>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  {(["EXCEL", "PDF"] as const).map((type) => (
                    <label key={type} className="cursor-pointer">
                      <input type="radio" name="attendance-export-type" value={type} checked={exportType === type} onChange={() => setExportType(type)} className="peer sr-only" />
                      <span className={`flex items-center justify-center rounded-xl border border-border px-4 py-3 text-sm font-bold transition peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500 ${type === "PDF" ? "hover:border-red-400 peer-checked:border-red-600 peer-checked:bg-red-50 peer-checked:text-red-700 dark:peer-checked:bg-red-950/40 dark:peer-checked:text-red-300" : "hover:border-emerald-400 peer-checked:border-emerald-600 peer-checked:bg-emerald-50 peer-checked:text-emerald-700 dark:peer-checked:bg-emerald-950/40 dark:peer-checked:text-emerald-300"}`}>{type === "EXCEL" ? "Excel" : "PDF"}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset className="mt-5">
                <legend className="text-sm font-bold">{english ? "Calendar" : "التقويم"}</legend>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {([['gregorian', english ? 'Gregorian' : 'ميلادي'], ['hijri', english ? 'Hijri' : 'هجري'], ['both', english ? 'Both' : 'كلاهما']] as const).map(([value, label]) => <label key={value} className="cursor-pointer"><input type="radio" name="attendance-calendar" value={value} checked={exportCalendar === value} onChange={() => setExportCalendar(value)} className="peer sr-only" /><span className="flex items-center justify-center rounded-lg border border-border px-3 py-2 text-sm font-semibold peer-checked:border-emerald-600 peer-checked:bg-emerald-50 peer-checked:text-emerald-700 dark:peer-checked:bg-emerald-950/40 dark:peer-checked:text-emerald-300">{label}</span></label>)}
                </div>
              </fieldset>
              <div className="mt-5 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold">{english ? "Divisions" : "الشعب"}</h3>
                  <p className="text-xs text-card-foreground/60">{english ? `${attendanceTemplateDivisions.length} of ${divisions.length} selected` : `تم تحديد ${attendanceTemplateDivisions.length} من ${divisions.length}`}</p>
                </div>
                <button type="button" onClick={() => setAttendanceTemplateDivisions((current) => current.length === divisions.length ? [] : divisions.map((group) => group.code))} className="text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-400">{attendanceTemplateDivisions.length === divisions.length ? (english ? "Clear all" : "إلغاء تحديد الكل") : (english ? "Select all" : "تحديد الكل")}</button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {divisions.map((group) => (
                  <label key={group.code} className="cursor-pointer">
                    <input type="checkbox" checked={attendanceTemplateDivisions.includes(group.code)} onChange={() => setAttendanceTemplateDivisions((current) => current.includes(group.code) ? current.filter((code) => code !== group.code) : [...current, group.code])} className="peer sr-only" />
                    <span className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm font-semibold transition hover:border-emerald-400 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500 peer-checked:border-emerald-600 peer-checked:bg-emerald-600 peer-checked:text-white"><span>{english ? `Division ${group.code}` : `الشعبة ${group.code}`}</span>{attendanceTemplateDivisions.includes(group.code) && <Check className="h-4 w-4" />}</span>
                  </label>
                ))}
              </div>
              <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
                <button type="button" onClick={() => setExportPanelOpen(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold">{english ? "Cancel" : "إلغاء"}</button>
                <button type="button" onClick={handleExport} disabled={isExporting || !attendanceTemplateDivisions.length || (exportType === "PDF" && !students.length)} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{isExporting && exportType === "EXCEL" && <Loader2 className="h-4 w-4 animate-spin" />}{english ? `Export ${exportType}` : `تصدير ${exportType === "PDF" ? "PDF" : "Excel"}`}</button>
              </div>
            </div>
          </div>,
          document.body,
        )}
      {message &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="pointer-events-none fixed inset-x-0 top-4 z-[10000] flex justify-center px-4"
            role="status"
            aria-live="polite"
          >
            <p className="animate-[slideInUp_0.45s_ease-out] rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold text-card-foreground shadow-xl">
              {message}
            </p>
          </div>,
          document.body,
        )}
      {isLoading && (
        <div className="flex min-h-[420px] flex-col items-center justify-center gap-5 rounded-xl border border-slate-200 bg-white/90 p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900/90" role="status" aria-live="polite">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"><Loader2 className="h-7 w-7 animate-spin" /></div>
          <div className="w-full max-w-md space-y-3"><p className="font-semibold text-slate-700 dark:text-slate-200">{text.loading}</p><div className="h-3 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" /><div className="h-3 w-4/5 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" /><div className="h-3 w-3/5 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" /></div>
        </div>
      )}
      <AttendanceLogsModal open={logsOpen} onClose={() => setLogsOpen(false)} english={english} />
      {attendanceImportOpen && session && <AttendanceImportModal
        students={students.map((student) => ({ id: student.id, fullName: student.fullName, divisionCode: student.divisionCode, isActive: student.isActive }))}
        divisions={divisions.map((group) => group.code)}
        defaultDate={date}
        userId={session.id}
        onClose={() => setAttendanceImportOpen(false)}
        onImported={(count) => {
          setMessage(english ? `${count} attendance records imported.` : `تم استيراد ${count} سجل حضور.`);
          invalidateCached("dashboard:attendance", `attendance:${date}:${mode}:${divisionKey}:${session.id}`);
          setAttendanceRevision((current) => current + 1);
          window.dispatchEvent(new CustomEvent("thabat-attendance-changed"));
        }}
      />}
      <main className={`space-y-8 ${isLoading ? "hidden" : ""}`}>
        {visibleDivisions.map((group) => (
          <section
            id={`division-${group.code}`}
            key={group.code}
            tabIndex={-1}
            className="scroll-mt-[13rem] space-y-3 md:scroll-mt-48"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-s-4 border-emerald-600 bg-slate-100 px-4 py-4 dark:bg-slate-900">
              <h2 className="text-xl font-bold">
                {english ? `Division ${group.code}` : `الشعبة ${group.code}`}{" "}
                <span className="text-base font-medium text-slate-500">
                  {english
                    ? `Grade ${group.grade ?? "-"}`
                    : `الصف ${group.grade ?? "-"}`}
                </span>
              </h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDivisionStatus(group.code, "PRESENT")}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-500"
                >
                  {text.divisionPresent}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setDivisionStatus(group.code, "ABSENT_UNEXCUSED")
                  }
                  className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-700 hover:bg-red-950/40 dark:border-red-400 dark:text-red-300"
                >
                  {text.divisionAbsent}
                </button>
              </div>
            </div>
            <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900 md:hidden">
              {group.students.map((student) => (
                <article key={student.id} className={`[content-visibility:auto] [contain-intrinsic-size:0_132px] rounded-lg border p-3 ${statusOverlay(statuses[student.id] ?? undefined)}`}>
                  <div className="flex items-start justify-between gap-3">
                    <p className={`min-w-0 truncate rounded-md px-2 py-1 font-semibold ${statusOverlay(statuses[student.id] ?? undefined)}`}>{student.fullName}</p>
                  </div>
                  <div className="mt-3">{statuses[student.id] === "LEFT_WITH_PERMISSION" ? <button type="button" disabled className="w-full cursor-not-allowed rounded-lg border border-blue-400 bg-blue-100 px-3 py-2 text-sm font-bold text-blue-800 shadow-[0_0_18px_rgba(59,130,246,0.45)] dark:bg-blue-950/50 dark:text-blue-200">{english ? "Left with permission" : "خرج بإذن"}</button> : <AttendanceStatusSelect value={statuses[student.id] ?? ""} onValueChange={(value) => setStudentStatus(student.id, statuses[student.id] === value ? "UNMARKED" : value as Status)} options={options(english, isClassroomPage)} english={english} variant="buttons" />}</div>
                  <textarea value={notes[student.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [student.id]: event.target.value }))} disabled={statuses[student.id] === "LEFT_WITH_PERMISSION"} placeholder={text.notes} aria-label={`${text.notes} ${student.fullName}`} rows={2} className="mt-3 block min-h-16 w-full resize-y rounded-lg border px-3 py-2 text-sm leading-6 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-900" />
                </article>
              ))}
            </div>
            <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:block">
              <table className="min-w-[64rem] w-full table-fixed text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr>
                    <th className="w-[25%] px-4 py-3 text-start">{text.student}</th>
                    <th className="w-[45%] px-4 py-3 text-start">{text.status}</th>
                    <th className="w-[30%] px-4 py-3 text-start">{text.notes}</th>
                  </tr>
                </thead>
                <tbody>
                  {group.students.map((student) => (
                    <tr
                      key={student.id}
                      className={`[content-visibility:auto] [contain-intrinsic-size:0_72px] border-t ${statusOverlay(statuses[student.id] ?? undefined)}`}
                    >
                      <td className="w-[25%] px-4 py-3 font-medium">
                        <span className={`inline-block rounded-md px-2 py-1 ${statusOverlay(statuses[student.id] ?? undefined)}`}>{student.fullName}</span>
                      </td>
                      <td className="w-[45%] min-w-[28rem] px-4 py-3">
                        {statuses[student.id] === "LEFT_WITH_PERMISSION" ? <button type="button" disabled className="cursor-not-allowed rounded-lg border border-blue-400 bg-blue-100 px-4 py-2 text-sm font-bold text-blue-800 shadow-[0_0_18px_rgba(59,130,246,0.45)] dark:bg-blue-950/50 dark:text-blue-200">{english ? "Left with permission" : "خرج بإذن"}</button> : <AttendanceStatusSelect value={statuses[student.id] ?? ""} onValueChange={(value) => setStudentStatus(student.id, statuses[student.id] === value ? "UNMARKED" : value as Status)} options={options(english, isClassroomPage)} english={english} variant="buttons" />}
                      </td>
                      <td className="w-[30%] min-w-[18rem] max-w-[30rem] overflow-hidden px-4 py-3">
                        <textarea
                          value={notes[student.id] ?? ""}
                          disabled={statuses[student.id] === "LEFT_WITH_PERMISSION"}
                          onChange={(event) =>
                            setNotes((current) => ({
                              ...current,
                              [student.id]: event.target.value,
                            }))
                          }
                          rows={2}
                          className="block min-h-16 w-full max-w-full resize-y rounded-lg border px-3 py-1.5 text-sm leading-6 break-words dark:bg-slate-900"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
        {!visibleDivisions.length && (
          <p className="py-12 text-center text-slate-500">{text.empty}</p>
        )}
      </main>
      <EditAttendanceModal
        open={editModalOpen}
        studentName={editingRecord?.studentName ?? ""}
        date={editingRecord?.date ?? date}
        currentStatus={editingRecord?.status ?? "UNMARKED"}
        currentNotes={editingRecord?.notes ?? ""}
        attendanceId={editingRecord?.id ?? ""}
        studentId={editingRecord?.studentId ?? ""}
        userId={session?.id ?? ""}
        onClose={() => {
          setEditModalOpen(false);
          setEditingRecord(null);
        }}
        onSaved={() => {
          setAttendanceRevision((prev) => prev + 1);
          void invalidateCached(`attendance:${date}:${selectedDivision}`);
        }}
      />
      {saving &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="pointer-events-auto fixed inset-0 z-[9999] flex h-screen w-screen cursor-wait select-none flex-col items-center justify-center bg-background/80 p-6 backdrop-blur-sm"
            role="status"
            aria-live="polite"
            onPointerDown={(event) => event.preventDefault()}
          >
            <div className="pointer-events-none flex w-[min(380px,calc(100vw-2rem))] flex-col items-center gap-4 rounded-2xl border-2 border-emerald-500/30 bg-card px-6 py-7 text-center text-card-foreground shadow-2xl">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
              <div className="flex w-full items-center justify-between gap-4"><p className="text-base font-bold">جاري حفظ سجل الحضور...</p><strong className="text-xl tabular-nums text-emerald-600 dark:text-emerald-400">{progress}%</strong></div>
              <div dir="ltr" className="h-5 w-full overflow-hidden rounded-full border-2 border-emerald-600/40 bg-slate-200 shadow-inner dark:bg-slate-800" role="progressbar" aria-label={`Progress ${progress}%`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
                <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
