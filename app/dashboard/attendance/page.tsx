"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarCheck, Check, FileText, Loader2, Save, X } from "lucide-react";
import { AttendanceStatusSelect } from "@/components/ui/attendance-status-select";
import { useLanguage } from "@/components/language-provider";
import { getCurrentProfile, getSession } from "@/lib/auth";
import { exportAttendanceWorkbook } from "@/lib/export-attendance-fixed";
import { useToast } from "@/components/toast-provider";
import { notifyPdfComingSoon, runExport } from "@/lib/export-feedback";
import { fetchCached, invalidateCached } from "@/lib/client-cache";
import { AttendanceLogsModal, type AttendanceLogRow } from "@/components/attendance/attendance-logs-modal";
import { StudentAttendanceModal } from "@/components/attendance/student-attendance-modal";

type Status =
  | "UNMARKED"
  | "PRESENT"
  | "ABSENT_EXCUSED"
  | "ABSENT_UNEXCUSED"
  | "LATE"
  | "OTHER";
type Student = {
  id: string;
  studentId?: string;
  academicId?: string | null;
  nationalId?: string | null;
  fullName: string;
  divisionCode?: string | null;
  gradeLevel?: number | null;
  status?: Status;
  notes?: string;
};
type DivisionGroup = {
  code: string;
  grade: number | null;
  students: Student[];
};

const options = (english: boolean) => [
  { value: "PRESENT", label: english ? "Present" : "حاضر" },
  { value: "ABSENT_UNEXCUSED", label: english ? "Absent" : "غائب" },
  { value: "ABSENT_EXCUSED", label: english ? "Excused" : "غياب بعذر" },
  { value: "LATE", label: english ? "Late" : "متأخر" },
];

