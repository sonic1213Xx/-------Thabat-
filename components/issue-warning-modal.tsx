"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { StyledSelect } from "@/components/ui/styled-select";
import { getGradeLevelArabic } from "@/lib/utils";
import {
  ATTENDANCE_ESCALATIONS,
  VIOLATION_DEGREES,
  violationDeduction,
} from "@/lib/moe-rules";
import { MoeDocument } from "@/components/moe-documents";
import { useLanguage } from "@/components/language-provider";
import { getSession } from "@/lib/auth";

type Student = {
  id: string;
  fullName: string;
  academicId?: string | null;
  divisionCode?: string | null;
  gradeLevel?: number | null;
  behaviorScore?: number;
  attendanceScore?: number;
};

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-start outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950";
export function IssueWarningModal({
  students,
  onClose,
  onSaved,
}: {
  students: Student[];
  onClose: () => void;
  onSaved?: (warning: unknown) => void;
}) {
  const { t, locale } = useLanguage();
  const locationOptions = [t("classroom"), t("courtyard"), t("corridors"), t("gym"), t("cafeteria"), t("schoolBus"), t("prayerRoom")];
  const [studentId, setStudentId] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [studentPickerOpen, setStudentPickerOpen] = useState(false);
  const studentPickerRef = useRef<HTMLDivElement>(null);
  const userFocusRef = useRef(false);
  const [type, setType] = useState<"" | "BEHAVIOR" | "ABSENCE">("");
  const [degree, setDegree] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [staff, setStaff] = useState("");
  const [previewDocument, setPreviewDocument] = useState<
    "pledge" | "incident" | "summon" | null
  >(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const student = students.find((item) => item.id === studentId);
  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!studentPickerRef.current?.contains(event.target as Node))
        setStudentPickerOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  const matchingGroups = useMemo(() => {
    const query = studentSearch.trim().toLocaleLowerCase();
    const matches = query
      ? students.filter((item) =>
          `${item.fullName} ${item.academicId ?? ""} ${item.divisionCode ?? ""}`
            .toLocaleLowerCase()
            .includes(query),
        )
      : students;
    const groups = new Map<number | null, Student[]>();
    matches.forEach((item) => {
      const codeGrade = item.divisionCode?.match(/^([1-3])\d{2}$/)?.[1];
      const grade = item.gradeLevel ?? (codeGrade ? Number(codeGrade) : null);
      groups.set(grade, [...(groups.get(grade) ?? []), item]);
    });
    return Array.from(groups.entries())
      .sort(([left], [right]) => (left ?? 99) - (right ?? 99))
      .map(
        ([grade, group]) =>
          [
            grade,
            group.sort(
              (left, right) =>
                (left.divisionCode ?? "999").localeCompare(
                  right.divisionCode ?? "999",
                  undefined,
                  { numeric: true },
                ) || left.fullName.localeCompare(right.fullName),
            ),
          ] as [number | null, Student[]],
      );
  }, [studentSearch, students]);

  const deduction =
    type === "BEHAVIOR" && degree ? violationDeduction(Number(degree)) : 0;
  const preview = {
    conduct: Math.max(0, (student?.behaviorScore ?? 100) - deduction),
    attendance: student?.attendanceScore ?? 100,
  };
  const degreeOptions = VIOLATION_DEGREES.map((item) => ({
    value: String(item.degree),
    label: (
      <span dir="rtl" className="block text-right">
        {item.label} -{" "}
        {item.degree === 6
          ? "حرمان وإحالة فورية"
          : item.deduction === 1
            ? "خصم درجة واحدة"
            : item.deduction === 2
              ? "خصم درجتان"
              : item.deduction === 15
                ? "خصم 15 درجة"
                : `خصم ${item.deduction} درجات`}
      </span>
    ),
  }));
  const absenceOptions = ATTENDANCE_ESCALATIONS.map((item) => ({
    value: String(item.days),
    label: (
      <span dir="rtl" className="block text-right">
        {item.days === 15 || item.days === 20
          ? `${item.days} يوماً`
          : `${item.days} أيام`}{" "}
        -{" "}
        {item.days === 10
          ? "إنذار ثالث وتحويل للموجه الطلابي"
          : item.days === 15
            ? "إنذار نهائي وشديد اللهجة"
            : item.days === 20
              ? "إشعار بالحرمان وتحويل لإدارة التعليم"
              : item.action}
      </span>
    ),
  }));
  const selectStudent = (item: Student) => {
    setStudentId(item.id);
    setStudentSearch(item.fullName);
    setStudentPickerOpen(false);
  };
  const submit = async () => {
    if (
      !student ||
      !type ||
      !degree ||
      !staff.trim() ||
      !notes.trim() ||
      !location
    )
      return;
    const response = await fetch("/api/warnings", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-thabat-user-id": getSession()?.id ?? "" },
      body: JSON.stringify({
        studentId,
        type: type === "BEHAVIOR" ? "CONDUCT" : "ABSENCE",
        reason: `${notes} | الموقع: ${location} | المسؤول: ${staff} | التاريخ: ${date} ${time}`,
        deduction,
        severity:
          type === "BEHAVIOR" ? `DEGREE_${degree}` : `THRESHOLD_${degree}`,
      }),
    });
    if (response.ok) {
      const result = await response.json();
      onSaved?.(result.data);
      onClose();
    }
  };

  if (!mounted) return null;
  return createPortal(
    <>
      {!previewDocument && (
        <Modal
          open={true}
          onOpenChange={(open) => !open && onClose()}
          className="z-[50] max-w-2xl"
        >
          <div dir="rtl" className="space-y-5">
            <div>
              <p className="text-sm font-semibold text-emerald-600">
                {t("complianceEngine")}
              </p>
              <h2 className="text-2xl font-bold">{t("issueWarningOrViolation")}</h2>
              <p className="text-sm text-slate-500">
                {t("warningFormIntro")}
              </p>
            </div>
            <div ref={studentPickerRef} className="relative">
              <label className="mb-2 block text-sm font-semibold">{t("student")}</label>
              <Search className="absolute start-3 top-11 h-4 w-4 text-slate-400" />
              <input
                autoFocus={false}
                value={studentSearch}
                onChange={(event) => {
                  setStudentSearch(event.target.value);
                  setStudentId("");
                  if (event.target.value.trim()) setStudentPickerOpen(true);
                }}
                onPointerDown={() => {
                  userFocusRef.current = true;
                }}
                onFocus={() => {
                  if (userFocusRef.current) setStudentPickerOpen(true);
                }}
                onKeyDown={() => {
                  userFocusRef.current = true;
                  setStudentPickerOpen(true);
                }}
                placeholder={`${t("studentName")} / ${t("academicId")} / ${t("divisionCode")}`}
                role="combobox"
                aria-expanded={studentPickerOpen}
                className={`${inputClass} ps-10`}
              />
              {studentPickerOpen && (
                <div className="absolute right-0 left-0 top-full z-30 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                  {matchingGroups.length ? (
                    matchingGroups.map(([grade, group]) => (
                      <div key={grade ?? "unassigned"}>
                        <div className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-bold text-emerald-800 dark:border-slate-800 dark:bg-slate-950 dark:text-emerald-300">
                          {grade ? getGradeLevelArabic(grade) : "غير معين"}
                        </div>
                        {group.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              selectStudent(item);
                              setStudentPickerOpen(false);
                            }}
                            className="flex w-full items-center justify-between rounded-md px-3 py-2 text-start hover:bg-emerald-50 dark:hover:bg-slate-800"
                          >
                            <span>{item.fullName}</span>
                            <span className="text-xs text-emerald-700">
                              {item.divisionCode ?? "غير معين"}
                            </span>
                          </button>
                        ))}
                      </div>
                    ))
                  ) : (
                    <p className="p-3 text-sm text-slate-500">
                      {t("matchingStudentsEmpty")}
                    </p>
                  )}
                </div>
              )}
            </div>
            {student && (
              <p className="-mt-3 text-xs text-emerald-700">
                {t("student")}: {student.fullName} ·{" "}
                {student.divisionCode ?? t("unassigned")}
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="mb-2 block text-sm font-semibold">
                  {t("recordType")}
                </span>
                <StyledSelect
                  value={type}
                  onValueChange={(value) => {
                    setType(value as "BEHAVIOR" | "ABSENCE");
                    setDegree("");
                  }}
                  placeholder={t("chooseStatus")}
                  options={[
                    { value: "BEHAVIOR", label: t("behaviorViolation") },
                    { value: "ABSENCE", label: t("attendanceWarning") },
                  ]}
                />
              </label>
              <label>
                <span className="mb-2 block text-sm font-semibold">
                  {type === "BEHAVIOR"
                    ? t("warningLevel")
                    : type === "ABSENCE"
                      ? t("attendance")
                      : `${t("warningLevel")} / ${t("attendance")}`}
                </span>
                <StyledSelect
                  value={degree}
                  onValueChange={setDegree}
                  placeholder={t("chooseStatus")}
                  options={
                    type === "BEHAVIOR"
                      ? degreeOptions
                      : type === "ABSENCE"
                        ? absenceOptions
                        : []
                  }
                />
              </label>
              <label>
                <span className="mb-2 block text-sm font-semibold">
                  {t("incidentDate")}
                </span>
                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className={inputClass}
                />
              </label>
              <label>
                <span className="mb-2 block text-sm font-semibold">{t("incidentTime")}</span>
                <input
                  type="time"
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                  className={inputClass}
                />
              </label>
              <label>
                <span className="mb-2 block text-sm font-semibold">
                  {t("incidentLocation")}
                </span>
                <StyledSelect
                  value={location}
                  onValueChange={setLocation}
                  placeholder={t("selectLocation")}
                  options={locationOptions.map((item) => ({
                    value: item,
                    label: item,
                  }))}
                />
              </label>
              <label>
                <span className="mb-2 block text-sm font-semibold">
                  {t("reportingStaff")}
                </span>
                <input
                  value={staff}
                  onChange={(event) => setStaff(event.target.value)}
                  placeholder={t("staffPlaceholder")}
                  className={inputClass}
                />
              </label>
              <label className="sm:col-span-2">
                <span className="mb-2 block text-sm font-semibold">
                  {t("incidentNotes")}
                </span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder={t("notesPlaceholder")}
                  rows={3}
                  className={inputClass}
                />
              </label>
            </div>
            {student && type && degree && (
              <div className="grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-3">
                <span>
                  {t("classLabel")}: <strong>{student.divisionCode ?? t("unassigned")}</strong>
                </span>
                <span>
                  {t("conductAfterDeduction")}: <strong>{preview.conduct}/100</strong>
                </span>
                <span>
                  {t("attendanceMetric")}: <strong>{preview.attendance}/100</strong>
                </span>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={
                  !student ||
                  !type ||
                  !degree ||
                  !staff.trim() ||
                  !notes.trim() ||
                  !location
                }
                onClick={() => void submit()}
                className="w-full rounded-lg bg-amber-500 px-4 py-3 font-bold text-white disabled:opacity-50"
              >
                {t("saveRecord")}
              </button>
            </div>
            {student && type && degree && (
              <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
                <span className="w-full text-xs font-semibold text-slate-500">
                  {t("officialDocuments")}
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewDocument("pledge")}
                  className="rounded-lg border border-emerald-200 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50"
                >
                  {t("printPledge")}
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDocument("incident")}
                  className="rounded-lg border border-emerald-200 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50"
                >
                  {t("incidentReport")}
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDocument("summon")}
                  className="rounded-lg border border-emerald-200 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50"
                >
                  {t("parentSummons")}
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}
      {previewDocument && student && (
        <MoeDocument
          type={previewDocument}
          data={{
            studentName: student.fullName,
            divisionCode: student.divisionCode,
            academicId: student.academicId,
            details: notes,
            date,
            degree: type === "BEHAVIOR" ? `الدرجة ${degree}` : `${degree} أيام`,
          }}
          onClose={() => setPreviewDocument(null)}
        />
      )}
    </>,
    window.document.body,
  );
}
