"use client";

import { useRef, useState } from "react";
import { AlertCircle, CheckCircle, Upload, X } from "lucide-react";
import {
  importFieldLabel,
  parseWorkbook,
  type ImportField,
  type ImportMapping,
  type ParsedSheet,
} from "@/lib/excel-parser";
import { StyledSelect } from "@/components/ui/styled-select";
import { Modal } from "@/components/ui/modal";
import { getGradeLevelArabic } from "@/lib/utils";

const fields: ImportField[] = [
  "name",
  "academicId",
  "gpa",
  "parentPhone",
  "nationalId",
  "divisionCode",
  "gradeLevel",
  "level",
];

export type ImportResult = {
  imported: number;
  skipped: number;
  divisionCount: number;
  students: Array<{
    id: string;
    fullName: string;
    academicId: string | null;
    gpa: number | null;
    parentPhone: string | null;
    nationalId: string | null;
    divisionCode: string | null;
    divisionId: string | null;
    level: string | null;
  }>;
};

type ImportModalProps = {
  onClose: () => void;
  onImported: (result: ImportResult) => void;
};

export function ImportModal({ onClose, onImported }: ImportModalProps) {
  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [mapping, setMapping] = useState<ImportMapping | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const parseFile = async (file: File) => {
    try {
      setError("");
      const extension = file.name.toLowerCase().split(".").pop();
      const parsed =
        extension === "csv"
          ? parseWorkbook(await file.text(), "string")
          : parseWorkbook(await file.arrayBuffer(), "array");
      if (!parsed?.records.length)
        throw new Error(
          "لم يتم العثور على أسماء طلاب. اختر عمود الاسم من القائمة.",
        );
      setSheet(parsed);
      setMapping(parsed.mapping);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر قراءة الملف.");
    }
  };

  const mappedRecords =
    sheet && mapping
      ? sheet.records.map((record) => ({
          ...record,
          name:
            sheet.rows[record.sourceRow - 1]?.[mapping.name ?? -1]
              ?.toString()
              .trim() || record.name,
          academicId:
            mapping.academicId === null
              ? record.academicId
              : String(
                  sheet.rows[record.sourceRow - 1]?.[mapping.academicId] ?? "",
                ).trim(),
          gpa:
            mapping.gpa === null
              ? record.gpa
              : Number(
                  String(
                    sheet.rows[record.sourceRow - 1]?.[mapping.gpa] ?? "",
                  ).replace(",", "."),
                ) || null,
          parentPhone:
            mapping.parentPhone === null
              ? record.parentPhone
              : String(
                  sheet.rows[record.sourceRow - 1]?.[mapping.parentPhone] ?? "",
                ).trim(),
          nationalId:
            mapping.nationalId === null
              ? ""
              : String(
                  sheet.rows[record.sourceRow - 1]?.[mapping.nationalId] ?? "",
                ).trim(),
          divisionId:
            record.derivedDivision ||
            record.divisionCode ||
            String(
              sheet.rows[record.sourceRow - 1]?.[mapping.divisionCode ?? -1] ??
                "",
            ).trim(),
          divisionCode:
            record.derivedDivision ||
            record.divisionCode ||
            String(
              sheet.rows[record.sourceRow - 1]?.[mapping.divisionCode ?? -1] ??
                "",
            ).trim(),
          gradeLevel:
            mapping.gradeLevel === null
              ? record.gradeLevel
              : Number(
                  String(
                    sheet.rows[record.sourceRow - 1]?.[mapping.gradeLevel] ??
                      "",
                  ).match(/[1-3]/)?.[0] ?? "",
                ) || record.gradeLevel,
          level:
            mapping.level === null
              ? record.level
              : String(
                  sheet.rows[record.sourceRow - 1]?.[mapping.level] ?? "",
                ).trim() || record.level,
        }))
      : [];

  const save = async () => {
    if (!mappedRecords.length) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/students/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: mappedRecords,
          divisions: sheet?.metadata.divisions ?? [],
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "تعذر حفظ البيانات.");
      onImported(result.data as ImportResult);
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
      <div>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            استيراد كشف الطلاب
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {!sheet && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center gap-3 rounded-lg border-2 border-dashed border-slate-300 p-12 text-slate-600 hover:border-emerald-500 dark:border-slate-700 dark:text-slate-300"
          >
            <Upload className="h-10 w-10 text-emerald-600" />
            <span>اختر ملف Excel أو CSV</span>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(event) =>
                event.target.files?.[0] && parseFile(event.target.files[0])
              }
            />
          </button>
        )}
        {sheet && mapping && (
          <div className="space-y-5">
            <div className="grid gap-3 md:grid-cols-2">
              {fields.map((field) => (
                <label
                  key={field}
                  className="text-sm text-slate-700 dark:text-slate-300"
                >
                  <span className="mb-1 block">{importFieldLabel(field)}</span>
                  <StyledSelect
                    value={
                      mapping[field] === null
                        ? "missing"
                        : String(mapping[field])
                    }
                    onValueChange={(value) =>
                      setMapping({
                        ...mapping,
                        [field]: value === "missing" ? null : Number(value),
                      })
                    }
                    placeholder="غير موجود"
                    options={[
                      { value: "missing", label: "غير موجود" },
                      ...sheet.headers.map((header, index) => ({
                        value: String(index),
                        label: header || `عمود ${index + 1}`,
                      })),
                    ]}
                  />
                </label>
              ))}
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="max-h-80 overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800">
                    <tr>
                      <th className="px-3 py-2 text-right">#</th>
                      <th className="px-3 py-2 text-right">الاسم</th>
                      <th className="px-3 py-2 text-right">الهوية</th>
                      <th className="px-3 py-2 text-right">الفصل</th>
                      <th className="px-3 py-2 text-right">الصف</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappedRecords.slice(0, 100).map((row, index) => (
                      <tr
                        key={`${row.sourceRow}-${index}`}
                        className="border-t border-slate-200 dark:border-slate-800"
                      >
                        <td className="px-3 py-2">{index + 1}</td>
                        <td className="px-3 py-2 font-medium">{row.name}</td>
                        <td className="px-3 py-2">
                          {row.nationalId || "فارغ"}
                        </td>
                        <td className="px-3 py-2">
                          {row.divisionCode || "فارغ"}
                        </td>
                        <td className="px-3 py-2">
                          {row.gradeLevel
                            ? getGradeLevelArabic(row.gradeLevel)
                            : "فارغ"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSheet(null)}
                className="flex-1 rounded-lg bg-slate-100 px-4 py-3 text-sm dark:bg-slate-800"
              >
                ملف جديد
              </button>
              <button
                type="button"
                disabled={saving || mapping.name === null}
                onClick={save}
                className="flex-1 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
              >
                {saving ? "جاري الحفظ..." : `حفظ ${mappedRecords.length} طالب`}
              </button>
            </div>
          </div>
        )}
        {error && (
          <div className="mt-4 flex gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
        {sheet && !error && (
          <div className="mt-3 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
            <CheckCircle className="h-4 w-4" />
            {sheet.metadata.division || "بيانات مخصصة"}{" "}
            {sheet.metadata.subject && `· ${sheet.metadata.subject}`}
          </div>
        )}
      </div>
    </Modal>
  );
}
