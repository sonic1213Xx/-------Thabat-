"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";

type EditableStudent = {
  id: string;
  fullName: string;
  academicId: string | null;
  gpa: number | null;
  parentPhone: string | null;
  nationalId: string | null;
  divisionCode: string | null;
};

export function BulkStudentEditor({
  students,
  onClose,
  onSaved,
}: {
  students: EditableStudent[];
  onClose: () => void;
  onSaved: (students: EditableStudent[]) => void;
}) {
  const [rows, setRows] = useState(students);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const updateRow = (
    id: string,
    field: "gpa" | "parentPhone",
    value: string,
  ) => {
    setRows((current) =>
      current.map((row) =>
        row.id === id
          ? {
              ...row,
              [field]: field === "gpa" ? (value ? Number(value) : null) : value,
            }
          : row,
      ),
    );
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const updated = [];
      for (const row of rows) {
        const response = await fetch("/api/students", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: row.id,
            fullName: row.fullName,
            academicId: row.academicId,
            gpa: row.gpa,
            parentPhone: row.parentPhone,
            nationalId: row.nationalId,
            divisionCode: row.divisionCode,
          }),
        });
        if (!response.ok) throw new Error("تعذر حفظ بعض بيانات الطلاب.");
        updated.push((await response.json()).data as EditableStudent);
      }
      onSaved(updated);
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر حفظ البيانات.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={true}
      onOpenChange={(open) => !open && onClose()}
      className="max-w-5xl"
    >
      <div dir="rtl">
        <div className="mb-5">
          <h2 className="text-xl font-bold">التعديل الجماعي للبيانات</h2>
          <p className="mt-1 text-sm text-slate-500">
            أكمل المعدل وجوال ولي الأمر للطلاب المستوردين.
          </p>
        </div>
        <div className="max-h-[60vh] overflow-auto rounded-lg border border-slate-200 dark:border-slate-700">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800">
              <tr>
                <th className="px-3 py-2 text-right">الطالب</th>
                <th className="px-3 py-2 text-right">الرقم الأكاديمي</th>
                <th className="px-3 py-2 text-right">المعدل</th>
                <th className="px-3 py-2 text-right">جوال ولي الأمر</th>
                <th className="px-3 py-2 text-right">الشعبة</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-slate-200 dark:border-slate-700"
                >
                  <td className="px-3 py-2 font-medium">{row.fullName}</td>
                  <td className="px-3 py-2">{row.academicId || "فارغ"}</td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={row.gpa ?? ""}
                      onChange={(event) =>
                        updateRow(row.id, "gpa", event.target.value)
                      }
                      className="w-24 rounded border px-2 py-1 dark:bg-slate-950"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={row.parentPhone ?? ""}
                      onChange={(event) =>
                        updateRow(row.id, "parentPhone", event.target.value)
                      }
                      className="w-40 rounded border px-2 py-1 dark:bg-slate-950"
                    />
                  </td>
                  <td className="px-3 py-2">{row.divisionCode || "فارغ"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg bg-slate-100 px-4 py-3 dark:bg-slate-800"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="flex-1 rounded-lg bg-emerald-600 px-4 py-3 text-white disabled:opacity-50"
          >
            {saving ? "جاري الحفظ..." : "حفظ البيانات"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
