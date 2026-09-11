"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, Printer, Search, Send, ShieldAlert } from "lucide-react";
import { getProfileSignature, getSession } from "@/lib/auth";
import { useLanguage } from "@/components/language-provider";
import { StyledSelect } from "@/components/ui/styled-select";
import { SignatureCanvas } from "@/components/ui/signature-canvas";

type Student = {
  id: string;
  fullName: string;
  divisionCode?: string | null;
  academicId?: string | null;
};
type User = {
  id: string;
  name: string;
  role: string;
  subjectsTaught?: string[];
  teachingAssignments?: Array<{ subject?: string }>;
};
type Referral = {
  id: string;
  studentName: string;
  divisionCode: string;
  subject: string;
  reason: string;
  incidentDate: string;
  incidentTime: string;
  location: string;
  actionTaken: string;
  vicePrincipalAction?: string | null;
  teacherNotes?: string | null;
  status: string;
  createdAt: string;
  createdBy?: { id?: string; name: string };
  recipient?: { id?: string; name: string };
};
const vpRoles = [
  "VICE_PRINCIPAL",
  "VP_STUDENT_AFFAIRS",
  "VP_ACADEMIC_AFFAIRS",
  "VP_OPERATIONS",
];
const inputClass =
  "w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/30";

function formatReferralDate(dateValue: string) {
  const date = new Date(`${dateValue}T12:00:00`);
  if (Number.isNaN(date.getTime())) return dateValue;
  const gregorian = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
  const hijri = new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
  return `${gregorian} ميلادي | ${hijri} هـ`;
}

