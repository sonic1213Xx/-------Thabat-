"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

interface ParsedStudent {
  name: string;
  nationalId: string;
  gradeLevel: number | null;
  divisionCode: string;
}

interface ExcelParserProps {
  onParsed?: (students: ParsedStudent[]) => void;
}

const normalizeCell = (value: unknown) =>
  value == null ? "" : String(value).trim();

const matchesAny = (text: string, patterns: string[]) => {
  const normalized = text.toLowerCase().replace(/[^a-z\u0600-\u06ff0-9]/g, "");
  return patterns.some((pattern) =>
    normalized.includes(pattern.replace(/[^a-z\u0600-\u06ff0-9]/g, "")),
  );
};

export function ExcelParser({ onParsed }: ExcelParserProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = async (selectedFile: File) => {
    setError(null);

    const validTypes = [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv",
      "application/csv",
      "application/octet-stream",
    ];
    const extension = selectedFile.name.toLowerCase().split(".").pop() || "";
    if (
      !validTypes.includes(selectedFile.type) &&
      !["csv", "xls", "xlsx"].includes(extension)
    ) {
      setError("يجب أن تكون الملف بصيغة Excel أو CSV (.xls، .xlsx، .csv)");
      return;
    }

    setFile(selectedFile);
    await parseExcelFile(selectedFile);
  };

  const parseExcelFile = async (excelFile: File) => {
    try {
      setLoading(true);

      const extension = excelFile.name.toLowerCase().split(".").pop() || "";
      const raw =
        extension === "csv"
          ? await excelFile.text()
          : await excelFile.arrayBuffer();

      const workbook =
        extension === "csv"
          ? XLSX.read(raw, { type: "string" })
          : XLSX.read(raw, { type: "array" });

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
      }) as unknown[][];

      if (!data.length) {
        setError("الملف فارغ أو لا يحتوي على بيانات");
        return;
      }

      const headerRow = data[0] as unknown[];
      const studentNameColIdx = headerRow.findIndex((col) => {
        const text = normalizeCell(col);
        return matchesAny(text, [
          "اسم",
          "studentname",
          "name",
          "اسم الطالب",
          "الطالب",
        ]);
      });
      const idColIdx = headerRow.findIndex((col) => {
        const text = normalizeCell(col);
        return matchesAny(text, [
          "هوية",
          "رقم الهوية",
          "nationalid",
          "id",
          "national",
        ]);
      });
      const divisionColIdx = headerRow.findIndex((col) => {
        const text = normalizeCell(col);
        return matchesAny(text, ["الفصل", "division", "divisioncode", "class"]);
      });

      if (studentNameColIdx === -1) {
        setError("لم يتم العثور على عمود أسماء الطلاب");
        return;
      }

      const parsed: ParsedStudent[] = [];
      for (let i = 1; i < Math.min(data.length, 500); i += 1) {
        const row = data[i] as unknown[];
        if (!row || !row.length) continue;

        const name = normalizeCell(row[studentNameColIdx]);
        if (!name) continue;

        const nationalId = normalizeCell(row[idColIdx] ?? "");
        const divisionCode = normalizeCell(row[divisionColIdx] ?? "");
        const gradeColIdx = headerRow.findIndex((col) =>
          matchesAny(normalizeCell(col), ["مرحلة", "grade", "المرحلة"]),
        );
        const gradeValue =
          gradeColIdx >= 0 ? normalizeCell(row[gradeColIdx]) : "";
        const gradeLevel = Number(gradeValue.match(/[1-3]/)?.[0] ?? "") || null;

        parsed.push({
          name,
          nationalId,
          divisionCode,
          gradeLevel,
        });
      }

      if (!parsed.length) {
        setError("لم يتم العثور على بيانات طلاب صحيحة في الملف");
        return;
      }

      setParsedData(parsed);
      onParsed?.(parsed);
    } catch (err) {
      setError(
        `خطأ في معالجة الملف: ${err instanceof Error ? err.message : "خطأ غير معروف"}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setParsedData([]);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="w-full space-y-6">
      {!file && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "rounded-lg border-2 border-dashed p-12 text-center transition-all duration-300",
              isDragging
                ? "border-emerald-school-500 bg-emerald-school-50 dark:bg-emerald-school-950/30"
                : "border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50",
            )}
          >
            <motion.div
              animate={isDragging ? { scale: 1.1 } : { scale: 1 }}
              className="flex justify-center mb-4"
            >
              <Upload className="h-12 w-12 text-emerald-school-600 dark:text-emerald-school-400" />
            </motion.div>

            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              اسحب ملف Excel أو CSV هنا
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              أو انقر لاختيار ملف من جهازك
            </p>

            <button
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "inline-block px-6 py-2 rounded-lg font-medium",
                "bg-emerald-school-600 hover:bg-emerald-school-700 text-white",
                "transition-colors duration-200",
              )}
            >
              اختر ملف
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileInputChange}
              className="hidden"
            />

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">
              الملفات المدعومة: .xlsx، .xls، .csv
            </p>
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-start gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/30"
          >
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center p-8"
        >
          <div className="text-center">
            <div className="loading-spinner mx-auto mb-3"></div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              جاري معالجة الملف...
            </p>
          </div>
        </motion.div>
      )}

      {file && parsedData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between p-4 rounded-lg bg-emerald-school-50 dark:bg-emerald-school-950/30 border border-emerald-school-200 dark:border-emerald-school-900/30">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-emerald-school-600" />
              <div>
                <p className="font-semibold text-emerald-school-900 dark:text-emerald-school-100">
                  {file.name}
                </p>
                <p className="text-xs text-emerald-school-700 dark:text-emerald-school-300">
                  تم تحديد {parsedData.length} طالب/طالبة
                </p>
              </div>
            </div>
            <button
              onClick={handleReset}
              className="p-2 hover:bg-emerald-school-100 dark:hover:bg-emerald-school-900/50 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-emerald-school-600" />
            </button>
          </div>

          {/* Preview Table */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 dark:bg-slate-800">
                  <tr>
                    <th className="px-4 py-3 text-right text-slate-900 dark:text-white font-semibold">
                      #
                    </th>
                    <th className="px-4 py-3 text-right text-slate-900 dark:text-white font-semibold">
                      اسم الطالب/الطالبة
                    </th>
                    <th className="px-4 py-3 text-right text-slate-900 dark:text-white font-semibold">
                      رقم الهوية
                    </th>
                    <th className="px-4 py-3 text-right text-slate-900 dark:text-white font-semibold">
                      المرحلة
                    </th>
                    <th className="px-4 py-3 text-right text-slate-900 dark:text-white font-semibold">
                      الفصل
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence mode="popLayout">
                    {parsedData.slice(0, 10).map((student, idx) => (
                      <motion.tr
                        key={`${student.nationalId}-${idx}`}
                        layoutId={`student-${idx}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="border-t border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                          {student.name}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                          {student.nationalId}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                          ث{student.gradeLevel}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                          {student.divisionCode}
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>

          {parsedData.length > 10 && (
            <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
              عرض 10 من {parsedData.length} طالب/طالبة
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleReset}
              className={cn(
                "flex-1 px-4 py-2 rounded-lg font-medium",
                "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700",
                "text-slate-900 dark:text-white",
                "transition-colors duration-200",
              )}
            >
              تحميل ملف جديد
            </button>
            <button
              className={cn(
                "flex-1 px-4 py-2 rounded-lg font-medium",
                "bg-emerald-school-600 hover:bg-emerald-school-700 text-white",
                "transition-colors duration-200",
              )}
            >
              حفظ البيانات
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
