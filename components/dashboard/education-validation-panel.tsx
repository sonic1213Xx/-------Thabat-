"use client";

import {
  ExternalLink,
  Globe2,
  GraduationCap,
  ShieldCheck,
} from "lucide-react";
import { useLanguage } from "@/components/language-provider";

export function EducationValidationPanel() {
  const { locale } = useLanguage();
  const arabic = locale === "ar";
  const text = arabic
    ? {
        eyebrow: "مرجع التحقق التعليمي",
        title: "المراحل الدراسية والتحقق من الشهادات",
        intro: "مرجع سريع يوضح مسار الطالب، ومصدر التحقق الرسمي، والفرق بين الشهادة المحلية والأجنبية.",
        progression: "تدرج الصفوف والمسارات",
        primary: "الابتدائي",
        primaryGrades: "الصفوف 1-6",
        primaryDetail: "تقويم مستمر وإتقان المهارات",
        intermediate: "المتوسط",
        intermediateGrades: "الصفوف 7-9",
        intermediateDetail: "اختبارات فصلية وشهادة المرحلة المتوسطة",
        secondary: "الثانوي",
        secondaryGrades: "الصفوف 10-12",
        secondaryDetail: "نظام المسارات (Masarat) والدبلوم الثانوي",
        domestic: "التحقق المحلي",
        noorTitle: "منصة نور هي المصدر الرسمي",
        noorDetail: "استخدم noor.moe.gov.sa للتحقق من سجل الطالب، وحالة الترفيع، وكشوف الدرجات الرقمية الموثقة برمز QR.",
        noorLink: "فتح منصة نور",
        university: "القبول في التعليم العالي",
        universityDetail: "يُبنى احتساب الأهلية الجامعية على النسبة المركبة التي تجمع بين العناصر التالية حسب أوزان الجهة التعليمية:",
        gpa: "معدل الثانوية",
        qudrat: "قدرات",
        qudratDetail: "اختبار القدرات العامة من هيئة تقويم التعليم والتدريب ETEC",
        tahsili: "التحصيلي",
        tahsiliDetail: "اختبار التحصيل الدراسي من هيئة تقويم التعليم والتدريب ETEC",
        foreign: "معادلة الشهادة الأجنبية",
        foreignDetail: "هذا مسار مستقل عن التحقق من الشهادة السعودية المحلية:",
        step1: "1. بلد الإصدار",
        step1Detail: "تصديق وزارة التعليم أو وزارة الخارجية في بلد الإصدار.",
        step2: "2. السفارة السعودية",
        step2Detail: "تصديق المستند لدى سفارة المملكة العربية السعودية.",
        step3: "3. ترجمة معتمدة",
        step3Detail: "إرفاق ترجمة عربية معتمدة للشهادة والمرفقات.",
        step4: "4. بوابة المعادلات",
        step4Detail: "رفع الملف عبر بوابة معادلة الشهادات التابعة لوزارة التعليم.",
      }
    : {
        eyebrow: "Education validation reference",
        title: "Grade progression and certificate validation",
        intro: "A quick reference for student progression, official validation sources, and the difference between domestic and foreign certificates.",
        progression: "Grade progression and structure",
        primary: "Primary",
        primaryGrades: "Grades 1-6",
        primaryDetail: "Continuous assessment and skill mastery",
        intermediate: "Intermediate",
        intermediateGrades: "Grades 7-9",
        intermediateDetail: "Semester exams and the Intermediate School Certificate",
        secondary: "Secondary",
        secondaryGrades: "Grades 10-12",
        secondaryDetail: "Masarat pathways and the High School Diploma",
        domestic: "Domestic validation",
        noorTitle: "Noor is the official source of truth",
        noorDetail: "Use noor.moe.gov.sa to verify student records, promotion status, and QR-verified digital transcripts.",
        noorLink: "Open Noor platform",
        university: "University matriculation",
        universityDetail: "Higher education eligibility uses a composite score combining the following components according to the institution's published weights:",
        gpa: "High School GPA",
        qudrat: "Qudrat",
        qudratDetail: "General Aptitude Test administered by ETEC",
        tahsili: "Tahsili",
        tahsiliDetail: "Scholastic Achievement Admission Test administered by ETEC",
        foreign: "Foreign certificate equivalency (Mu'adalah)",
        foreignDetail: "This is a separate workflow from domestic Saudi certificate validation:",
        step1: "1. Issuing country",
        step1Detail: "Attestation by the issuing country's Ministry of Education or Ministry of Foreign Affairs.",
        step2: "2. Saudi Embassy",
        step2Detail: "Attestation by the Saudi Embassy in the issuing country.",
        step3: "3. Certified translation",
        step3Detail: "Attach a certified Arabic translation of the certificate and supporting documents.",
        step4: "4. MoE equivalency portal",
        step4Detail: "Submit the complete file through the Ministry of Education certificate equivalency portal.",
      };

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950">
        <p className="text-sm font-semibold text-emerald-600">{text.eyebrow}</p>
        <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{text.title}</h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">{text.intro}</p>
      </div>

      <div className="p-5">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-emerald-600" />
          <h3 className="font-bold">{text.progression}</h3>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {[
            [text.primary, text.primaryGrades, text.primaryDetail],
            [text.intermediate, text.intermediateGrades, text.intermediateDetail],
            [text.secondary, text.secondaryGrades, text.secondaryDetail],
          ].map(([stage, grades, detail]) => (
            <div key={stage} className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
              <p className="font-semibold text-slate-900 dark:text-white">{stage}</p>
              <p className="mt-1 text-sm font-medium text-emerald-700 dark:text-emerald-400">{grades}</p>
              <p className="mt-2 text-sm text-slate-500">{detail}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <h3 className="font-bold">{text.domestic}</h3>
            </div>
            <p className="mt-3 font-semibold">{text.noorTitle}</p>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{text.noorDetail}</p>
            <a
              href="https://noor.moe.gov.sa"
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
            >
              {text.noorLink}
              <ExternalLink className="h-4 w-4" />
            </a>
            <div className="mt-4 border-t border-emerald-200 pt-4 dark:border-emerald-900">
              <p className="font-semibold">{text.university}</p>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{text.universityDetail}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {[
                  [text.gpa, "GPA"],
                  [text.qudrat, text.qudratDetail],
                  [text.tahsili, text.tahsiliDetail],
                ].map(([label, detail]) => (
                  <div key={label} className="rounded-md border border-emerald-200 bg-white p-3 text-sm dark:border-emerald-900 dark:bg-slate-900">
                    <p className="font-semibold">{label}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-sky-200 bg-sky-50/60 p-4 dark:border-sky-900 dark:bg-sky-950/20">
            <div className="flex items-center gap-2">
              <Globe2 className="h-5 w-5 text-sky-600" />
              <h3 className="font-bold">{text.foreign}</h3>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{text.foreignDetail}</p>
            <ol className="mt-4 space-y-3">
              {[
                [text.step1, text.step1Detail],
                [text.step2, text.step2Detail],
                [text.step3, text.step3Detail],
                [text.step4, text.step4Detail],
              ].map(([step, detail]) => (
                <li key={step} className="border-s border-sky-300 ps-3 dark:border-sky-800">
                  <p className="text-sm font-semibold">{step}</p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{detail}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