export default function TeacherReferralsPage() {
  const { locale, dir } = useLanguage();
  const english = locale === "en";
  const session = getSession();
  const isTeacher = session?.role === "TEACHER";
  const [students, setStudents] = useState<Student[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [signature, setSignature] = useState<string | null>(
    getProfileSignature(),
  );
  const [studentId, setStudentId] = useState("");
  const [recipientId, setRecipientId] = useState("");
  const [subject, setSubject] = useState("");
  const [search, setSearch] = useState("");
  const [studentPickerOpen, setStudentPickerOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [incidentDate, setIncidentDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [incidentTime, setIncidentTime] = useState(
    new Date().toTimeString().slice(0, 5),
  );
  const [location, setLocation] = useState("");
  const [actionTaken, setActionTaken] = useState("");
    const [administrativeAction, setAdministrativeAction] = useState("");
  const [teacherNotes, setTeacherNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [savingAdministrativeActionId, setSavingAdministrativeActionId] = useState<string | null>(null);
  const [expandedReferralId, setExpandedReferralId] = useState<string | null>(null);
  const [printingReferral, setPrintingReferral] = useState<Referral | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [signatureTarget, setSignatureTarget] = useState<"teacher" | "reviewer" | null>(null);
  const [teacherPrintSignatureOverride, setTeacherPrintSignatureOverride] = useState<string | null>(null);
  const [reviewerPrintSignatureOverride, setReviewerPrintSignatureOverride] = useState<string | null>(null);

  const teacher = users.find((user) => user.id === session?.id);
  const vicePrincipals = users.filter((user) => vpRoles.includes(user.role));
  const subjects = Array.from(
    new Set(
      [
        ...(teacher?.subjectsTaught ?? []),
        ...(teacher?.teachingAssignments ?? []).map(
          (assignment) => assignment.subject ?? "",
        ),
      ].filter(Boolean),
    ),
  );
  const selectedStudent = students.find((student) => student.id === studentId);
  const visibleStudents = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return students.filter(
      (student) =>
        !query ||
        `${student.fullName} ${student.academicId ?? ""} ${student.divisionCode ?? ""}`
          .toLocaleLowerCase()
          .includes(query),
    );
  }, [students, search]);
  const labels = english
    ? {
        title: "Student referral",
        intro: isTeacher
          ? "Complete the classroom referral for the selected vice principal."
          : "Review teacher referrals and print submitted forms.",
        form: "Referral form",
        student: "Student",
        recipient: "Vice principal",
        subject: "Subject",
        reason: "Reason for referral",
        date: "Incident date",
        time: "Incident time",
        location: "Location",
        action: "Action taken by the teacher before referral",
        notes: "Additional teacher notes",
        submit: "Send to vice principal",
        log: isTeacher ? "My referral history" : "Incoming referrals",
        print: "Print form",
        printPreview: "Print preview",
        close: "Close",
        teacherSignature: "Teacher signature",
        reviewerSignature: "Vice principal / admin signature",
        signatureRequired: "Signature required",
        removeSignature: "Remove signature",
        review: "Review",
        reviewed: "Reviewed",
        cancelOwn: "Cancel referral",
        delete: "Delete referral",
        cancelTransfer: "Cancel transfer",
        cancelled: "Cancelled",
        empty: "No referrals yet.",
        updateFailed: "Unable to update the referral.",
      }
    : {
        title: "إحالة طالب لوكيل المدرسة",
        intro: isTeacher
          ? "أكمل نموذج الإحالة لوكيل المدرسة المختار."
          : "مراجعة إحالات المعلمين وطباعة النماذج.",
        form: "نموذج الإحالة",
        student: "الطالب",
        recipient: "وكيل المدرسة",
        subject: "المادة",
        reason: "سبب الإحالة",
        date: "تاريخ الواقعة",
        time: "وقت الواقعة",
        location: "المكان",
        action: "الإجراء الذي اتخذه المعلم قبل إرسال الإحالة",
        notes: "ملاحظات إضافية من المعلم",
        submit: "إرسال إلى وكيل المدرسة",
        log: isTeacher ? "سجل إحالاتي" : "الإحالات الواردة",
        print: "طباعة النموذج",
        printPreview: "معاينة الطباعة",
        close: "إغلاق",
        teacherSignature: "توقيع المعلم",
        reviewerSignature: "توقيع وكيل المدرسة / الإدارة",
        signatureRequired: "التوقيع مطلوب",
        removeSignature: "إزالة التوقيع",
        review: "مراجعة",
        reviewed: "تمت المراجعة",
        cancelOwn: "إلغاء الإحالة",
        delete: "حذف الإحالة",
        cancelTransfer: "إلغاء التحويل",
        cancelled: "ملغاة",
        empty: "لا توجد إحالات بعد.",
        updateFailed: "تعذر تحديث الإحالة.",
      };

  const load = async () => {
    const headers = session?.id
      ? { "x-thabat-user-id": session.id }
      : undefined;
    const [studentResponse, referralResponse, usersResponse] =
      await Promise.all([
        fetch("/api/students", { headers, cache: "no-store" }),
        fetch("/api/teacher-referrals", { headers, cache: "no-store" }),
        fetch("/api/users", { cache: "no-store" }),
      ]);
    const studentJson = (await studentResponse.json()) as { data?: Student[] };
    const referralJson = (await referralResponse.json()) as {
      data?: Referral[];
    };
    const usersJson = (await usersResponse.json()) as { data?: User[] };
    setStudents(studentJson.data ?? []);
    setReferrals(referralJson.data ?? []);
    setUsers(usersJson.data ?? []);
    const currentTeacher = usersJson.data?.find(
      (user) => user.id === session?.id,
    );
    const nextSubjects = Array.from(
      new Set(
        [
          ...(currentTeacher?.subjectsTaught ?? []),
          ...(currentTeacher?.teachingAssignments ?? []).map(
            (assignment) => assignment.subject ?? "",
          ),
        ].filter(Boolean),
      ),
    );
    setSubject((current) => current || nextSubjects[0] || "");
  };
  useEffect(() => {
    setLoading(true);
    setSignature(getProfileSignature());
    void load()
      .catch(() => {
        setStudents([]);
        setReferrals([]);
        setUsers([]);
      })
      .finally(() => setLoading(false));
  }, [session?.id]);

  const submit = async () => {
    if (
      !studentId ||
      !recipientId ||
      !subject ||
      !reason.trim() ||
      !location.trim() ||
      !actionTaken.trim()
    ) {
      setMessage(
        english
          ? "Complete all required fields."
          : "أكمل جميع الحقول المطلوبة.",
      );
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/teacher-referrals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.id ? { "x-thabat-user-id": session.id } : {}),
        },
        body: JSON.stringify({
          studentId,
          recipientId,
          subject,
          reason,
          incidentDate,
          incidentTime,
          location,
          actionTaken,
          teacherNotes,
        }),
      });
      if (!response.ok) throw new Error();
      setReason("");
      setLocation("");
      setActionTaken("");
      setTeacherNotes("");
      await load();
      setMessage(
        english ? "Referral sent successfully." : "تم إرسال الإحالة بنجاح.",
      );
    } catch {
      setMessage(
        english ? "Unable to send the referral." : "تعذر إرسال الإحالة.",
      );
    } finally {
      setBusy(false);
    }
  };
  const updateReferral = async (
    id: string,
    action: "reviewed" | "cancelled",
  ) => {
    if (action !== "reviewed") return;
    setReviewingId(id);
    setMessage("");
    try {
      const response = await fetch("/api/teacher-referrals", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(session?.id ? { "x-thabat-user-id": session.id } : {}),
        },
        body: JSON.stringify({ id, action }),
      });
      if (!response.ok) throw new Error();
      setReferrals((current) =>
        current.map((referral) =>
          referral.id === id ? { ...referral, status: "REVIEWED" } : referral,
        ),
      );
      setMessage(english ? "Referral marked as reviewed." : "تم تحديد الإحالة كمراجعة.");
    } catch {
      setMessage(labels.updateFailed);
    } finally {
      setReviewingId(null);
    }
  };
  const saveAdministrativeAction = async (id: string) => {
    if (!administrativeAction.trim()) return;
    setSavingAdministrativeActionId(id);
    setMessage("");
    try {
      const response = await fetch("/api/teacher-referrals", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(session?.id ? { "x-thabat-user-id": session.id } : {}),
        },
        body: JSON.stringify({ id, action: "updateAdministrativeAction", administrativeAction }),
      });
      if (!response.ok) throw new Error();
      setReferrals((current) =>
        current.map((referral) =>
          referral.id === id
            ? { ...referral, vicePrincipalAction: administrativeAction.trim(), status: "REVIEWED" }
            : referral,
        ),
      );
      setMessage(english ? "Administrative action saved." : "تم حفظ إجراءات وكيل الشؤون الطلابية.");
    } catch {
      setMessage(labels.updateFailed);
    } finally {
      setSavingAdministrativeActionId(null);
    }
  };
  const canCancelTransfer = Boolean(
    session &&
    [
      "VICE_PRINCIPAL",
      "VP_STUDENT_AFFAIRS",
      "VP_ACADEMIC_AFFAIRS",
      "VP_OPERATIONS",
      "PRINCIPAL",
      "CURATOR",
    ].includes(session.role),
  );
  const canReviewReferral = Boolean(
    session &&
    [
      "VICE_PRINCIPAL",
      "VP_STUDENT_AFFAIRS",
      "VP_ACADEMIC_AFFAIRS",
      "VP_OPERATIONS",
      "PRINCIPAL",
      "CREATOR",
      "CURATOR",
    ].includes(session.role),
  );
  const canDeleteReferral = Boolean(
    session &&
    [
      "VICE_PRINCIPAL",
      "VP_STUDENT_AFFAIRS",
      "VP_ACADEMIC_AFFAIRS",
      "VP_OPERATIONS",
      "PRINCIPAL",
      "CREATOR",
      "CURATOR",
    ].includes(session.role),
  );
  const isTransferred = (status: string) =>
    ["TRANSFERRED", "REFERRED", "NEW"].includes(status);
  const handleCancelTransfer = async (referralId: string) => {
    if (!window.confirm(english ? "Are you sure you want to cancel this transfer?" : "هل أنت متأكد من إلغاء هذا التحويل؟")) return;
    setCancellingId(referralId);
    setMessage("");
    try {
      const response = await fetch("/api/teacher-referrals", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(session?.id ? { "x-thabat-user-id": session.id } : {}),
        },
        body: JSON.stringify({ id: referralId, action: "cancelTransfer" }),
      });
      if (!response.ok) throw new Error();
      setReferrals((current) =>
        current.map((referral) =>
          referral.id === referralId
            ? { ...referral, status: "CANCELLED" }
            : referral,
        ),
      );
      setMessage(english ? "Transfer cancelled." : "تم إلغاء التحويل.");
    } catch {
      setMessage(labels.updateFailed);
    } finally {
      setCancellingId(null);
    }
  };
  const handleCancelOwn = async (referralId: string) => {
    if (!window.confirm(english ? "Are you sure you want to cancel this referral? It will be removed and will not remain in your history." : "هل أنت متأكد من إلغاء هذه الإحالة؟ ستتم إزالتها ولن تبقى في سجلك.")) return;
    setCancellingId(referralId);
    setMessage("");
    try {
      const response = await fetch("/api/teacher-referrals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(session?.id ? { "x-thabat-user-id": session.id } : {}) },
        body: JSON.stringify({ id: referralId, action: "cancelOwn" }),
      });
      if (!response.ok) throw new Error();
      setReferrals((current) => current.filter((referral) => referral.id !== referralId));
      setMessage(english ? "Referral cancelled." : "تم إلغاء الإحالة.");
    } catch { setMessage(labels.updateFailed); } finally { setCancellingId(null); }
  };
  const handleDeleteReferral = async (referralId: string) => {
    setDeletingId(referralId);
    setMessage("");
    try {
      const response = await fetch("/api/teacher-referrals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(session?.id ? { "x-thabat-user-id": session.id } : {}) },
        body: JSON.stringify({ id: referralId, action: "delete" }),
      });
      if (!response.ok) throw new Error();
      setReferrals((current) => current.filter((referral) => referral.id !== referralId));
      setMessage(english ? "Referral deleted." : "تم حذف الإحالة.");
    } catch { setMessage(labels.updateFailed); } finally { setDeletingId(null); }
  };
  const printReferral = (referral: Referral) => {
    setTeacherPrintSignatureOverride(null);
    setReviewerPrintSignatureOverride(null);
    setPrintingReferral(referral);
  };
  const handlePrint = () => window.print();

  const teacherPrintSignature = teacherPrintSignatureOverride ?? (printingReferral
    ? printingReferral.createdBy?.id === session?.id
      ? signature
      : printingReferral.createdBy?.id
        ? getProfileSignature(printingReferral.createdBy.id)
        : null
    : null);
  const reviewerPrintSignature = reviewerPrintSignatureOverride ?? (printingReferral && session?.role !== "TEACHER"
    ? getProfileSignature(session?.id)
    : null);

  if (loading)
    return (
      <div className="space-y-5" dir={dir} aria-busy="true">
        <div className="h-32 animate-pulse rounded-2xl bg-muted" />
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <div className="h-6 w-48 animate-pulse rounded bg-muted" />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-11 animate-pulse rounded-xl bg-muted" />
            <div className="h-11 animate-pulse rounded-xl bg-muted" />
            <div className="h-11 animate-pulse rounded-xl bg-muted" />
            <div className="h-11 animate-pulse rounded-xl bg-muted" />
            <div className="h-28 animate-pulse rounded-xl bg-muted md:col-span-2" />
          </div>
        </div>
        <div className="h-48 animate-pulse rounded-2xl bg-muted" />
      </div>
    );

  return (
    <>
    <div className="print-dashboard space-y-6 print:hidden" dir={dir}>
      <header className="rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white">
            <ShieldAlert className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-primary">
              {english ? "Student conduct" : "سلوك الطلاب"}
            </p>
            <h1 className="text-3xl font-bold">{labels.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{labels.intro}</p>
          </div>
        </div>
      </header>
      {isTeacher && (
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">{labels.form}</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold md:col-span-2">
              {labels.student}
              <div className="relative mt-1">
                <Search className="absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  value={search}
                  onFocus={() => setStudentPickerOpen(true)}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setStudentPickerOpen(true);
                  }}
                  onBlur={() => setTimeout(() => setStudentPickerOpen(false), 150)}
                  placeholder={
                    english
                      ? "Search by student name, academic ID, or division"
                      : "ابحث باسم الطالب أو الرقم الأكاديمي أو الشعبة"
                  }
                  aria-label={english ? "Student search" : "البحث عن طالب"}
                  className={`${inputClass} ps-9`}
                />
                {studentPickerOpen && search && (
                  <div className="absolute inset-x-0 top-12 z-20 max-h-56 overflow-auto rounded-xl border border-border bg-card p-1 shadow-xl">
                    {visibleStudents.map((student) => (
                      <button
                        key={student.id}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          setStudentId(student.id);
                          setSearch(student.fullName);
                          setStudentPickerOpen(false);
                        }}
                        className="flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2 text-start text-sm hover:bg-muted"
                      >
                        <span className="font-semibold">{student.fullName}</span>
                        <span className="text-end text-xs text-muted-foreground">
                          {student.academicId ??
                            (english ? "No academic ID" : "لا يوجد رقم أكاديمي")}
                          <br />
                          {student.divisionCode ??
                            (english ? "No division" : "لا توجد شعبة")}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedStudent && (
                <span className="mt-2 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {selectedStudent.fullName} · {selectedStudent.academicId ??
                    (english ? "No academic ID" : "لا يوجد رقم أكاديمي")} · {selectedStudent.divisionCode ??
                    (english ? "No division" : "لا توجد شعبة")}
                </span>
              )}
            </label>
            <label className="text-sm font-semibold md:col-span-2">
              {labels.recipient}
              <StyledSelect
                value={recipientId}
                onValueChange={setRecipientId}
                placeholder={
                  english ? "Choose a vice principal" : "اختر وكيل المدرسة"
                }
                options={vicePrincipals.map((user) => ({
                  value: user.id,
                  label: user.name,
                }))}
                className="mt-1"
              />
            </label>
            <label className="text-sm font-semibold">
              {labels.subject}
              <StyledSelect
                value={subject}
                onValueChange={setSubject}
                placeholder={english ? "Choose a subject" : "اختر المادة"}
                options={subjects.map((item) => ({ value: item, label: item }))}
                className="mt-1"
              />
            </label>
            <label className="text-sm font-semibold">
              {labels.location}
              <input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                className={`${inputClass} mt-1`}
              />
            </label>
            <label className="text-sm font-semibold">
              {labels.date}
              <input
                type="date"
                value={incidentDate}
                onChange={(event) => setIncidentDate(event.target.value)}
                className={`${inputClass} mt-1`}
              />
            </label>
            <label className="text-sm font-semibold">
              {labels.time}
              <input
                type="time"
                value={incidentTime}
                onChange={(event) => setIncidentTime(event.target.value)}
                className={`${inputClass} mt-1`}
              />
            </label>
            <label className="text-sm font-semibold md:col-span-2">
              {labels.reason}
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder={
                  english
                    ? "Describe what happened factually"
                    : "صف ما حدث بوضوح وموضوعية"
                }
                className={`${inputClass} mt-1 min-h-28`}
              />
            </label>
            <label className="text-sm font-semibold md:col-span-2">
              {labels.action}
              <textarea
                value={actionTaken}
                onChange={(event) => setActionTaken(event.target.value)}
                placeholder={
                  english
                    ? "What did you do as the teacher before sending this referral?"
                    : "ماذا فعلت بصفتك المعلم قبل إرسال هذه الإحالة؟"
                }
                className={`${inputClass} mt-1 min-h-24`}
              />
            </label>
            <label className="text-sm font-semibold md:col-span-2">
              {labels.notes}
              <textarea
                value={teacherNotes}
                onChange={(event) => setTeacherNotes(event.target.value)}
                placeholder={
                  english
                    ? "Optional additional context"
                    : "معلومات إضافية اختيارية"
                }
                className={`${inputClass} mt-1 min-h-20`}
              />
            </label>
          </div>
          <div className="mt-5 flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{message}</p>
            <button
              type="button"
              disabled={busy}
              onClick={() => void submit()}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-white disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              {busy
                ? english
                  ? "Sending..."
                  : "جارٍ الإرسال..."
                : labels.submit}
            </button>
          </div>
        </section>
      )}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">{labels.log}</h2>
        </div>
        {referrals.length ? (
          <div className="space-y-3">
            {referrals.map((referral) => (
              <article
                key={referral.id}
                className="rounded-xl border border-border p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold">
                      {referral.studentName} · {referral.divisionCode}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {referral.subject} · {referral.incidentDate}{" "}
                      {referral.incidentTime}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-primary">
                      {english ? "Teacher" : "المعلم"}: {referral.createdBy?.name ?? (english ? "Unknown" : "غير معروف")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => printReferral(referral)}
                      className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted"
                    >
                      <Printer className="h-4 w-4" />
                      {labels.print}
                    </button>
                    {canReviewReferral && (
                      <button
                        type="button"
                        disabled={reviewingId === referral.id}
                        onClick={() => {
                          setExpandedReferralId((current) =>
                            current === referral.id ? null : referral.id,
                          );
                          setAdministrativeAction(referral.vicePrincipalAction ?? "");
                          if (referral.status !== "REVIEWED") {
                            void updateReferral(referral.id, "reviewed");
                          }
                        }}
                        className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {reviewingId === referral.id
                          ? english
                            ? "Saving..."
                            : "جارٍ الحفظ..."
                          : referral.status === "REVIEWED"
                            ? english
                              ? "Reviewed"
                              : "تمت المراجعة"
                            : labels.review}
                      </button>
                    )}
                    {canCancelTransfer && isTransferred(referral.status) && (
                      <button
                        type="button"
                        disabled={cancellingId === referral.id}
                        onClick={() => void handleCancelTransfer(referral.id)}
                        className="rounded-lg border border-red-700 bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm shadow-red-900/20 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {cancellingId === referral.id
                          ? english
                            ? "Cancelling..."
                            : "جارٍ الإلغاء..."
                          : labels.cancelTransfer}
                      </button>
                    )}
                    {isTeacher && isTransferred(referral.status) && referral.createdBy?.id === session?.id && (
                      <button
                        type="button"
                        disabled={cancellingId === referral.id}
                        onClick={() => void handleCancelOwn(referral.id)}
                        className="rounded-lg border border-red-700 bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm shadow-red-900/20 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {cancellingId === referral.id ? (english ? "Cancelling..." : "جارٍ الإلغاء...") : labels.cancelOwn}
                      </button>
                    )}
                    {canDeleteReferral && (
                      <button
                        type="button"
                        disabled={deletingId === referral.id}
                        onClick={() => void handleDeleteReferral(referral.id)}
                        className="rounded-lg border border-destructive/60 px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deletingId === referral.id ? (english ? "Deleting..." : "جارٍ الحذف...") : labels.delete}
                      </button>
                    )}
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  {referral.reason}
                </p>
                {expandedReferralId === referral.id && (
                  <div className="mt-4 grid gap-3 rounded-xl border border-border bg-muted/30 p-4 text-sm md:grid-cols-2">
                    <p><span className="font-semibold">{labels.location}: </span>{referral.location}</p>
                    <p><span className="font-semibold">{labels.action}: </span>{referral.actionTaken}</p>
                    {canReviewReferral && (
                      <div className="md:col-span-2">
                        <label className="font-semibold" htmlFor={`administrative-action-${referral.id}`}>إجراءات وكيل الشؤون الطلابية</label>
                        <textarea
                          id={`administrative-action-${referral.id}`}
                          value={administrativeAction}
                          onChange={(event) => setAdministrativeAction(event.target.value)}
                          className={`${inputClass} mt-1 min-h-24`}
                          placeholder="يعبئ وكيل الشؤون الطلابية القرار أو الإجراء المتخذ"
                        />
                        <button
                          type="button"
                          disabled={savingAdministrativeActionId === referral.id || !administrativeAction.trim()}
                          onClick={() => void saveAdministrativeAction(referral.id)}
                          className="mt-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {savingAdministrativeActionId === referral.id ? "جارٍ الحفظ..." : "حفظ الإجراءات"}
                        </button>
                      </div>
                    )}
                    <p><span className="font-semibold">{english ? "Teacher" : "المعلم"}: </span>{referral.createdBy?.name ?? (english ? "Unknown" : "غير معروف")}</p>
                    <p><span className="font-semibold">{english ? "Status" : "الحالة"}: </span>{referral.status === "REVIEWED" ? labels.reviewed : referral.status}</p>
                    {referral.teacherNotes && <p className="md:col-span-2"><span className="font-semibold">{labels.notes}: </span>{referral.teacherNotes}</p>}
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            {labels.empty}
          </p>
        )}
      </section>
    </div>
    {printingReferral && (
      <div className="print-document fixed inset-0 z-[100] overflow-y-auto bg-slate-950/60 p-4" dir="rtl">
        <div className="relative mx-auto max-w-4xl overflow-hidden bg-white p-6 text-slate-900 shadow-2xl print:block print:max-w-none print:p-0 print:shadow-none">
          <div className="printable-referral relative min-h-[1120px] overflow-hidden bg-white text-black">
          <img src="/image.png" alt="" className="template-background pointer-events-none absolute inset-0 h-full w-full object-cover" aria-hidden="true" />
          <div className="relative z-10 px-6 pb-24 pt-40">
          <div className="print-toolbar mb-5 flex items-center justify-between gap-3 border-b border-slate-200 pb-4 print:hidden">
            <h2 className="text-lg font-bold">{labels.printPreview}</h2>
            <div className="flex gap-2">
              <button type="button" onClick={handlePrint} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">{labels.print}</button>
              <button type="button" onClick={() => setPrintingReferral(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">{labels.close}</button>
            </div>
          </div>
        <header className="border-b-2 border-black pb-4 text-center">
          <h1 className="text-2xl font-bold text-black">استمارة تحويل طالب إلى وكيل الشؤون الطلابية</h1>
        </header>
        <h2 className="print-section-title mt-6 text-lg font-bold text-black">بيانات الطالب والإحالة</h2>
        <div className="grid grid-cols-2 overflow-hidden border border-black">
          {[
            ["اسم الطالب", printingReferral.studentName],
            ["الشعبة", printingReferral.divisionCode],
            ["التاريخ / Date", formatReferralDate(printingReferral.incidentDate)],
            ["الوقت", printingReferral.incidentTime],
            ["المعلم المحول", printingReferral.createdBy?.name ?? ""],
            ["المادة / المكان", `${printingReferral.subject} / ${printingReferral.location}`],
          ].map(([label, value]) => <div key={label} className="border border-black p-3 text-sm"><b>{label}:</b> {value || "-"}</div>)}
          </div>
        <section className="break-inside-avoid"><h2 className="mt-6 text-lg font-bold text-black">سبب التحويل / نوع المخالفة</h2><div className="min-h-24 whitespace-pre-wrap border border-black p-3 text-sm">{printingReferral.reason || "-"}</div></section>
        <section className="break-inside-avoid"><h2 className="mt-6 text-lg font-bold text-black">إجراءات وكيل الشؤون الطلابية</h2><div className="min-h-28 whitespace-pre-wrap border border-black p-3 text-sm">{printingReferral.vicePrincipalAction || ""}</div>{printingReferral.teacherNotes && <p className="mt-2 whitespace-pre-wrap text-sm"><b>ملاحظات المعلم:</b> {printingReferral.teacherNotes}</p>}</section>
        <div className="mt-14 grid grid-cols-2 gap-8 border-t border-slate-300 pt-6 text-sm break-inside-avoid">
          <div><button type="button" onClick={() => setSignatureTarget("teacher")} className="block min-h-32 w-full border border-black p-3 text-start print:border-black"><span className="font-bold">توقيع المعلم</span>{teacherPrintSignature ? <img src={teacherPrintSignature} alt="توقيع المعلم" className="print-signature mt-2 h-20 max-w-[220px] object-contain" /> : <span className="mt-8 block">التوقيع: ____________________</span>}</button>{teacherPrintSignature && <button type="button" onClick={() => setTeacherPrintSignatureOverride("")} className="mt-2 text-xs font-semibold text-red-600 hover:text-red-700 print:hidden">{labels.removeSignature}</button>}<p className="mt-3 border-t border-black pt-2">الاسم: {printingReferral.createdBy?.name ?? ""}</p></div>
          <div><button type="button" onClick={() => setSignatureTarget("reviewer")} className="block min-h-32 w-full border border-black p-3 text-start print:border-black"><span className="font-bold">توقيع وكيل الشؤون الطلابية</span>{reviewerPrintSignature ? <img src={reviewerPrintSignature} alt="توقيع وكيل الشؤون الطلابية" className="print-signature mt-2 h-20 max-w-[220px] object-contain" /> : <span className="mt-8 block">التوقيع: ____________________</span>}</button>{reviewerPrintSignature && <button type="button" onClick={() => setReviewerPrintSignatureOverride("")} className="mt-2 text-xs font-semibold text-red-600 hover:text-red-700 print:hidden">{labels.removeSignature}</button>}<p className="mt-3 border-t border-black pt-2">الاسم: {session?.name ?? printingReferral.recipient?.name ?? ""}</p></div>
        </div>
        </div>
          </div>
          </div>
      </div>
    )}
    {signatureTarget && printingReferral && (
      <SignatureCanvas
        initialSignature={signatureTarget === "teacher" ? teacherPrintSignature : reviewerPrintSignature}
        showDefaultOption={false}
        onCancel={() => setSignatureTarget(null)}
        onSave={(value) => {
          if (signatureTarget === "teacher") setTeacherPrintSignatureOverride(value);
          else setReviewerPrintSignatureOverride(value);
          setSignatureTarget(null);
        }}
      />
    )}
    </>
  );
}
