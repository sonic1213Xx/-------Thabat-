'use client'

import { BookOpen, CheckCircle2, Download, Eye, GraduationCap, Languages, RefreshCw, Search, ShieldCheck, Sparkles, Trash2 } from 'lucide-react'
import { useLanguage } from '@/components/language-provider'

type UpdateEntry = {
  icon: typeof BookOpen
  title: string
  description: string
}

export function UpdateLogTab() {
  const { locale } = useLanguage()
  const english = locale === 'en'
  const entries: UpdateEntry[] = english ? [
    { icon: Search, title: 'Faster student search', description: 'Student searches now match separate name words across student names, academic IDs, and divisions, so first-and-last-name searches work without typing middle names. Suggestions are capped for responsive typing across roster, referrals, attendance, warnings, and print-related forms.' },
    { icon: CheckCircle2, title: 'Quicker student bulk actions', description: 'Student selection checks are smaller, and bulk actions stay pinned to the top of the content while scrolling.' },
    { icon: Sparkles, title: 'Contextual loading feedback', description: 'Warnings, Teacher Referrals, and Vice Principal data areas use a shared cube loader without hiding page titles or surrounding controls.' },
    { icon: BookOpen, title: 'Vice Principal workspace', description: 'Student search and the exit permit log are easier to reach near the top. Search results scroll independently, the search field is less visually heavy, and the empty permit message is clearer.' },
    { icon: Download, title: 'One-page PDF downloads', description: 'Vice Principal documents now download directly as one-page PDFs, include the configured school name and logo, and render signatures in dark ink.' },
    { icon: RefreshCw, title: 'New version notice', description: 'A small dismissible banner checks for newer website builds and offers a refresh without blocking the current page.' },
    { icon: GraduationCap, title: 'Attendance divisions and grades', description: 'Teacher division assignments are normalized so class rosters load correctly. Attendance and the Dashboard Divisions tab infer grade labels from division codes when a student grade is missing.' },
    { icon: Eye, title: 'Creator profile controls', description: 'Creator verification passwords can be shown or hidden, and profile loading now distinguishes authentication or server errors from an empty list.' },
    { icon: CheckCircle2, title: 'In-place report status updates', description: 'Report status saves update the card without reloading the list, show per-report progress and success feedback, and persist through the server.' },
    { icon: Trash2, title: 'Permanent report deletion', description: 'The Creator can confirm a permanent report deletion. The shared database record is deleted, so it will not appear in the reporter’s next fetch.' },
    { icon: BookOpen, title: 'Dashboard navigation', description: 'Overview, Students, Teams, and Divisions now share a wider animated tab bar. On phones, use the menu button; the selected tab is highlighted.' },
    { icon: GraduationCap, title: 'Student grade labels', description: 'When a saved grade is missing, division prefixes 1xx, 2xx, and 3xx display First, Second, and Third Secondary.' },
    { icon: ShieldCheck, title: 'One-time sign-in animation', description: 'The sign-in joke plays only once per account. Its completion is stored server-side, so it does not replay on another device or later sign-ins.' },
    { icon: Sparkles, title: 'Loading feedback', description: 'Reports, Thabat Log, and Reports Center use a shared cube loader with language-aware text and theme-aware colors.' },
    { icon: Languages, title: 'Mobile and theme polish', description: 'Mobile menus have clearer outlines and selected states. The team-add control is easier to see in light and dark themes.' },
  ] : [
    { icon: Search, title: 'بحث أسرع عن الطلاب', description: 'يطابق البحث كلمات الاسم بشكل مستقل مع الاسم والرقم الأكاديمي والشعبة، ويمكن العثور على الطالب بالاسم الأول والأخير دون كتابة الأسماء الوسطى. كما تُحدّ الاقتراحات لتحسين سرعة الكتابة في كشف الطلاب والإحالات والحضور والإنذارات ونماذج الطباعة.' },
    { icon: CheckCircle2, title: 'إجراءات جماعية أسهل للطلاب', description: 'أصبحت مربعات تحديد الطلاب أصغر، وتبقى قائمة الإجراءات الجماعية مثبتة أعلى مساحة المحتوى أثناء التمرير.' },
    { icon: Sparkles, title: 'مؤشرات تحميل في مواضعها', description: 'تستخدم مناطق البيانات في الإنذارات وإحالات المعلمين ومركز وكيل شؤون الطلاب حركة مكعب موحدة دون إخفاء العناوين أو عناصر التحكم.' },
    { icon: BookOpen, title: 'تحسين مركز وكيل شؤون الطلاب', description: 'أصبح البحث وسجل تصاريح الخروج أسهل وصولاً قرب أعلى الصفحة. تمرر نتائج البحث بشكل مستقل، وأصبح حقل البحث أخف بصرياً ورسالة عدم وجود تصاريح أوضح.' },
    { icon: Download, title: 'تنزيل المستندات PDF بصفحة واحدة', description: 'تُنزّل مستندات وكيل المدرسة مباشرة بصيغة PDF من صفحة واحدة، مع اسم المدرسة وشعارها والتوقيعات بلون واضح.' },
    { icon: RefreshCw, title: 'إشعار الإصدار الجديد', description: 'يتحقق إشعار صغير قابل للإخفاء من وجود إصدار أحدث للموقع ويتيح تحديث الصفحة دون تعطيل العمل الحالي.' },
    { icon: GraduationCap, title: 'الشعب والمرحلة في الحضور', description: 'تُوحّد رموز الشعب المكلف بها المعلم لتحميل كشف الفصل، وتُستنتج المرحلة في الحضور ولوحة الفصول من رمز الشعبة عند غيابها عن بيانات الطالب.' },
    { icon: Eye, title: 'أدوات ملفات المُنشئ', description: 'يمكن إظهار كلمة مرور التحقق أو إخفاؤها، كما تميّز قائمة الملفات بين أخطاء الدخول أو الخادم وبين القائمة الفارغة.' },
    { icon: CheckCircle2, title: 'تحديث حالة البلاغ دون إعادة تحميل', description: 'تُحدّث حالة البلاغ في مكانها مع مؤشر حفظ وحركة نجاح خاصة به، وتُحفظ الحالة على الخادم لتبقى عند العودة.' },
    { icon: Trash2, title: 'حذف البلاغ نهائياً', description: 'يمكن للمُنشئ تأكيد حذف البلاغ نهائياً من قاعدة البيانات المشتركة، ولن يظهر لصاحب البلاغ عند تحميل القائمة.' },
    { icon: BookOpen, title: 'التنقل في لوحة التحكم', description: 'أصبحت نظرة عامة والطلاب والفرق والفصول ضمن شريط تنقل أعرض ومتحرك. على الهاتف، استخدم زر القائمة مع تمييز التبويب المحدد.' },
    { icon: GraduationCap, title: 'أسماء المراحل الدراسية', description: 'عند عدم وجود مرحلة محفوظة، تُستنتج من رمز الشعبة: 1xx للأول الثانوي، و2xx للثاني الثانوي، و3xx للثالث الثانوي.' },
    { icon: ShieldCheck, title: 'حركة دخول لمرة واحدة', description: 'تظهر مزحة تسجيل الدخول مرة واحدة لكل حساب، ويُحفظ ذلك على الخادم حتى لا تتكرر على جهاز آخر أو عند تسجيل الدخول لاحقاً.' },
    { icon: Sparkles, title: 'مؤشرات التحميل', description: 'تعرض التقارير وسجل ثَبَت ومركز البلاغات حركة مكعب موحدة بنصوص حسب اللغة وألوان حسب السمة.' },
    { icon: Languages, title: 'تحسينات الهاتف والسمات', description: 'أصبحت قوائم الهاتف أوضح مع تمييز التبويب النشط، كما أصبح زر إضافة الفريق أسهل رؤية في السمتين الفاتحة والداكنة.' },
  ]

  return (
    <section className="space-y-4" aria-labelledby="dashboard-updates-heading">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">{english ? 'Thabat' : 'ثَبَت'}</p>
        <h2 id="dashboard-updates-heading" className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{english ? 'Recent updates' : 'أحدث التحديثات'}</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{english ? 'Recent improvements to the interface and everyday workflows.' : 'أبرز التحسينات على الواجهة وسير العمل اليومي.'}</p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2">
        {entries.map(({ icon: Icon, title, description }) => (
          <article key={title} className="rounded-xl border border-border bg-card p-4 text-card-foreground">
            <div className="flex items-start gap-3">
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-1 text-sm leading-6 text-card-foreground/70">{description}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
