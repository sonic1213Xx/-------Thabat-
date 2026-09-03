"use client";

import { useEffect, useState } from "react";
import { Pencil, Printer, X } from "lucide-react";
import { createPortal } from "react-dom";
import {
  getProfileSignature,
  getSession,
  saveProfileSignature,
} from "@/lib/auth";
import { SignatureCanvas } from "@/components/ui/signature-canvas";

type DocumentData = {
  studentName: string;
  divisionCode?: string | null;
  academicId?: string | null;
  details?: string;
  reason?: string;
  date?: string;
  degree?: string;
  parentName?: string;
};
type SignTarget = "administrator" | "student" | "parent";
const fieldClass =
  "pointer-events-auto relative z-20 w-full rounded-lg border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:border-slate-700";

export function MoeDocument({
  type,
  data,
  onClose,
}: {
  type: "pledge" | "incident" | "summon";
  data: DocumentData;
  onClose: () => void;
}) {
  const titles = {
    pledge: "تعهد سلوكي",
    incident: "محضر ضبط واقعة",
    summon: "استدعاء ولي أمر",
  };
  const [schoolName, setSchoolName] = useState("المدرسة الثانوية");
  const [studentName, setStudentName] = useState(data.studentName);
  const [divisionCode, setDivisionCode] = useState(data.divisionCode ?? "");
  const [academicId, setAcademicId] = useState(data.academicId ?? "");
  const [parentName, setParentName] = useState(data.parentName ?? "");
  const [documentDate, setDocumentDate] = useState(
    data.date ?? new Date().toISOString().slice(0, 10),
  );
  const [degree, setDegree] = useState(data.degree ?? "");
  const [documentText, setDocumentText] = useState(
    data.details ||
      data.reason ||
      "أقر أنا ولي أمر الطالب بمتابعة السلوك والالتزام بالتعليمات واللوائح المدرسية.",
  );
  const [notes, setNotes] = useState("");
  const [administratorSignature, setAdministratorSignature] = useState<
    string | null
  >(null);
  const [studentSignature, setStudentSignature] = useState<string | null>(null);
  const [parentSignature, setParentSignature] = useState<string | null>(null);
  const [signing, setSigning] = useState<SignTarget | null>(null);
  const [mounted, setMounted] = useState(false);
  const canUseProfileSignature =
    getSession()?.role === "PRINCIPAL" ||
    getSession()?.role === "VICE_PRINCIPAL";
  useEffect(() => {
    setMounted(true);
    setAdministratorSignature(
      canUseProfileSignature ? getProfileSignature() : null,
    );
    const sync = () =>
      setAdministratorSignature(
        canUseProfileSignature ? getProfileSignature() : null,
      );
    window.addEventListener("thabat-profile-signature-changed", sync);
    return () =>
      window.removeEventListener("thabat-profile-signature-changed", sync);
  }, [canUseProfileSignature]);
  const signatures = {
    administrator: administratorSignature,
    student: studentSignature,
    parent: parentSignature,
  };
  const saveSignature = (signature: string, saveAsDefault = false) => {
    if (signing === "administrator") {
      setAdministratorSignature(signature);
      if (saveAsDefault && canUseProfileSignature)
        saveProfileSignature(signature);
    } else if (signing === "student") setStudentSignature(signature);
    else if (signing === "parent") setParentSignature(signature);
    setSigning(null);
  };
  if (!mounted) return null;
  return createPortal(
    <>
      <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 pointer-events-auto overflow-y-auto"
      onClick={onClose}
      >
        <div
          className="relative z-10 w-full max-w-[210mm] bg-white text-slate-900 shadow-2xl rounded-sm p-10 dir-rtl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="max-h-[80vh] overflow-y-auto p-2">
            <article
              id="moe-document"
              className="mx-auto max-w-3xl text-slate-900"
              dir="rtl"
            >
              <header className="border-b-2 border-slate-900 pb-5 text-center">
                <p className="font-bold">المملكة العربية السعودية</p>
                <p>وزارة التعليم · إدارة التعليم</p>
                <label className="mt-3 block text-sm font-semibold">
                  اسم المدرسة
                  <input
                    type="text"
                    value={schoolName}
                    onChange={(event) => setSchoolName(event.target.value)}
                    className={`${fieldClass} mt-1 text-center cursor-text`}
                  />
                </label>
                <h1 className="mt-5 text-2xl font-bold">{titles[type]}</h1>
              </header>
              <section className="mt-8 grid gap-4 text-sm sm:grid-cols-2">
                <label>
                  اسم الطالب
                  <input
                    type="text"
                    value={studentName}
                    onChange={(event) => setStudentName(event.target.value)}
                    className={`${fieldClass} mt-1 cursor-text`}
                  />
                </label>
                <label>
                  الفصل / الشعبة
                  <input
                    type="text"
                    value={divisionCode}
                    onChange={(event) => setDivisionCode(event.target.value)}
                    className={`${fieldClass} mt-1 cursor-text`}
                  />
                </label>
                <label>
                  الرقم الأكاديمي
                  <input
                    type="text"
                    value={academicId}
                    onChange={(event) => setAcademicId(event.target.value)}
                    className={`${fieldClass} mt-1 cursor-text`}
                  />
                </label>
                <label>
                  التاريخ
                  <input
                    type="date"
                    value={documentDate}
                    onChange={(event) => setDocumentDate(event.target.value)}
                    className={`${fieldClass} mt-1 cursor-text`}
                  />
                </label>
                {degree && (
                  <label>
                    درجة المخالفة
                    <input
                      type="text"
                      value={degree}
                      onChange={(event) => setDegree(event.target.value)}
                      className={`${fieldClass} mt-1 cursor-text`}
                    />
                  </label>
                )}
                <label>
                  اسم ولي الأمر
                  <input
                    type="text"
                    value={parentName}
                    onChange={(event) => setParentName(event.target.value)}
                    placeholder="اكتب اسم ولي الأمر هنا..."
                    className={`${fieldClass} mt-1 cursor-text`}
                  />
                </label>
              </section>
              <label className="mt-8 block text-sm font-semibold">
                نص المستند والوصف
                <textarea
                  value={documentText}
                  onChange={(event) => setDocumentText(event.target.value)}
                  rows={6}
                  placeholder="اكتب تفاصيل المستند..."
                  className={`${fieldClass} mt-2 resize-y cursor-text leading-8`}
                />
              </label>
              <label className="mt-4 block text-sm font-semibold">
                ملاحظات إضافية
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  placeholder="ملاحظات اختيارية"
                  className={`${fieldClass} mt-2 resize-y cursor-text`}
                />
              </label>
              <div className="mt-10 grid gap-6 text-sm sm:grid-cols-3">
                <SignatureField
                  label="توقيع الطالب"
                  signature={signatures.student}
                  onClick={() => setSigning("student")}
                />
                <SignatureField
                  label="توقيع ولي الأمر"
                  signature={signatures.parent}
                  onClick={() => setSigning("parent")}
                />
                <SignatureField
                  label={
                    canUseProfileSignature
                      ? "توقيع وكيل شؤون الطلاب / المدير"
                      : "توقيع المسؤول"
                  }
                  signature={signatures.administrator}
                  onClick={() => setSigning("administrator")}
                />
              </div>
              <p className="mt-8 text-center text-xs text-slate-500">
                ختم المدرسة: __________________
              </p>
            </article>
          </div>
          <footer className="mt-4 flex justify-end gap-3 border-t border-slate-200 pt-4 print:hidden">
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-lg bg-emerald-600 px-5 py-3 font-semibold text-white"
            >
              <Printer className="me-2 inline h-4 w-4" />
              طباعة
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-5 py-3 dark:border-slate-700"
            >
              <X className="me-2 inline h-4 w-4" />
              إغلاق
            </button>
          </footer>
        </div>
      </div>
      {signing && (
        <SignatureCanvas
          initialSignature={signatures[signing]}
          showDefaultOption={
            signing === "administrator" && canUseProfileSignature
          }
          onCancel={() => setSigning(null)}
          onSave={saveSignature}
        />
      )}
    </>,
    window.document.body,
  );
}

function SignatureField({
  label,
  signature,
  onClick,
}: {
  label: string;
  signature: string | null;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="pointer-events-auto relative min-h-24 cursor-pointer rounded-lg border border-dashed border-slate-300 p-3 text-right hover:border-emerald-500"
    >
      <span className="block text-xs font-semibold">{label}</span>
      {signature ? (
        <img
          src={signature}
          alt={label}
          className="mt-2 h-14 w-full object-contain"
        />
      ) : (
        <span className="mt-6 block text-xs text-slate-400">
          <Pencil className="me-1 inline h-3 w-3" />
          ارسم التوقيع يدوياً
        </span>
      )}
      {signature && (
        <span className="absolute end-2 top-2 rounded bg-white/80 p-1 text-[10px] text-emerald-700">
          <Pencil className="inline h-3 w-3" /> تغيير التوقيع
        </span>
      )}
    </button>
  );
}
