"use client";

import { Loader2, Save, X } from "lucide-react";
import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { AttendanceStatusSelect } from "@/components/ui/attendance-status-select";

type EditAttendanceModalProps = {
  open: boolean;
  studentName: string;
  date: string;
  currentStatus: string;
  currentNotes: string;
  attendanceId: string;
  studentId: string;
  userId: string;
  onClose: () => void;
  onSaved: () => void;
};

export function EditAttendanceModal({
  open,
  studentName,
  date,
  currentStatus,
  currentNotes,
  attendanceId,
  studentId,
  userId,
  onClose,
  onSaved,
}: EditAttendanceModalProps) {
  const [status, setStatus] = useState(currentStatus);
  const [notes, setNotes] = useState(currentNotes);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/attendance", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-thabat-user-id": userId,
        },
        body: JSON.stringify({
          attendanceId,
          studentId,
          date,
          status,
          notes,
        }),
      });

      const result = (await response.json()) as {
        error?: string;
        message?: string;
      };
      if (!response.ok) throw new Error(result.error || "تعذر حفظ التعديلات");

      onSaved();
      onClose();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "تعذر حفظ التعديلات"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <div dir="rtl" className="space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            تعديل الحضور
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {studentName} - {date}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
              الحالة
            </label>
            <AttendanceStatusSelect
              value={status}
              onValueChange={setStatus}
              options={[
                { value: "UNMARKED", label: "غير محدد" },
                { value: "PRESENT", label: "حاضر" },
                { value: "ABSENT_UNEXCUSED", label: "غائب" },
                { value: "ABSENT_EXCUSED", label: "غياب بعذر" },
                { value: "LATE", label: "متأخر" },
                { value: "OTHER", label: "أخرى" },
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
              ملاحظات إضافية
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أضف ملاحظات بخصوص التعديل (اختياري)"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
              rows={3}
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <X className="h-4 w-4" />
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || status === currentStatus}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            <Save className="h-4 w-4" />
            حفظ التعديلات
          </button>
        </div>
      </div>
    </Modal>
  );
}
