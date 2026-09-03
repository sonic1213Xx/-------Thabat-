"use client";

import { Check, Plus, Trash2 } from "lucide-react";
import type { TeachingAssignment } from "@/lib/auth";
import { StyledSelect } from "@/components/ui/styled-select";

export function TeachingAssignmentEditor({
  assignments,
  divisions,
  locale,
  onChange,
}: {
  assignments: TeachingAssignment[];
  divisions: string[];
  locale: "ar" | "en";
  onChange: (assignments: TeachingAssignment[]) => void;
}) {
  const addAssignment = () =>
    onChange([
      ...assignments,
      {
        id: `assignment-${Date.now()}`,
        subject: "",
        gradeLevel: null,
        divisions: [],
        attendance: true,
        gradebook: true,
      },
    ]);
  const update = (id: string, changes: Partial<TeachingAssignment>) =>
    onChange(
      assignments.map((assignment) =>
        assignment.id === id ? { ...assignment, ...changes } : assignment,
      ),
    );
  const gradeOptions = [1, 2, 3];
  return (
    <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4 sm:col-span-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-card-foreground">
            {locale === "ar"
              ? "المواد والشعب المكلف بها"
              : "Teaching assignments"}
          </h3>
          <p className="text-xs text-card-foreground/60">
            {locale === "ar"
              ? "أنشئ كشفاً مستقلاً لكل مادة وشعبة."
              : "Create a separate gradebook for each subject and division."}
          </p>
        </div>
        <button
          type="button"
          onClick={addAssignment}
          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" />
          {locale === "ar" ? "إضافة مادة" : "Add subject"}
        </button>
      </div>
      {assignments.length === 0 && (
        <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-card-foreground/60">
          {locale === "ar"
            ? "لم تتم إضافة مواد بعد."
            : "No teaching assignments yet."}
        </p>
      )}
      {assignments.map((assignment) => (
        <div
          key={assignment.id}
          className="space-y-3 rounded-xl border border-border bg-card p-3"
        >
          <div className="flex items-start gap-2">
            <div className="grid flex-1 gap-2 sm:grid-cols-2">
              <label className="text-xs font-semibold text-card-foreground">
                {locale === "ar" ? "المادة" : "Subject"}
                <input
                  value={assignment.subject}
                  onChange={(event) =>
                    update(assignment.id, { subject: event.target.value })
                  }
                  placeholder={
                    locale === "ar" ? "مثال: الرياضيات" : "e.g. Mathematics"
                  }
                  className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-card-foreground"
                />
              </label>
              <label className="text-xs font-semibold text-card-foreground">
                {locale === "ar" ? "الصف" : "Grade"}
                <StyledSelect
                  value={assignment.gradeLevel?.toString() ?? "all"}
                  onValueChange={(value) =>
                    update(assignment.id, {
                      gradeLevel: value === "all" ? null : Number(value),
                      divisions: [],
                    })
                  }
                  placeholder={locale === "ar" ? "كل الصفوف" : "All grades"}
                  options={[
                    {
                      value: "all",
                      label: locale === "ar" ? "كل الصفوف" : "All grades",
                    },
                    ...gradeOptions.map((grade) => ({
                      value: String(grade),
                      label: locale === "ar" ? `الصف ${grade}` : `Grade ${grade}`,
                    })),
                  ]}
                  className="mt-1"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={() =>
                onChange(
                  assignments.filter((item) => item.id !== assignment.id),
                )
              }
              className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
              aria-label={locale === "ar" ? "حذف المادة" : "Remove subject"}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold text-card-foreground">
              {locale === "ar" ? "الشعب" : "Divisions"}
            </p>
            <div className="flex flex-wrap gap-2">
              {divisions
                .filter(
                  (code) =>
                    !assignment.gradeLevel ||
                    code.startsWith(String(assignment.gradeLevel)),
                )
                .map((code) => (
                  <label
                    key={code}
                    className={`cursor-pointer rounded-lg border px-3 py-2 text-xs font-semibold transition ${assignment.divisions.includes(code) ? "border-emerald-600 bg-emerald-600 text-white" : "border-border bg-card text-card-foreground hover:border-emerald-400"}`}
                  >
                    <input
                      type="checkbox"
                      checked={assignment.divisions.includes(code)}
                      onChange={() =>
                        update(assignment.id, {
                          divisions: assignment.divisions.includes(code)
                            ? assignment.divisions.filter(
                                (item) => item !== code,
                              )
                            : [...assignment.divisions, code],
                        })
                      }
                      className="sr-only"
                    />
                    {code}
                  </label>
                ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-card-foreground/70">
            <label className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 font-semibold transition ${assignment.attendance ? "border-emerald-600 bg-emerald-600 text-white shadow-sm" : "border-border bg-card text-card-foreground hover:border-emerald-400"}`}>
              <input
                type="checkbox"
                checked={assignment.attendance}
                onChange={(event) =>
                  update(assignment.id, { attendance: event.target.checked })
                }
                className="sr-only"
              />
              <span className={`flex h-4 w-4 items-center justify-center rounded border ${assignment.attendance ? "border-white bg-white text-emerald-600" : "border-slate-400 bg-transparent"}`}>
                {assignment.attendance && <Check className="h-3 w-3" />}
              </span>
              {locale === "ar" ? "تسجيل الحضور" : "Attendance access"}
            </label>
            <label className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 font-semibold transition ${assignment.gradebook ? "border-emerald-600 bg-emerald-600 text-white shadow-sm" : "border-border bg-card text-card-foreground hover:border-emerald-400"}`}>
              <input
                type="checkbox"
                checked={assignment.gradebook}
                onChange={(event) =>
                  update(assignment.id, { gradebook: event.target.checked })
                }
                className="sr-only"
              />
              <span className={`flex h-4 w-4 items-center justify-center rounded border ${assignment.gradebook ? "border-white bg-white text-emerald-600" : "border-slate-400 bg-transparent"}`}>
                {assignment.gradebook && <Check className="h-3 w-3" />}
              </span>
              {locale === "ar" ? "إدارة الدرجات" : "Gradebook access"}
            </label>
          </div>
        </div>
      ))}
    </div>
  );
}
