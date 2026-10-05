'use client'

import { BookOpen, GraduationCap, Languages, ShieldCheck, Sparkles } from 'lucide-react'
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
    { icon: BookOpen, title: 'Dashboard navigation', description: 'Overview, Students, Teams, and Divisions now share a wider animated tab bar. On phones, use the menu button; the selected tab is highlighted.' },
    { icon: GraduationCap, title: 'Student grade labels', description: 'When a saved grade is missing, division prefixes 1xx, 2xx, and 3xx display First, Second, and Third Secondary.' },
    { icon: ShieldCheck, title: 'Sign-in session check', description: 'The animated session check runs after a successful sign-in and does not replay when revisiting the dashboard.' },
    { icon: Sparkles, title: 'Loading feedback', description: 'Reports, Thabat Log, and Reports Center use a shared cube loader with language-aware text and theme-aware colors.' },
    { icon: Languages, title: 'Mobile and theme polish', description: 'Mobile menus have clearer outlines and selected states. The team-add control is easier to see in light and dark themes.' },
  ] : [
    { icon: BookOpen, title: 'التنقل في لوحة التحكم', description: 'أصبحت نظرة عامة والطلاب والفرق والفصول ضمن شريط تنقل أعرض ومتحرك. على الهاتف، استخدم زر القائمة مع تمييز التبويب المحدد.' },
    { icon: GraduationCap, title: 'أسماء المراحل الدراسية', description: 'عند عدم وجود مرحلة محفوظة، تُستنتج من رمز الشعبة: 1xx للأول الثانوي، و2xx للثاني الثانوي، و3xx للثالث الثانوي.' },
    { icon: ShieldCheck, title: 'التحقق من الجلسة', description: 'يظهر تحقق الجلسة المتحرك بعد تسجيل الدخول بنجاح، ولا يعاد تشغيله عند العودة إلى لوحة التحكم.' },
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
