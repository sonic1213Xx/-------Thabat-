"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, FileText, MinusCircle, Phone, Search } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { StyledSelect } from "@/components/ui/styled-select";
import { MoeDocument } from "@/components/moe-documents";
import { saveIncident } from "@/lib/vp-operations";
import { VIOLATION_DEGREES } from "@/lib/moe-rules";
import { useLanguage } from "@/components/language-provider";
import { getGradeLevelArabic } from "@/lib/utils";

type Student = {
  id: string;
  fullName: string;
  divisionCode?: string | null;
  academicId?: string | null;
  gradeLevel?: number | null;
};
const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-start text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white";
export function IncidentLogger({
  students,
  onClose,
}: {
  students: Student[];
  onClose: () => void;
}) {
  const { locale } = useLanguage();
  const text = locale === "ar" ? { management: "التزام وسلوك الطلاب", title: "محضر ضبط واقعة وسلوك", intro: "وثّق ما حدث بدقة، ثم اختر الإجراء المطلوب للمتابعة.", student: "الطالب", search: "ابحث بالاسم أو الرقم الأكاديمي أو الفصل", noMatches: "لا يوجد طلاب مطابقون", selected: "تم اختيار", unassigned: "غير معين", details: "وصف الواقعة", detailsHint: "اكتب ماذا حدث، ومتى بدأ، وما السلوك الذي تمت ملاحظته.", detailsPlaceholder: "مثال: استخدم الطالب هاتفه أثناء الحصة بعد التنبيه...", location: "مكان الواقعة", locationHint: "حدد المكان الذي وقعت فيه الحادثة.", locationPlaceholder: "مثال: الفصل 2 / الساحة / المختبر", witnesses: "الشهود والملاحظات", witnessesHint: "أضف أسماء الشهود وأي ملاحظات مفيدة للتحقق.", witnessesPlaceholder: "مثال: أحمد العتيبي، معلم الصف...", degree: "درجة المخالفة", degreeHint: "اختر الدرجة حسب لائحة السلوك المعتمدة.", actions: "إجراء المتابعة", actionsHint: "اختر الإجراء الذي تريد تنفيذه بعد حفظ المحضر.", pledge: "إصدار تعهد سلوكي", pledgeHint: "فتح التعهد الرسمي وتوقيعه أو طباعته.", summons: "استدعاء ولي الأمر", summonsHint: "فتح نموذج الاستدعاء الرسمي وتعبئته أو طباعته.", deduct: "حسم درجات السلوك", deductHint: "حفظ المحضر وتسجيل الحسم في سجل الإنذارات.", ready: "تم تجهيز إشعار استدعاء ولي الأمر.", saved: "تم حفظ المحضر بنجاح.", deductionSaved: "تم حفظ المحضر وتسجيل حسم درجات السلوك.", error: "تعذر تنفيذ الإجراء. تحقق من الاتصال وحاول مرة أخرى.", working: "جارٍ تنفيذ الإجراء..." } : { management: "Student conduct and compliance", title: "Incident and behavior report", intro: "Document what happened clearly, then choose the follow-up action.", student: "Student", search: "Search by name, academic ID, or division", noMatches: "No matching students", selected: "Selected", unassigned: "Unassigned", details: "Incident description", detailsHint: "Describe what happened, when it started, and the behavior observed.", detailsPlaceholder: "Example: The student used a phone during class after being warned...", location: "Incident location", locationHint: "Specify where the incident took place.", locationPlaceholder: "Example: Room 2 / courtyard / lab", witnesses: "Witnesses and notes", witnessesHint: "Add witness names and any notes that help verify the report.", witnessesPlaceholder: "Example: Ahmed Al-Otaibi, classroom teacher...", degree: "Violation level", degreeHint: "Choose the level according to the approved conduct policy.", actions: "Follow-up action", actionsHint: "Choose what should happen after saving this report.", pledge: "Issue behavior pledge", pledgeHint: "Open the official pledge for signing or printing.", summons: "Parent summons", summonsHint: "Open the official summons for completion or printing.", deduct: "Deduct behavior points", deductHint: "Save the report and record the deduction in warnings.", ready: "The parent summons notice is ready.", saved: "The incident report was saved successfully.", deductionSaved: "The report was saved and the behavior deduction was recorded.", error: "The action could not be completed. Check the connection and try again.", working: "Processing action..." };
  const [studentId, setStudentId] = useState("");
  const [search, setSearch] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [highlightedStudentIndex, setHighlightedStudentIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<"success" | "error" | null>(null);
  const [documentType, setDocumentType] = useState<"pledge" | "summon" | null>(null);
  const student = students.find((item) => item.id === studentId);
  const matchingStudentGroups = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const matches = query
      ? students.filter((item) => `${item.fullName} ${item.divisionCode ?? ""}`.toLocaleLowerCase().includes(query))
      : students;
    const groups = new Map<number | null, Student[]>();
    matches.forEach((item) => {
      const codeGrade = item.divisionCode?.match(/^([1-3])\d{2}$/)?.[1];
      const grade = codeGrade ? Number(codeGrade) : null;
      groups.set(grade, [...(groups.get(grade) ?? []), item]);
    });
    return Array.from(groups.entries()).sort(([left], [right]) => (left ?? 99) - (right ?? 99));
  }, [search, students]);
  const matchingStudents = matchingStudentGroups.flatMap(([, group]) => group);
  const [form, setForm] = useState({
    details: "",
    location: "",
    witnesses: "",
    degree: "1",
  });
  const selectedDegree = VIOLATION_DEGREES.find((item) => String(item.degree) === form.degree) ?? VIOLATION_DEGREES[0];
  const violationOptions = VIOLATION_DEGREES.map((item) => ({
    value: String(item.degree),
    label: `${locale === "ar" ? item.label : item.labelEn} - ${item.degree === 6 ? (locale === "ar" ? "حرمان وإحالة فورية" : "Deprivation / referral") : locale === "ar" ? `خصم ${item.deduction} ${item.deduction === 1 ? "درجة" : "درجات"}` : `${item.deduction} point deduction`}`,
  }));
  const apply = async (action: string) => {
    if (!student || !form.details.trim()) return;
    setIsSaving(true);
    setStatus(null);
    try {
      saveIncident({
        id: crypto.randomUUID(),
        studentId,
        studentName: student.fullName,
        divisionCode: student.divisionCode ?? "غير معين",
        ...form,
        action,
        createdAt: new Date().toISOString(),
      });
      if (action === text.deduct) {
        const response = await fetch("/api/warnings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId,
            type: "CONDUCT",
            reason: `${form.details} - درجة المخالفة ${form.degree}`,
            deduction: selectedDegree.deduction,
            severity: "MAJOR",
          }),
        });
        if (!response.ok) throw new Error("warning request failed");
        setStatus("success");
      } else {
        setDocumentType(action === text.pledge ? "pledge" : "summon");
      }
    } catch {
      setStatus("error");
    } finally {
      setIsSaving(false);
    }
  };
  return (
    <Modal
      open={true}
      onOpenChange={(open) => !open && onClose()}
      className="max-w-xl"
    >
      <div dir="rtl" className="space-y-5">
        <div>
          <h2 className="text-xl font-bold">{text.title}</h2>
          <p className="text-sm text-slate-500">
            {text.intro}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <label className="mb-2 block text-sm font-semibold">{text.student}</label>
          <div className="relative">
            <Search className="absolute start-3 top-3.5 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setStudentId("");
                setHighlightedStudentIndex(0);
                setPickerOpen(true);
              }}
              onFocus={() => setPickerOpen(true)}
              onBlur={() => setTimeout(() => setPickerOpen(false), 150)}
              onKeyDown={(event) => {
                if (!matchingStudents.length) return;
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setPickerOpen(true);
                  setHighlightedStudentIndex((index) => (index + 1) % matchingStudents.length);
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setPickerOpen(true);
                  setHighlightedStudentIndex((index) => (index - 1 + matchingStudents.length) % matchingStudents.length);
                } else if (event.key === "Enter" && pickerOpen) {
                  event.preventDefault();
                  const item = matchingStudents[highlightedStudentIndex];
                  if (item) {
                    setStudentId(item.id);
                    setSearch(item.fullName);
                    setPickerOpen(false);
                  }
                } else if (event.key === "Escape") {
                  setPickerOpen(false);
                }
              }}
              placeholder={text.search}
              role="combobox"
              aria-expanded={pickerOpen}
              aria-activedescendant={pickerOpen && matchingStudents[highlightedStudentIndex] ? `incident-student-${matchingStudents[highlightedStudentIndex].id}` : undefined}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 ps-10 text-start text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
            {pickerOpen && (
              <div className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                {matchingStudentGroups.length ? matchingStudentGroups.map(([grade, group]) => (
                  <div key={grade ?? "unassigned"}>
                    <div className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-bold text-emerald-800 dark:border-slate-800 dark:bg-slate-950 dark:text-emerald-300">
                      {grade ? locale === "ar" ? getGradeLevelArabic(grade) : `Grade ${grade}` : text.unassigned}
                    </div>
                    {group.map((item) => {
                      const itemIndex = matchingStudents.findIndex((studentItem) => studentItem.id === item.id);
                      return <button
                        key={item.id}
                        id={`incident-student-${item.id}`}
                        type="button"
                        role="option"
                        aria-selected={itemIndex === highlightedStudentIndex}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => { setStudentId(item.id); setSearch(item.fullName); setPickerOpen(false) }}
                        className={`flex w-full items-center justify-between rounded-md px-3 py-3 text-start hover:bg-emerald-50 dark:hover:bg-slate-800 ${itemIndex === highlightedStudentIndex ? "bg-emerald-50 dark:bg-slate-800" : ""}`}
                      >
                        <span className="font-medium">{item.fullName}</span>
                        <span className="text-xs text-emerald-700">{item.divisionCode ?? text.unassigned}</span>
                      </button>;
                    })}
                  </div>
                )) : <p className="p-3 text-sm text-slate-500">{text.noMatches}</p>}
              </div>
            )}
          </div>
          {student && <p className="mt-3 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">{text.selected}: {student.fullName} · {student.divisionCode ?? text.unassigned}</p>}
        </div>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">{text.details}</span>
          <span className="mb-2 block text-xs text-slate-500">{text.detailsHint}</span>
          <textarea
            value={form.details}
            onChange={(event) => setForm({ ...form, details: event.target.value })}
            placeholder={text.detailsPlaceholder}
            className={`${inputClass} min-h-28`}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">{text.location}</span>
          <span className="mb-2 block text-xs text-slate-500">{text.locationHint}</span>
          <input
            value={form.location}
            onChange={(event) => setForm({ ...form, location: event.target.value })}
            placeholder={text.locationPlaceholder}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">{text.witnesses}</span>
          <span className="mb-2 block text-xs text-slate-500">{text.witnessesHint}</span>
          <textarea
            value={form.witnesses}
            onChange={(event) => setForm({ ...form, witnesses: event.target.value })}
            placeholder={text.witnessesPlaceholder}
            className={`${inputClass} min-h-24`}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">{text.degree}</span>
          <span className="mb-2 block text-xs text-slate-500">{text.degreeHint}</span>
          <StyledSelect
            value={form.degree}
            onValueChange={(value) => setForm({ ...form, degree: value })}
            options={violationOptions}
            aria-label={text.degree}
            className="h-12"
          />
          <div className="mt-2 flex items-start gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{selectedDegree.degree === 6 ? (locale === "ar" ? "هذه الدرجة تتطلب الحرمان والإحالة الفورية." : "This level requires deprivation and immediate referral.") : locale === "ar" ? `سيتم حسم ${selectedDegree.deduction} ${selectedDegree.deduction === 1 ? "درجة" : "درجات"} من رصيد السلوك عند اختيار الحسم.` : `${selectedDegree.deduction} behavior point${selectedDegree.deduction === 1 ? "" : "s"} will be deducted when the deduction action is chosen.`}</span>
          </div>
        </label>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="mb-3 flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <div>
              <p className="text-sm font-semibold">{text.actions}</p>
              <p className="mt-1 text-xs text-slate-500">{text.actionsHint}</p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
          <button
            type="button"
            disabled={isSaving}
            onClick={() => void apply(text.pledge)}
            className="rounded-lg bg-blue-600 px-3 py-3 text-start text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
          >
            <FileText className="mb-2 h-4 w-4" />
            <span className="block">{text.pledge}</span>
            <span className="mt-1 block text-xs font-normal text-blue-100">{text.pledgeHint}</span>
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={() => void apply(text.summons)}
            className="rounded-lg bg-amber-500 px-3 py-3 text-start text-sm font-semibold text-white transition hover:bg-amber-600 disabled:cursor-wait disabled:opacity-60"
          >
            <Phone className="mb-2 h-4 w-4" />
            <span className="block">{text.summons}</span>
            <span className="mt-1 block text-xs font-normal text-amber-50">{text.summonsHint}</span>
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={() => void apply(text.deduct)}
            className="rounded-lg bg-red-600 px-3 py-3 text-start text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-wait disabled:opacity-60"
          >
            <MinusCircle className="mb-2 h-4 w-4" />
            <span className="block">{text.deduct}</span>
            <span className="mt-1 block text-xs font-normal text-red-100">{text.deductHint}</span>
          </button>
        </div>
        </div>
        {isSaving && <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">{text.working}</p>}
        {status && (
          <p className={`rounded-lg border px-3 py-2 text-sm font-semibold ${status === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300" : "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"}`}>
            {status === "success" ? text.deductionSaved : text.error}
          </p>
        )}
      </div>
      {documentType && student && (
        <MoeDocument
          type={documentType}
          data={{
            studentName: student.fullName,
            divisionCode: student.divisionCode,
            academicId: student.academicId,
            details: form.details,
            date: new Date().toISOString().slice(0, 10),
            degree: form.degree,
          }}
          onClose={() => setDocumentType(null)}
        />
      )}
    </Modal>
  );
}
