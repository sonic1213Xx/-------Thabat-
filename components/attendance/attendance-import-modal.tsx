"use client";

import { useMemo, useRef, useState } from "react";
import { Check, FileSpreadsheet, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { StyledSelect } from "@/components/ui/styled-select";
import {
  parseAttendanceWorkbook,
  reviewAttendanceRows,
  type AttendanceImportReview,
  type AttendanceImportStudent,
} from "@/lib/attendance-import";

const statusLabel: Record<string, string> = {
  PRESENT: "حاضر",
  ABSENT_UNEXCUSED: "غائب",
  ABSENT_EXCUSED: "غائب بعذر",
  LATE: "متأخر",
  OTHER: "أخرى",
  UNMARKED: "غير محدد",
};

type AttendanceImportModalProps = {
  students: AttendanceImportStudent[];
  divisions: string[];
  defaultDate: string;
  userId: string;
  onClose: () => void;
  onImported: (count: number) => void;
};

export function AttendanceImportModal({ students, divisions, defaultDate, userId, onClose, onImported }: AttendanceImportModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [reviews, setReviews] = useState<AttendanceImportReview[]>([]);
  const [selectedMatches, setSelectedMatches] = useState<Record<number, string>>({});
  const [approvalChecked, setApprovalChecked] = useState<Record<number, boolean>>({});
  const [divisionFilter, setDivisionFilter] = useState("ALL");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const filteredReviews = useMemo(() => reviews.filter((review) => divisionFilter === "ALL" || review.row.divisionCode === divisionFilter), [reviews, divisionFilter]);
  const approvalRows = filteredReviews.filter((review) => review.reason === "NEEDS_APPROVAL");
  const selectedCount = filteredReviews.filter((review) => {
    if (review.reason === "EXACT") return true;
    if (review.reason === "NEEDS_APPROVAL") return approvalChecked[review.row.sourceRow];
    return false;
  }).length;

  const buildRecords = () => {
    const records: Array<{ studentId: string; status: string; date: string; notes: string; entryTime?: string; divisionId: string }> = [];
    const scannedByDate = new Map<string, Set<string>>();
    const importedDivisions = new Set<string>();

    filteredReviews.forEach((review) => {
      const date = review.row.date;
      let matchedStudent: AttendanceImportStudent | undefined;
      if (review.reason === "EXACT" && review.exactMatch) matchedStudent = review.exactMatch;
      if (review.reason === "NEEDS_APPROVAL" && approvalChecked[review.row.sourceRow]) matchedStudent = review.candidates.find((candidate) => candidate.id === selectedMatches[review.row.sourceRow]);
      if (review.row.divisionCode) importedDivisions.add(review.row.divisionCode);
      if (matchedStudent?.divisionCode) importedDivisions.add(matchedStudent.divisionCode);
      if (!matchedStudent) return;
      const scanned = scannedByDate.get(date) ?? new Set<string>();
      scanned.add(matchedStudent.id);
      scannedByDate.set(date, scanned);
      records.push({ studentId: matchedStudent.id, status: review.row.status, date, notes: review.row.notes, entryTime: review.row.entryTime ?? undefined, divisionId: matchedStudent.divisionCode ?? review.row.divisionCode });
    });

    Array.from(new Set(filteredReviews.map((review) => review.row.date).filter(Boolean))).forEach((date) => {
      const scanned = scannedByDate.get(date) ?? new Set<string>();
      students.filter((student) => student.isActive !== false && student.divisionCode && importedDivisions.has(student.divisionCode) && !scanned.has(student.id)).forEach((student) => {
        records.push({ studentId: student.id, status: "ABSENT_UNEXCUSED", date, notes: "لم يتم تسجيل بصمة", divisionId: student.divisionCode! });
      });
    });
    return records;
  };

  const estimatedRecords = buildRecords();

  const parseFile = async (file: File) => {
    setError("");
    try {
      const extension = file.name.toLowerCase().split(".").pop();
      const parsed = extension === "csv" ? parseAttendanceWorkbook(await file.text(), "string") : parseAttendanceWorkbook(await file.arrayBuffer(), "array");
      const prepared = parsed.map((row) => ({ ...row, date: row.date || defaultDate }));
      if (!prepared.length) throw new Error("لم يتم العثور على صفوف حضور تحتوي على أسماء.");
      const nextReviews = reviewAttendanceRows(prepared, students);
      setReviews(nextReviews);
      // Pre-select EXACT matches
      setSelectedMatches(Object.fromEntries(nextReviews.filter((review) => review.reason === "EXACT" && review.exactMatch).map((review) => [review.row.sourceRow, review.exactMatch!.id])));
      setApprovalChecked({});
      if (!nextReviews.some((review) => review.reason !== "SKIP")) {
        setError("تمت قراءة الملف، لكن لم تتم مطابقة أي اسم مع الطلاب المسجلين. تحقق من الأسماء والشعب.");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر قراءة الملف.");
    }
  };

  const selectAllSuggestions = () => {
    setApprovalChecked((current) => Object.fromEntries(approvalRows.map((review) => [review.row.sourceRow, true])));
  };

  const deselectAll = () => {
    setApprovalChecked({});
  };

  const save = async () => {
    const records = estimatedRecords;
    if (!records.length) {
      setError("اختر مطابقة واحدة على الأقل قبل الحفظ.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const dates = Array.from(new Set(records.map((record) => record.date)));
      for (const date of dates) {
        const response = await fetch("/api/attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-thabat-user-id": userId },
          body: JSON.stringify({ date, mode: "SCHOOL", records: records.filter((record) => record.date === date) }),
        });
        const result = await response.json() as { error?: string };
        if (!response.ok) throw new Error(result.error || "تعذر حفظ الحضور.");
      }
      onImported(records.length);
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر حفظ الحضور.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={true} onOpenChange={(open) => !open && onClose()} className="max-w-6xl">
      <div dir="rtl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">استيراد حضور من Excel</h2>
            <p className="mt-1 text-sm text-slate-500">مطابقة بالاسم مع مراجعة الأسماء المتشابهة</p>
          </div>
        </div>
        {!reviews.length ? (
          <button type="button" onClick={() => inputRef.current?.click()} className="flex w-full flex-col items-center gap-3 rounded-lg border-2 border-dashed border-slate-300 p-12 text-slate-600 hover:border-emerald-500 dark:border-slate-700 dark:text-slate-300">
            <FileSpreadsheet className="h-10 w-10 text-emerald-600" />
            <span>اختر ملف Excel أو CSV</span>
            <span className="text-xs text-slate-400">الاسم، الشعبة، التاريخ، والحالة</span>
            <input ref={inputRef} type="file" accept=".xls,.xlsx,.csv" className="hidden" onChange={(event) => event.target.files?.[0] && void parseFile(event.target.files[0])} />
          </button>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
              <div className="flex items-end gap-3"><label className="text-sm font-semibold">تصفية الشعبة</label><StyledSelect value={divisionFilter} onValueChange={setDivisionFilter} options={[{ value: "ALL", label: "كل الشعب" }, ...divisions.map((division) => ({ value: division, label: division }))]} /></div>
            <div className="flex flex-wrap items-center gap-3 text-sm"><span>سيتم استيراد: {estimatedRecords.length} ({estimatedRecords.filter((record) => record.status === "ABSENT_UNEXCUSED").length} غياب لعدم تسجيل البصمة)</span><button type="button" onClick={selectAllSuggestions} disabled={!filteredReviews.length} className="rounded-md border border-emerald-600 px-3 py-2 font-semibold text-emerald-700 disabled:opacity-50">تأكيد الكل</button><button type="button" onClick={deselectAll} disabled={!filteredReviews.length} className="rounded-md border border-slate-400 px-3 py-2 font-semibold text-slate-700 disabled:opacity-50 dark:text-slate-200">إلغاء الكل</button></div>
            </div>
            <div className="max-h-[28rem] overflow-auto rounded-lg border border-slate-200 dark:border-slate-700">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800"><tr><th className="px-3 py-2 text-right">الصف</th><th className="px-3 py-2 text-right">الاسم في الملف</th><th className="px-3 py-2 text-right">الشعبة</th><th className="px-3 py-2 text-right">التاريخ</th><th className="px-3 py-2 text-right">الحالة</th><th className="px-3 py-2 text-right">الملاحظات</th><th className="px-3 py-2 text-right">المطابقة</th></tr></thead>
                <tbody>{filteredReviews.map((review) => <ReviewRow key={review.row.sourceRow} review={review} selectedId={selectedMatches[review.row.sourceRow]} onSelect={(studentId) => setSelectedMatches((current) => ({ ...current, [review.row.sourceRow]: studentId }))} isApprovalChecked={approvalChecked[review.row.sourceRow] ?? false} onApprovalToggle={(checked) => setApprovalChecked((current) => ({ ...current, [review.row.sourceRow]: checked }))} />)}</tbody>
              </table>
            </div>
            <div className="flex flex-wrap justify-end gap-3"><button type="button" onClick={() => setReviews([])} className="rounded-md bg-slate-100 px-4 py-2 text-sm dark:bg-slate-800">ملف جديد</button><button type="button" onClick={() => void save()} disabled={saving || !estimatedRecords.length} className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving && <Loader2 className="h-4 w-4 animate-spin" />} حفظ الحضور</button></div>
          </div>
        )}
        {error && <p className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
      </div>
    </Modal>
  );
}

function ReviewRow({ review, selectedId, onSelect, isApprovalChecked, onApprovalToggle }: { review: AttendanceImportReview; selectedId?: string; onSelect: (studentId: string) => void; isApprovalChecked?: boolean; onApprovalToggle?: (checked: boolean) => void }) {
  const isAccepted = review.reason === "EXACT";
  const status = review.reason === "EXACT" ? "مطابقة مباشرة" : review.reason === "NEEDS_APPROVAL" ? "يحتاج تأكيد" : review.reason === "SKIP" ? "لا توجد مطابقة" : "بيانات ناقصة";
  return <tr className="border-t border-slate-200 dark:border-slate-800"><td className="px-3 py-2">{review.row.sourceRow}</td><td className="px-3 py-2 font-medium">{review.row.name}</td><td className="px-3 py-2">{review.row.divisionCode || "-"}</td><td className="px-3 py-2">{review.row.date || "-"}</td><td className="px-3 py-2">{statusLabel[review.row.status]}</td><td className="max-w-64 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">{review.row.notes || "-"}</td><td className="min-w-64 px-3 py-2">{review.reason === "EXACT" ? <label className="inline-flex items-center gap-2 text-emerald-700"><input type="checkbox" checked={true} disabled /><Check className="h-4 w-4" />{review.exactMatch?.fullName} ({review.exactMatch?.divisionCode || "-"})</label> : review.reason === "NEEDS_APPROVAL" ? <div className="space-y-2"><div className="flex items-center gap-2"><input type="checkbox" checked={isApprovalChecked ?? false} onChange={(event) => onApprovalToggle?.(event.target.checked)} className="rounded border-slate-300" /><span className="text-xs font-medium text-slate-600 dark:text-slate-300">أؤكد أن هذا هو الطالب</span></div><select value={selectedId ?? ""} onChange={(event) => onSelect(event.target.value)} disabled={!isApprovalChecked} className="w-full rounded-md border border-amber-300 bg-amber-50 px-2 py-1 disabled:opacity-50 dark:bg-amber-950/30"><option value="">{status}</option>{review.candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.fullName} ({candidate.divisionCode || "-"}, {Math.round(candidate.score * 100)}%)</option>)}</select></div> : <span className={isAccepted ? "text-emerald-700" : "text-slate-500"}>{status}</span>}</td></tr>;
}
