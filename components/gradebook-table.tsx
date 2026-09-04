"use client";

import { useEffect, useState } from "react";
import {
  Download, Loader2, Maximize2, Plus, Printer, RefreshCw, Save, Settings, Trash2,
} from "lucide-react";
import {
  exportEmptyGradebookTemplates,
  exportGradebookToExcel,
  exportGradebookToPdf,
  type GradebookPeriod,
  type GradebookStudent,
} from "@/lib/export-gradebook";
import { getSession } from "@/lib/auth";
import { useLanguage } from "@/components/language-provider";
import { useToast } from "@/components/toast-provider";
import { notifyPdfComingSoon, runExport } from "@/lib/export-feedback";

export type GradebookRow = GradebookStudent;
type GradeCategory = { key: string; label: string; max: number };
const defaultCategories: GradeCategory[] = [
  { key: "taskPeriod1", label: "مهام فترة 1", max: 40 },
  { key: "taskPeriod2", label: "مهام فترة 2", max: 40 },
  { key: "examPeriod1", label: "اختبار فترة 1", max: 20 },
  { key: "examPeriod2", label: "اختبار فترة 2", max: 20 },
  { key: "finalExam", label: "اختبار نهائي", max: 40 },
];

const scoreFields: Array<{ key: keyof GradebookStudent; max: number }> = [
  { key: "taskPeriod1", max: 40 },
  { key: "taskPeriod2", max: 40 },
  { key: "examPeriod1", max: 20 },
  { key: "examPeriod2", max: 20 },
  { key: "finalExam", max: 40 },
];