export default function AttendancePage() {
  const { dir, locale, t } = useLanguage();
  const { showToast, updateToast } = useToast();
  const english = locale === "en";
  const session = getSession();
  const profile = getCurrentProfile();
  const isTeacher = session?.role === "TEACHER";
  const canExportAttendanceTemplates = Boolean(session);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [mode, setMode] = useState<"SCHOOL" | "CLASS">(
    isTeacher ? "CLASS" : "SCHOOL",
  );
  const [students, setStudents] = useState<Student[]>([]);
  const [statuses, setStatuses] = useState<Record<string, Status | null>>({});
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
  const [exportType, setExportType] = useState<"EXCEL" | "PDF">("EXCEL");
  const [isExporting, setIsExporting] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const [selectedLogStudent, setSelectedLogStudent] = useState<AttendanceLogRow | null>(null);
  const studentsRequestRef = useRef<string | null>(null);
  const attendanceRequestRef = useRef<string | null>(null);
  const hasFetchedRef = useRef<string | null>(null);
  const [attendanceLoadedKey, setAttendanceLoadedKey] = useState<string | null>(null);
  const initialAttendanceMapRef = useRef<Map<string, { status: Status; note: string }>>(new Map());
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    if (saving) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [saving]);
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
        .filter((code) => !isTeacher || assigned.includes(code))
        .sort((a, b) => a.localeCompare(b, "en", { numeric: true }))
        .map((code) => ({
          code,
          grade:
            students.find((student) => student.divisionCode === code)
              ?.gradeLevel ?? null,
          students: students.filter((student) => student.divisionCode === code),
        })),
    [students, isTeacher, assigned],
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
        const responses = isTeacher
          ? await Promise.all(
              assigned.map((code) =>
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
    if (isTeacher && !assigned.length) {
      setStudents([]);
      setLoadingStudents(false);
    }
    else void load().catch(() => setMessage("تعذر تحميل الحضور."));
  }, [
    isTeacher,
    assigned.join(","),
    session?.id,
    session?.role,
    session?.name,
    profile?.id,
  ]);

  useEffect(() => {
    const requestKey = `${session?.id ?? "anonymous"}:${date}:${mode}:${divisionKey}`;
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
        if (mode === "CLASS") params.set("teacherId", session.id);
        const response = await fetchCached<{ data?: Student[] }>(`attendance:${date}:${mode}:${divisionKey}:${session.id}`, `/api/attendance?${params}`, {
          headers: { "x-thabat-user-id": session.id },
        });
        const records = response.data ?? [];
        setStatuses(Object.fromEntries(records.map((record) => [record.studentId ?? record.id, record.status ?? "UNMARKED"])));
        setNotes(Object.fromEntries(records.map((record) => [record.studentId ?? record.id, record.notes ?? ""])));
        const fetchedRecords = new Map(records.map((record) => [record.studentId ?? record.id, { status: record.status ?? "UNMARKED", note: record.notes ?? "" }]));
        initialAttendanceMapRef.current = new Map(students.flatMap((student) => {
          const record = fetchedRecords.get(student.id);
          return [[student.id, { status: record?.status ?? "UNMARKED", note: record?.note ?? "" }]];
        }));
      } finally {
        setLoadingAttendance(false);
        setAttendanceLoadedKey(requestKey);
      }
    };
    void load().catch(() => setMessage("تعذر تحميل الحضور."));
  }, [date, mode, divisionKey, session?.id]);

  const setStudentStatus = (studentId: string, status: Status) =>
    setStatuses((current) => ({ ...current, [studentId]: status }));
  const setDivisionStatus = (code: string, status: Status) =>
    setStatuses((current) => ({
      ...current,
      ...Object.fromEntries(
        students
          .filter((student) => student.divisionCode === code)
          .map((student) => [student.id, status]),
      ),
    }));
  const setMasterStatus = (status: Status) =>
    setStatuses((current) => ({
      ...current,
      ...Object.fromEntries(students.map((student) => [student.id, status])),
    }));
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
            markedBy: session.id,
            records: chunks[index].map((record) => ({ ...record, notes: record.note })),
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
    );
  const exportEmptyAttendanceTemplates = exportExcel;
  const handleExport = () => {
    if (!attendanceTemplateDivisions.length) return;
    if (exportType === "PDF") notifyPdfComingSoon(showToast);
    else {
      setIsExporting(true);
      void runExport(exportExcel, showToast, updateToast).finally(() => setIsExporting(false));
    }
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

        const attendanceKey = `${session?.id ?? "anonymous"}:${date}:${mode}:${divisionKey}`;
        const isLoading = loadingStudents || loadingAttendance || (Boolean(students.length && divisions.length && session?.id) && attendanceLoadedKey !== attendanceKey);

  return (
    <div className="attendance-page space-y-6" dir={dir}>
      <header className="isolate sticky top-0 z-30 -mx-4 overflow-hidden border-b border-slate-200 bg-slate-50 px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-950 md:top-2 md:-mx-6 md:px-6 md:py-4">
        <div className="flex flex-wrap items-center justify-between gap-2 md:gap-4">
          <div className="flex items-center gap-2 md:gap-3">
            <CalendarCheck className="h-6 w-6 text-emerald-600 md:h-7 md:w-7" />
            <h1 className="text-xl font-bold md:text-2xl">{text.title}</h1>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 md:flex md:w-auto md:flex-wrap">
            <input
              aria-label={text.date}
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="col-span-2 min-w-0 rounded-lg border px-3 py-2 text-sm dark:bg-slate-900 md:col-span-1"
            />
            <button
              type="button"
              onClick={() => setMode(mode === "SCHOOL" ? "CLASS" : "SCHOOL")}
              className="min-w-0 rounded-lg border border-slate-300 px-2 py-2 text-xs dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 md:px-3 md:text-sm"
            >
              {mode === "SCHOOL" ? text.school : text.class}
            </button>
            <button
              type="button"
              onClick={() => setMasterStatus("PRESENT")}
              className="min-w-0 rounded-lg bg-emerald-600 px-2 py-2 text-xs text-white hover:bg-emerald-500 md:px-3 md:text-sm"
            >
              {text.masterPresent}
            </button>
            <button
              type="button"
              onClick={() => setMasterStatus("ABSENT_UNEXCUSED")}
              className="min-w-0 rounded-lg border border-red-300 px-2 py-2 text-xs text-red-700 hover:bg-red-950/40 dark:border-red-400 dark:text-red-300 md:px-3 md:text-sm"
            >
              {text.masterAbsent}
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving || !divisions.length}
              className="inline-flex min-w-0 items-center justify-center gap-1 rounded-lg bg-slate-900 px-2 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white md:gap-2 md:px-4 md:text-sm"
            >
              <Save className="h-4 w-4" />
              {saving ? text.saving : text.save}
            </button>
            <button type="button" onClick={() => setLogsOpen(true)} className="inline-flex min-w-0 items-center justify-center gap-1 rounded-lg border border-emerald-600 px-2 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 md:gap-2 md:px-4 md:text-sm">
              {english ? "Attendance logs" : "سجل الحضور"}
            </button>
          </div>
        </div>
        <div className="mt-2 flex max-w-full items-center gap-1.5 overflow-x-auto pb-0.5 md:mt-3 md:flex-wrap md:gap-2 md:overflow-visible">
          <span className="shrink-0 text-xs font-semibold md:text-sm">{text.skip}</span>
          <button
            type="button"
            onClick={() => setSelectedDivision("ALL")}
            className={`shrink-0 rounded-full border px-2.5 py-1 text-xs dark:border-slate-500 dark:text-slate-100 md:px-3 md:py-1.5 md:text-sm ${selectedDivision === "ALL" ? "border-emerald-600 bg-emerald-600 text-white" : "hover:border-emerald-400 dark:hover:border-emerald-300"}`}
          >
            {text.all}
          </button>
          {divisions.map((group) => (
            <button
              key={group.code}
              type="button"
              onClick={() => {
                setSelectedDivision(group.code);
                document
                  .getElementById(`division-${group.code}`)
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
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
      <AttendanceLogsModal open={logsOpen} onClose={() => setLogsOpen(false)} english={english} onStudentClick={(student) => { setLogsOpen(false); setSelectedLogStudent(student); }} />
      {selectedLogStudent && <StudentAttendanceModal open={true} onClose={() => setSelectedLogStudent(null)} studentId={selectedLogStudent.studentId} studentName={selectedLogStudent.studentName} />}
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
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <table className="min-w-[58rem] w-full table-fixed text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr>
                    <th className="w-[24%] px-4 py-3 text-start">{text.student}</th>
                    <th className="w-[48%] px-4 py-3 text-start">{text.status}</th>
                    <th className="w-[28%] px-4 py-3 text-start">{text.notes}</th>
                  </tr>
                </thead>
                <tbody>
                  {group.students.map((student) => (
                    <tr
                      key={student.id}
                      className="border-t border-slate-200 dark:border-slate-800"
                    >
                      <td className="w-[24%] px-4 py-3 font-medium">
                        {student.fullName}
                      </td>
                      <td className="w-[48%] min-w-[28rem] px-4 py-3">
                        <AttendanceStatusSelect
                          value={statuses[student.id] ?? ""}
                          onValueChange={(value) => setStatuses((current) => ({ ...current, [student.id]: current[student.id] === value ? null : value as Status }))}
                          options={options(english)}
                          english={english}
                          variant="buttons"
                        />
                      </td>
                      <td className="w-[28%] min-w-[220px] px-4 py-3">
                        <input
                          value={notes[student.id] ?? ""}
                          onChange={(event) =>
                            setNotes((current) => ({
                              ...current,
                              [student.id]: event.target.value,
                            }))
                          }
                          className="block w-full min-w-[220px] overflow-x-auto whitespace-nowrap rounded-lg border px-3 py-1.5 text-sm leading-6 dark:bg-slate-900"
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
