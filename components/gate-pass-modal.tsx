"use client";

import { useMemo, useState } from "react";
import { useEffect } from "react";
import { CheckCircle2, Printer, Search } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { saveGatePass, type GatePass } from "@/lib/vp-operations";
import { getGradeLevelArabic } from "@/lib/utils";
import { useLanguage } from "@/components/language-provider";
import { getSession } from "@/lib/auth";
import QRCode from "qrcode";

type Student = {
  id: string;
  fullName: string;
  divisionCode?: string | null;
  academicId?: string | null;
  gradeLevel?: number | null;
};
const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-start text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white";

export function GatePassModal({
  students,
  initialPass,
  onClose,
  onSaved,
}: {
  students: Student[];
  initialPass?: GatePass | null;
  onClose: () => void;
  onSaved?: (pass: GatePass) => void;
}) {
  const { locale } = useLanguage();
  const text = locale === "ar" ? { management: "إدارة الخروج", title: "إصدار تصريح خروج", intro: "اختر الطالب، أدخل البيانات، ثم أصدر التصريح.", student: "الطالب", search: "ابحث بالاسم أو الرقم الأكاديمي أو الفصل", noMatches: "لا يوجد طلاب مطابقون", selected: "تم اختيار", parent: "اسم ولي الأمر", optional: "اختياري", parentPlaceholder: "اكتب اسم ولي الأمر", reason: "سبب الخروج", date: "تاريخ الخروج", time: "وقت الخروج", issue: "إصدار التصريح", print: "طباعة التصريح", close: "إغلاق", health: "حالة صحية", family: "سبب عائلي", emergency: "حالة طارئة", other: "سبب آخر", custom: "اكتب سبب الخروج", attendanceNote: "بعد الإصدار سيتم تحديث حضور الطالب تلقائياً إلى", excused: "استئذان بعذر" } : { management: "Gate pass management", title: "Issue gate pass", intro: "Choose a student, enter the details, then issue the pass.", student: "Student", search: "Search by name, academic ID, or division", noMatches: "No matching students", selected: "Selected", parent: "Parent name", optional: "optional", parentPlaceholder: "Enter parent name", reason: "Reason for leaving", date: "Departure date", time: "Departure time", issue: "Issue pass", print: "Print pass", close: "Close", health: "Health reason", family: "Family reason", emergency: "Emergency", other: "Other reason", custom: "Enter reason for leaving", attendanceNote: "After issuing, the student's attendance will automatically be updated to", excused: "Excused permission" };
  const today = new Date().toISOString().slice(0, 10);
  const [studentId, setStudentId] = useState("");
  const [search, setSearch] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [issuedPass, setIssuedPass] = useState<GatePass | null>(initialPass ?? null);
  const [qrImage, setQrImage] = useState("");
  const [form, setForm] = useState({
    parentName: "",
    reason: "طبي",
    customReason: "",
    departureDate: today,
    departureTime: new Date().toTimeString().slice(0, 5),
  });
  const student = students.find((item) => item.id === studentId);
  useEffect(() => {
    if (!issuedPass?.qrToken) return;
    void QRCode.toDataURL(issuedPass.qrToken, { width: 150, margin: 1 }).then(setQrImage).catch(() => setQrImage(""));
  }, [issuedPass]);
  useEffect(() => {
    if (!initialPass && students.length === 1) {
      setStudentId(students[0].id);
      setSearch(students[0].fullName);
    }
  }, [initialPass, students]);
  const matchingStudentGroups = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const matches = query
      ? students.filter((item) =>
          `${item.fullName} ${item.academicId ?? ""} ${item.divisionCode ?? ""}`
            .toLocaleLowerCase()
            .includes(query),
        )
      : students;
    const groups = new Map<number | null, Student[]>();
    for (const item of matches) {
      const codeGrade = item.divisionCode?.match(/^([1-3])\d{2}$/)?.[1];
      const grade = item.gradeLevel ?? (codeGrade ? Number(codeGrade) : null);
      groups.set(grade, [...(groups.get(grade) ?? []), item]);
    }
    return Array.from(groups.entries())
      .sort(([left], [right]) => (left ?? 99) - (right ?? 99))
      .map(([grade, group]) => ({
        grade,
        students: group.sort(
          (left, right) =>
            (left.divisionCode ?? "999").localeCompare(
              right.divisionCode ?? "999",
              undefined,
              { numeric: true },
            ) || left.fullName.localeCompare(right.fullName),
        ),
      }));
  }, [search, students]);
  const selectStudent = (item: Student) => {
    setStudentId(item.id);
    setSearch(item.fullName);
    setPickerOpen(false);
  };
  const submit = async () => {
    if (!student || (form.reason === "أخرى" && !form.customReason.trim()))
      return;
    const session = getSession();
    if (!session) return;
    const reason = form.reason === "أخرى" ? form.customReason.trim() : form.reason;
    const response = await fetch("/api/gate-passes", { method: "POST", headers: { "Content-Type": "application/json", "x-thabat-role": session.role }, body: JSON.stringify({ studentId, issuedBy: session.id, parentName: form.parentName, reason, departureDate: form.departureDate, departureTime: form.departureTime }) });
    if (!response.ok) return;
    const saved = await response.json() as { data: { id: string; qrToken: string; createdAt: string; status: string } };
    const pass: GatePass = { id: saved.data.id, studentId, studentName: student.fullName, divisionCode: student.divisionCode ?? "غير معين", parentName: form.parentName, reason, departureDate: form.departureDate, departureTime: form.departureTime, createdAt: saved.data.createdAt, qrToken: saved.data.qrToken, status: saved.data.status };
    saveGatePass(pass);
    onSaved?.(pass);
    setIssuedPass(pass);
  };
  return (
    <Modal
      open={true}
      onOpenChange={(open) => !open && onClose()}
      className="max-w-xl"
    >
      <div dir="rtl" className="space-y-5">
        <div>
          <p className="text-sm font-semibold text-emerald-600">{text.management}</p>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {text.title}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {text.intro}
          </p>
        </div>
        {issuedPass ? (
          <div className="space-y-4">
            <div className="printable-permit">
              <div
                id="gate-pass-print"
                className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-800 dark:bg-emerald-950/20"
              >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold tracking-widest text-emerald-700">
                    ثَبَت · THABAT
                  </p>
                  <h3 className="mt-3 text-xl font-bold">{text.title}</h3>
                </div>
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                <p>
                  <span className="text-slate-500">{text.student}:</span>{" "}
                  <strong>{issuedPass.studentName}</strong>
                </p>
                <p>
                  <span className="text-slate-500">{locale === "ar" ? "الفصل" : "Division"}:</span>{" "}
                  <strong>{issuedPass.divisionCode}</strong>
                </p>
                <p>
                  <span className="text-slate-500">{text.parent}:</span>{" "}
                  <strong>{issuedPass.parentName || (locale === "ar" ? "غير محدد" : "Unspecified")}</strong>
                </p>
                <p>
                  <span className="text-slate-500">{locale === "ar" ? "السبب" : "Reason"}:</span>{" "}
                  <strong>{issuedPass.reason}</strong>
                </p>
                <p>
                  <span className="text-slate-500">{locale === "ar" ? "التاريخ" : "Date"}:</span>{" "}
                  <strong>{issuedPass.departureDate}</strong>
                </p>
                <p>
                  <span className="text-slate-500">{text.time}:</span>{" "}
                  <strong>{issuedPass.departureTime}</strong>
                </p>
              </div>
              <div className="mt-6 border-t border-emerald-200 pt-4 text-center text-xs text-slate-500">
                {locale === "ar" ? "ختم المدرسة الرسمي" : "Official school stamp"}
              </div>
              {qrImage && <div className="mt-4 flex flex-col items-center gap-2"><img src={qrImage} alt={locale === "ar" ? "رمز تصريح الخروج" : "Gate pass QR code"} className="h-32 w-32 rounded-lg bg-white p-2" /><span className="font-mono text-[10px] text-slate-400">{issuedPass.qrToken}</span></div>}
              </div>
            </div>
            <div className="flex gap-3 print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700"
              >
                <Printer className="me-2 inline h-4 w-4" />
                {text.print}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-300 px-4 py-3 dark:border-slate-700"
              >
                {text.close}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <label className="mb-2 block text-sm font-semibold">{text.student}</label>
              <div className="relative">
                <Search className="absolute start-3 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setStudentId("");
                    setPickerOpen(true);
                  }}
                  onFocus={() => setPickerOpen(true)}
                  onBlur={() => setTimeout(() => setPickerOpen(false), 150)}
                  placeholder={text.search}
                  role="combobox"
                  aria-expanded={pickerOpen}
                  className={`${inputClass} ps-10`}
                />
                {pickerOpen && (
                  <div className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                    {matchingStudentGroups.length ? (
                      matchingStudentGroups.map(
                        ({ grade, students: group }) => (
                          <div key={grade ?? "unassigned"}>
                            <div className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-bold text-emerald-800 dark:border-slate-800 dark:bg-slate-950 dark:text-emerald-300">
                              {grade ? locale === "ar" ? getGradeLevelArabic(grade) : `Grade ${grade}` : (locale === "ar" ? "غير معين" : "Unassigned")}
                            </div>
                            {group.map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => selectStudent(item)}
                                className="flex w-full items-center justify-between rounded-md px-3 py-3 text-start hover:bg-emerald-50 dark:hover:bg-slate-800"
                              >
                                <span className="font-medium">
                                  {item.fullName}
                                </span>
                                <span className="text-xs text-emerald-700">
                                  {item.divisionCode ?? (locale === "ar" ? "غير معين" : "Unassigned")}
                                </span>
                              </button>
                            ))}
                          </div>
                        ),
                      )
                    ) : (
                      <p className="p-3 text-sm text-slate-500">
                        {text.noMatches}
                      </p>
                    )}
                  </div>
                )}
              </div>
              {student && (
                <p className="mt-2 text-xs text-emerald-700">
                  {text.selected}: {student.fullName} · {locale === "ar" ? "الفصل" : "Division"}{" "}
                  {student.divisionCode ?? (locale === "ar" ? "غير معين" : "Unassigned")}
                </p>
              )}
            </div>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">
                  {text.parent}{" "}
                  <span className="font-normal text-slate-500">({text.optional})</span>
              </span>
              <input
                value={form.parentName}
                onChange={(event) =>
                  setForm({ ...form, parentName: event.target.value })
                }
                placeholder={text.parentPlaceholder}
                className={inputClass}
              />
            </label>
            <div>
              <p className="mb-2 text-sm font-semibold">{text.reason}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  ["طبي", text.health],
                  ["عائلي", text.family],
                  ["طارئ", text.emergency],
                  ["أخرى", text.other],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm({ ...form, reason: value })}
                    className={`rounded-lg border px-3 py-3 text-sm transition ${form.reason === value ? "border-emerald-600 bg-emerald-50 font-semibold text-emerald-700 dark:bg-emerald-950/30" : "border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div
                className={`overflow-hidden transition-all duration-300 ${form.reason === "أخرى" ? "mt-3 max-h-32 opacity-100" : "max-h-0 opacity-0"}`}
              >
                <textarea
                  value={form.customReason}
                  onChange={(event) =>
                    setForm({ ...form, customReason: event.target.value })
                  }
                  placeholder={text.custom}
                  rows={2}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold">
                  {text.date}
                </span>
                <input
                  type="date"
                  value={form.departureDate}
                  onChange={(event) =>
                    setForm({ ...form, departureDate: event.target.value })
                  }
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold">
                  {text.time}
                </span>
                <input
                  type="time"
                  value={form.departureTime}
                  onChange={(event) =>
                    setForm({ ...form, departureTime: event.target.value })
                  }
                  className={inputClass}
                />
              </label>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {text.attendanceNote}{" "}<strong>{text.excused}</strong>.
            </div>
            <button
              type="button"
              disabled={
                !student ||
                (form.reason === "أخرى" && !form.customReason.trim())
              }
              onClick={() => void submit()}
              className="w-full rounded-lg bg-emerald-600 px-4 py-3.5 font-bold text-white shadow-sm transition hover:bg-emerald-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
            >
              {text.issue}
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}