export function GradebookTable({
  divisionName,
  students,
  subject,
  teacherId,
  allDivisionCodes = [],
  readOnly = false,
}: {
  divisionName: string;
  students: GradebookRow[];
  subject: string;
  teacherId?: string;
  allDivisionCodes?: string[];
  readOnly?: boolean;
}) {
  const { locale } = useLanguage();
  const { showToast: exportToast, updateToast } = useToast();
  const labels =
    locale === "ar"
      ? {
          readOnly: "مراجعة كشف المعلم للقراءة فقط",
          active: "كشف الدرجات الحالي",
          fullMarks: "إعطاء العلامة الكاملة",
          export: "تصدير Excel",
          pdf: "طباعة PDF",
          exportAll: "قوالب جميع الشعب",
          empty: "لا يوجد طلاب في هذا الفصل.",
          period: "الفترة",
          period1: "الفترة الأولى",
          period2: "الفترة الثانية",
          both: "الفترتان",
        }
      : {
          readOnly: "Read-only teacher inspection",
          active: "Active gradebook",
          fullMarks: "Give full marks",
          export: "Export Excel",
          pdf: "Print PDF",
          exportAll: "All division templates",
          empty: "No students in this division.",
          period: "Period",
          period1: "Period 1",
          period2: "Period 2",
          both: "Both periods",
        };
  const [rows, setRows] = useState(students);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState<"success" | "error" | null>(null);
  const [finalMaximum, setFinalMaximum] = useState(100);
  const [categorySettings, setCategorySettings] =
    useState<GradeCategory[]>(defaultCategories);
  const [customScores, setCustomScores] = useState<
    Record<string, Record<string, number | null>>
  >({});
  const [selectedPeriod, setSelectedPeriod] = useState<GradebookPeriod>("both");
  const settingsKey = `thabat-gradebook-settings-${teacherId ?? getSession()?.id ?? "unassigned"}-${divisionName}-${subject}`;
  const scoresKey = `thabat-gradebook-scores-${teacherId ?? getSession()?.id ?? "unassigned"}-${divisionName}-${subject}`;
  const draftKey = `thabat-gradebook-draft-${teacherId ?? getSession()?.id ?? "unassigned"}-${divisionName}-${subject}`;
  const legacyKey = `thabat-gradebook-${teacherId ?? getSession()?.id ?? "unassigned"}-${divisionName}-${subject}`;
  useEffect(() => {
    let active = true;
    const ownerId = teacherId ?? "unassigned";
    void fetch(
      `/api/gradebook?divisionId=${encodeURIComponent(divisionName)}&subject=${encodeURIComponent(subject)}&teacherId=${encodeURIComponent(ownerId)}`,
    )
      .then((response) => response.json())
      .then((json) => {
        if (!active) return;
        const apiScores = json.data ?? [];
        const scores = new Map(
          apiScores.map(
            (
              score: GradebookStudent & {
                customScores?: Record<string, number | null>;
              },
            ) => [score.studentId, score],
          ),
        );
        const apiCustomScores = Object.fromEntries(
          apiScores.map(
            (
              score: GradebookStudent & {
                customScores?: Record<string, number | null>;
              },
            ) => [score.studentId, score.customScores ?? {}],
          ),
        );
        setCustomScores((current) => ({ ...current, ...apiCustomScores }));
        const draft = JSON.parse(
          localStorage.getItem(draftKey) ?? "null",
        ) as Record<string, Partial<GradebookStudent>> | null;
        setRows(
          students.map((student) => ({
            ...student,
            ...(scores.get(student.id) ?? {}),
            ...(draft?.[student.id] ?? {}),
          })),
        );
      })
      .catch(() => {
        if (active) setRows(students);
      });
    return () => {
      active = false;
    };
  }, [divisionName, students, subject]);

  useEffect(() => {
    try {
      const savedSettings = JSON.parse(
        localStorage.getItem(settingsKey) ??
          localStorage.getItem(legacyKey) ??
          "null",
      ) as {
        finalMaximum?: number;
        fields?: GradeCategory[];
        categories?: GradeCategory[];
      } | null;
      const savedScores = JSON.parse(
        localStorage.getItem(scoresKey) ?? "null",
      ) as Record<string, Record<string, number | null>> | null;
      const draft = JSON.parse(
        localStorage.getItem(draftKey) ?? "null",
      ) as Record<string, Partial<GradebookStudent>> | null;
      if (savedSettings) {
        const fields = savedSettings.fields ?? [
          ...defaultCategories,
          ...(savedSettings.categories ?? []),
        ];
        setFinalMaximum(savedSettings.finalMaximum ?? 100);
        setCategorySettings(fields);
        localStorage.setItem(
          settingsKey,
          JSON.stringify({
            finalMaximum: savedSettings.finalMaximum ?? 100,
            fields,
          }),
        );
      }
      if (savedScores) setCustomScores(savedScores);
      if (draft)
        setRows((current) =>
          current.map((row) => ({ ...row, ...(draft[row.id] ?? {}) })),
        );
    } catch {
      /* Ignore malformed local gradebook settings. */
    }
  }, [settingsKey, scoresKey, legacyKey, draftKey]);

  const updateScore = (
    studentId: string,
    field: keyof GradebookStudent,
    value: string,
  ) => {
    const parsed = value === "" ? null : Math.max(0, Number(value));
    const score =
      categorySettings.find((item) => item.key === field) ??
      scoreFields.find((item) => item.key === field);
    const bounded =
      parsed === null || !score ? parsed : Math.min(score.max, parsed);
    setRows((current) =>
      current.map((row) => {
        if (row.id !== studentId) return row;
        const nextRow = { ...row, [field]: bounded };
        localStorage.setItem(
          draftKey,
          JSON.stringify({
            ...JSON.parse(localStorage.getItem(draftKey) ?? "{}"),
            [studentId]: { [field]: bounded },
          }),
        );
        return nextRow;
      }),
    );
  };

  const saveCustomization = () => {
    localStorage.setItem(
      settingsKey,
      JSON.stringify({ finalMaximum, fields: categorySettings }),
    );
    localStorage.setItem(scoresKey, JSON.stringify(customScores));
    setMessage(
      locale === "ar" ? "تم حفظ إعدادات الدرجات." : "Grade settings saved.",
    );
  };
  const syncCustomization = (useDefault = false) => {
    const fields = useDefault ? defaultCategories : categorySettings;
    const maximum = useDefault ? 100 : finalMaximum;
    if (useDefault) {
      setFinalMaximum(maximum);
      setCategorySettings(fields);
      setCustomScores({});
    }
    const ownerId = teacherId ?? getSession()?.id ?? "unassigned";
    const divisions = Array.from(new Set(allDivisionCodes.length ? allDivisionCodes : [divisionName]));
    divisions.forEach((code) => localStorage.setItem(`thabat-gradebook-settings-${ownerId}-${code}-${subject}`, JSON.stringify({ finalMaximum: maximum, fields })));
    setMessage(locale === "ar" ? `تمت مزامنة الإعداد مع ${divisions.length} شعبة.` : `Preset synced to ${divisions.length} divisions.`);
  };
  const useDefaultPreset = () => {
    setFinalMaximum(100);
    setCategorySettings(defaultCategories);
    setCustomScores({});
  };
  const addColumn = () =>
    setCategorySettings((current) => [
      ...current,
      {
        key: `custom-${Date.now()}`,
        label: locale === "ar" ? "عمود جديد" : "New column",
        max: 10,
      },
    ]);
  const visibleCategories = categorySettings
    .filter((category) =>
      scoreFields.some((field) => field.key === category.key),
    )
    .filter(
      (category) =>
        selectedPeriod === "both" ||
        (selectedPeriod === "period1"
          ? category.key.endsWith("Period1") || category.key === "finalExam"
          : category.key.endsWith("Period2") || category.key === "finalExam"),
    );
  const configuredMaximum = visibleCategories.reduce(
    (sum, category) => sum + category.max,
    0,
  );
  const giveFullMarks = () => {
    const nextRows = rows.map((row) => {
      const nextRow = { ...row } as GradebookStudent;
      visibleCategories.forEach((category) => {
        if (scoreFields.some((field) => field.key === category.key))
          (nextRow as unknown as Record<string, number | string | null>)[category.key] = category.max;
      });
      return nextRow;
    });
    const nextCustomScores = { ...customScores };
    rows.forEach((row) => {
      const nextCustom = { ...(nextCustomScores[row.id] ?? {}) };
      visibleCategories.forEach((category) => {
        if (!scoreFields.some((field) => field.key === category.key))
          nextCustom[category.key] = category.max;
      });
      nextCustomScores[row.id] = nextCustom;
    });
    setRows(nextRows);
    setCustomScores(nextCustomScores);
    void saveScores(nextRows, nextCustomScores);
  };
  const setColumnScore = (
    studentId: string,
    column: GradeCategory,
    value: string,
  ) => {
    const parsed =
      value === "" ? null : Math.min(column.max, Math.max(0, Number(value)));
    if (scoreFields.some((field) => field.key === column.key))
      updateScore(studentId, column.key as keyof GradebookStudent, value);
    else
      setCustomScores((current) => ({
        ...current,
        [studentId]: { ...current[studentId], [column.key]: parsed },
      }));
  };
  const showToast = (kind: "success" | "error") => {
    setToast(kind);
    window.setTimeout(() => setToast(null), 3500);
  };
  const saveScores = async (
    rowsToSave = rows,
    customScoresToSave = customScores,
  ): Promise<boolean> => {
    const actorId = teacherId ?? getSession()?.id;
    if (!actorId) {
      showToast("error");
      return false;
    }
    setSaving(true);
    setMessage("");
    localStorage.setItem(
      settingsKey,
      JSON.stringify({ finalMaximum, fields: categorySettings }),
    );
    localStorage.setItem(scoresKey, JSON.stringify(customScoresToSave));
    const fixedFields = categorySettings.filter(({ key }) =>
      scoreFields.some((field) => field.key === key),
    );
    let responses: Response[] = [];
    try {
      responses = [await fetch("/api/gradebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          divisionId: divisionName,
          subject,
          teacherId: actorId,
          updatedBy: actorId,
          entries: rowsToSave.map((row) => ({
            studentId: row.id,
            fields: Object.fromEntries(fixedFields.map(({ key }) => [key, row[key as keyof GradebookStudent] ?? null])),
            customScores: customScoresToSave[row.id] ?? {},
          })),
        }),
      })];
    } catch {
      showToast("error");
      setMessage(locale === "ar" ? "فشل في حفظ الدرجات، يرجى المحاولة مرة أخرى" : "Failed to save grades, please try again");
      setSaving(false);
      return false;
    }
    const saved =
      responses.length > 0 && responses.every((response) => response.ok);
    if (saved) {
      const response = await fetch(
        `/api/gradebook?divisionId=${encodeURIComponent(divisionName)}&subject=${encodeURIComponent(subject)}&teacherId=${encodeURIComponent(actorId)}`,
      );
      if (!response.ok) {
        showToast("error");
        setMessage(locale === "ar" ? "فشل في حفظ الدرجات، يرجى المحاولة مرة أخرى" : "Failed to save grades, please try again");
        setSaving(false);
        return false;
      }
      const json = (await response.json()) as { data?: GradebookStudent[] };
      const persisted = new Map(
        (json.data ?? []).map((score) => [score.studentId, score]),
      );
      setRows((current) =>
        current.map((row) => ({ ...row, ...(persisted.get(row.id) ?? {}) })),
      );
    }
    if (saved) {
      showToast("success");
      setMessage(locale === "ar" ? "تم حفظ الدرجات بنجاح" : "Grades saved successfully");
    } else {
      showToast("error");
      setMessage(locale === "ar" ? "فشل في حفظ الدرجات، يرجى المحاولة مرة أخرى" : "Failed to save grades, please try again");
    }
    setSaving(false);
    return saved;
  };

  return (
    <section
      className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
      dir="rtl"
    >
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
        <div>
          <p className="text-sm text-slate-500">
            {readOnly ? labels.readOnly : labels.active}
          </p>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {divisionName}
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {!readOnly && (
            <button
              type="button"
              onClick={giveFullMarks}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Maximize2 className="h-4 w-4" />} {saving ? (locale === "ar" ? "جارٍ الحفظ..." : "Saving...") : labels.fullMarks}
            </button>
          )}
          {!readOnly && (
            <button
              type="button"
              onClick={() => void saveScores()}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-600 px-3 py-2 text-sm font-semibold text-emerald-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving
                ? locale === "ar"
                  ? "جارٍ الحفظ..."
                  : "Saving..."
                : locale === "ar"
                  ? "حفظ الدرجات"
                  : "Save grades"}
            </button>
          )}
          <button
            type="button"
            onClick={() =>
              void runExport(() => exportGradebookToExcel(divisionName, rows, [], customScores, finalMaximum, categorySettings, selectedPeriod), exportToast, updateToast)
            }
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Download className="h-4 w-4" /> {labels.export}
          </button>
          <button
            type="button"
            onClick={() =>
              notifyPdfComingSoon(exportToast)
            }
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-600 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
          >
            <Printer className="h-4 w-4" /> {labels.pdf}
          </button>
          {!readOnly && (
            <button
              type="button"
              onClick={() =>
                void runExport(() => exportEmptyGradebookTemplates(allDivisionCodes), exportToast, updateToast)
              }
              disabled={!allDivisionCodes.length}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {labels.exportAll}
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
          {labels.period}:
        </span>
        {(["period1", "period2", "both"] as GradebookPeriod[]).map((period) => (
          <button
            key={period}
            type="button"
            onClick={() => setSelectedPeriod(period)}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${selectedPeriod === period ? "bg-emerald-600 text-white shadow-sm" : "border border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"}`}
          >
            {period === "period1"
              ? labels.period1
              : period === "period2"
                ? labels.period2
                : labels.both}
          </button>
        ))}
      </div>
      {!readOnly && (
        <details className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <Settings className="h-4 w-4 text-emerald-600" />
            {locale === "ar" ? "تخصيص نظام الدرجات" : "Customize grading"}
          </summary>
          <div className="mt-4 space-y-4 rounded-lg bg-slate-50 p-4 dark:bg-slate-800/60">
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-sm font-semibold">
                {locale === "ar"
                  ? "النتيجة النهائية من"
                  : "Final result out of"}
                <input
                  type="number"
                  min="1"
                  value={finalMaximum}
                  onChange={(event) =>
                    setFinalMaximum(
                      Math.max(1, Number(event.target.value) || 1),
                    )
                  }
                  className="mt-1 block w-32 rounded-lg border px-3 py-2 dark:bg-slate-900"
                />
              </label>
              <button
                type="button"
                onClick={useDefaultPreset}
                className="rounded-lg border px-3 py-2 text-sm"
              >
                {locale === "ar"
                  ? "استخدام الإعداد الافتراضي"
                  : "Use default preset"}
              </button>
                  <button type="button" onClick={() => syncCustomization()} disabled={!allDivisionCodes.length} className="inline-flex items-center gap-2 rounded-lg border border-emerald-600 px-3 py-2 text-sm font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"><RefreshCw className="h-4 w-4" />{locale === "ar" ? "مزامنة مع كل الشعب" : "Sync to all divisions"}</button>
                  <button type="button" onClick={() => syncCustomization(true)} disabled={!allDivisionCodes.length} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-200">{locale === "ar" ? "الافتراضي لكل الشعب" : "Default for all divisions"}</button>
            </div>
            <div className="space-y-2">
              {categorySettings.map((column, index) => (
                <div
                  key={column.key}
                  className="flex flex-wrap items-end gap-2"
                >
                  <label className="flex-1 text-xs font-semibold">
                    {locale === "ar" ? "اسم العمود" : "Column name"}
                    <input
                      value={column.label}
                      onChange={(event) =>
                        setCategorySettings((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, label: event.target.value }
                              : item,
                          ),
                        )
                      }
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm dark:bg-slate-900"
                    />
                  </label>
                  <label className="text-xs font-semibold">
                    {locale === "ar" ? "الحد الأعلى" : "Maximum"}
                    <input
                      type="number"
                      min="1"
                      value={column.max}
                      onChange={(event) =>
                        setCategorySettings((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? {
                                  ...item,
                                  max: Math.max(
                                    1,
                                    Number(event.target.value) || 1,
                                  ),
                                }
                              : item,
                          ),
                        )
                      }
                      className="mt-1 w-28 rounded-lg border px-3 py-2 text-sm dark:bg-slate-900"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setCategorySettings((current) =>
                        current.filter((item) => item.key !== column.key),
                      )
                    }
                    aria-label={
                      locale === "ar" ? "حذف العمود" : "Remove column"
                    }
                    className="rounded-lg border border-red-300 p-2 text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addColumn}
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-600 px-3 py-2 text-sm font-semibold text-emerald-700"
              >
                <Plus className="h-4 w-4" />
                {locale === "ar" ? "إضافة عمود" : "Add column"}
              </button>
            </div>
            <p className="text-xs text-slate-500">
              {locale === "ar"
                ? `مجموع درجات الأعمدة: ${configuredMaximum}`
                : `Total column points: ${configuredMaximum}`}
            </p>
            <button
              type="button"
              onClick={saveCustomization}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
            >
              {locale === "ar"
                ? "حفظ إعدادات الدرجات"
                : "Save grading settings"}
            </button>
          </div>
        </details>
      )}
      {message && (
        <p
          role="status"
          className="border-b border-slate-200 px-4 py-2 text-sm text-emerald-700 dark:border-slate-800"
        >
          {message}
        </p>
      )}
      {toast && (
        <div role="status" aria-live="polite" className={`fixed end-5 top-5 z-[1200] rounded-xl border px-4 py-3 text-sm font-semibold shadow-xl ${toast === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200" : "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/60 dark:text-red-200"}`}>
          {toast === "success" ? (locale === "ar" ? "تم حفظ الدرجات بنجاح" : "Grades saved successfully") : (locale === "ar" ? "فشل في حفظ الدرجات، يرجى المحاولة مرة أخرى" : "Failed to save grades, please try again")}
        </div>
      )}
      <div className="space-y-3 p-3 md:hidden">
        {rows.map((row, index) => {
          const rawTotal = visibleCategories.reduce((sum, category) => sum + Number(row[category.key as keyof GradebookStudent] ?? 0), 0);
          const total = configuredMaximum ? Math.round((rawTotal / configuredMaximum) * finalMaximum * 100) / 100 : 0;
          return (
            <article key={row.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
              <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3 dark:border-slate-700">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-500">#{index + 1}</p>
                  <h3 className="truncate font-bold text-slate-900 dark:text-white">{row.fullName}</h3>
                  <p className="text-xs text-slate-500">{locale === "ar" ? "المعدل التراكمي" : "GPA"}: {row.gpa ?? "-"}</p>
                </div>
                <div className="shrink-0 rounded-lg bg-emerald-100 px-3 py-2 text-center dark:bg-emerald-950/50">
                  <p className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">{locale === "ar" ? "المجموع" : "Total"}</p>
                  <p className="font-bold text-emerald-800 dark:text-emerald-200">{total}</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {visibleCategories.map(({ key, label, max }) => (
                  <label key={key} className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <span className="mb-1 block truncate">{label} <span className="font-normal text-slate-400">/ {max}</span></span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={(scoreFields.some((field) => field.key === key) ? row[key as keyof GradebookStudent] : customScores[row.id]?.[key]) ?? ""}
                      disabled={readOnly}
                      onChange={(event) => setColumnScore(row.id, { key, label, max }, event.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-center text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:disabled:bg-slate-800"
                      aria-label={`${row.fullName} ${String(key)}`}
                    />
                  </label>
                ))}
              </div>
            </article>
          );
        })}
        {!rows.length && <p className="py-8 text-center text-sm text-slate-500">{labels.empty}</p>}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-[1100px] w-full text-sm">
          <thead className="bg-[#9BBB59]/20 text-slate-900 dark:text-slate-100">
            <tr>
              {[
                "م",
                "اسم الطالب",
                "المعدل التراكمي",
                ...visibleCategories.map(
                  (category) => `${category.label} (${category.max})`,
                ),
                `المجموع النهائي (${finalMaximum})`,
              ].map((header) => (
                <th
                  key={header}
                  className="border-b border-slate-200 px-3 py-3 text-center font-bold dark:border-slate-700"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const rawTotal = visibleCategories.reduce(
                (sum, category) =>
                  sum +
                  Number(row[category.key as keyof GradebookStudent] ?? 0),
                0,
              );
              const total =
                Math.round(
                  (rawTotal / configuredMaximum) * finalMaximum * 100,
                ) / 100;
              return (
                <tr
                  key={row.id}
                  className="border-b border-slate-100 dark:border-slate-800"
                >
                  <td className="px-3 py-2 text-center">{index + 1}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right font-semibold">
                    {row.fullName}
                  </td>
                  <td className="px-3 py-2 text-center">{row.gpa ?? "-"}</td>
                  {visibleCategories.map(({ key, max }) => (
                    <td key={key} className="px-2 py-2 text-center">
                      <input
                        type="text"
                        inputMode="decimal"
                        minLength={0}
                        maxLength={8}
                        value={
                          (scoreFields.some((field) => field.key === key)
                            ? row[key as keyof GradebookStudent]
                            : customScores[row.id]?.[key]) ?? ""
                        }
                        disabled={readOnly}
                        onChange={(event) =>
                          setColumnScore(
                            row.id,
                            { key, label: "", max },
                            event.target.value,
                          )
                        }
                        className="w-20 rounded-md border border-slate-300 bg-white px-2 py-2 text-center outline-none focus:border-emerald-500 disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:disabled:bg-slate-800"
                        aria-label={`${row.fullName} ${String(key)}`}
                      />
                    </td>
                  ))}
                  <td className="px-3 py-2 text-center font-bold text-emerald-700 dark:text-emerald-400">
                    {total}
                  </td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr>
                <td
                  colSpan={visibleCategories.length + 4}
                  className="px-4 py-10 text-center text-slate-500"
                >
                  {labels.empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
