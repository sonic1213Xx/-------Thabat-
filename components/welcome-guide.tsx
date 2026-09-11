'use client'

import { useEffect, useState } from 'react'
import { BookOpen, CheckCircle2, ClipboardCheck, DoorOpen, FileWarning, GraduationCap, Languages, Lightbulb, MessageSquare, Printer, ScrollText, Settings, ShieldCheck, Sparkles, Users } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { useLanguage } from '@/components/language-provider'
import { getSession, WELCOME_LOGIN_KEY } from '@/lib/auth'

type GuideSection = { icon: typeof Sparkles; title: string; body: string }

export function WelcomeGuide() {
  const { locale, dir } = useLanguage()
  const [open, setOpen] = useState(false)
  const english = locale === 'en'

  useEffect(() => {
    const session = getSession()
    const loginId = window.localStorage.getItem(WELCOME_LOGIN_KEY)
    if (!session || !loginId) return
    const seenKey = `${WELCOME_LOGIN_KEY}:seen:${loginId}`
    if (window.localStorage.getItem(seenKey) === 'true') return
    window.localStorage.setItem(seenKey, 'true')
    setOpen(true)
  }, [])

  const sections: GuideSection[] = english ? [
    { icon: Users, title: 'Dashboard and people', body: 'Use the dashboard overview to see the school at a glance. Students lets you search, add, edit, import, transfer, review records, and manage gradebooks. Teams and Divisions organize the school structure.' },
    { icon: ClipboardCheck, title: 'Attendance', body: 'School attendance records the daily school roll. Classroom Attendance lets teachers mark their assigned classes by subject and division, review saved sessions, and correct attendance when needed.' },
    { icon: GraduationCap, title: 'Gradebooks', body: 'Teachers can select a subject and division, enter task and exam scores, add custom columns, apply full marks, save scores, and export gradebook templates. Teachers Lounge and Student Inspection let authorized users review the correct teacher, subject, division, and saved scores.' },
    { icon: DoorOpen, title: 'Gate passes', body: 'The Vice Principal Center can issue an exit permit, record the student, parent, reason, date, and time, print the permit with its QR code, and cancel it when necessary. Security can scan and process the pass.' },
    { icon: FileWarning, title: 'Student conduct and referrals', body: 'Record incidents, behavior details, locations, witnesses, violation levels, deductions, pledges, and parent summonses. Teachers can send a student referral to the Vice Principal for review and follow-up.' },
    { icon: BookOpen, title: 'Vice Principal Center', body: 'Authorized Vice Principals can manage exit permits, incident records, behavior follow-up, student searches, and official school documents from one place.' },
    { icon: ScrollText, title: 'Audit trail', body: 'The Thabat Log records important changes such as student updates, transfers, warnings, attendance edits, gradebook changes, referrals, imports, and sign-ins. Use filters to find a date, user, action, or record type.' },
    { icon: MessageSquare, title: 'Reports Center', body: 'Every signed-in user can privately submit a bug, fix request, or suggestion. Users only see their own reports. The Creator sees all reports, adds progress notes, and moves them between Open, In Progress, Resolved, and Closed.' },
    { icon: Printer, title: 'Official documents and printing', body: 'Official MOE documents, referral forms, gate passes, attendance records, gradebooks, and exports are available from their relevant workflows. Print previews are designed for A4 output, signatures, QR codes, and school records.' },
    { icon: Settings, title: 'Profiles and assignments', body: 'Profiles store the user identity, role, subjects, teaching assignments, divisions, signatures, locale, and other settings. Teachers manage their own subjects and assigned divisions. Creator and authorized administrators manage roles and profiles.' },
    { icon: ShieldCheck, title: 'Roles and privacy', body: 'Access follows the assigned role. Teachers see their own working areas and private reports. Vice Principals see their operational tools. The Creator has system-wide management access, including all support reports and permissions.' },
    { icon: Languages, title: 'Arabic and English', body: 'Use the language control to switch the interface. Navigation labels, forms, guidance, statuses, dates, and the welcome guide follow the selected language.' },
    { icon: Lightbulb, title: 'Data and reliability', body: 'Profile subjects and teaching assignments remain saved while browsing dashboard tabs. Gradebook reads use the selected teacher, subject, division, and student records so saved data stays attached to the correct owner.' },
  ] : [
    { icon: Users, title: 'لوحة التحكم والأشخاص', body: 'تعرض لوحة التحكم ملخصاً سريعاً للمدرسة. تتيح صفحة الطلاب البحث والإضافة والتعديل والاستيراد والنقل ومراجعة السجلات وكشوف الدرجات. وتساعدك صفحات الفرق والشعب على تنظيم هيكل المدرسة.' },
    { icon: ClipboardCheck, title: 'الحضور', body: 'يسجل حضور المدرسة الحضور اليومي العام. ويتيح حضور الفصول للمعلمين تسجيل حضور الفصول المسندة حسب المادة والشعبة، ومراجعة الجلسات المحفوظة وتعديل الحضور عند الحاجة.' },
    { icon: GraduationCap, title: 'كشوف الدرجات', body: 'يمكن للمعلم اختيار المادة والشعبة وإدخال درجات المهام والاختبارات وإضافة أعمدة مخصصة وتعبئة الدرجات الكاملة وحفظ الدرجات وتصدير القوالب. كما يمكن للمستخدمين المخولين مراجعة كشف المعلم والمادة والشعبة والدرجات المحفوظة.' },
    { icon: DoorOpen, title: 'تصاريح الخروج', body: 'يستطيع مركز وكيل شؤون الطلاب إصدار تصريح خروج وتسجيل الطالب وولي الأمر والسبب والتاريخ والوقت، ثم طباعة التصريح مع رمز QR وإلغائه عند الحاجة. ويمكن للأمن مسح التصريح ومعالجة الخروج.' },
    { icon: FileWarning, title: 'السلوك والإحالات', body: 'سجل الوقائع والتفاصيل والموقع والشهود ودرجة المخالفة والحسم والتعهدات واستدعاءات أولياء الأمور. ويمكن للمعلم إرسال إحالة الطالب إلى وكيل المدرسة للمراجعة والمتابعة.' },
    { icon: BookOpen, title: 'مركز وكيل شؤون الطلاب', body: 'يستطيع الوكلاء المخولون إدارة تصاريح الخروج وسجلات الوقائع ومتابعة السلوك والبحث عن الطلاب وطباعة المستندات الرسمية من مكان واحد.' },
    { icon: ScrollText, title: 'سجل العمليات', body: 'يسجل سجل ثَبَت التغييرات المهمة مثل تعديل الطلاب ونقلهم والإنذارات وتعديل الحضور وتغييرات الدرجات والإحالات والاستيراد وتسجيل الدخول. استخدم الفلاتر للبحث بالتاريخ أو المستخدم أو الإجراء أو نوع السجل.' },
    { icon: MessageSquare, title: 'مركز البلاغات', body: 'يمكن لكل مستخدم مسجل إرسال بلاغ خاص عن خطأ أو طلب إصلاح أو اقتراح. يرى المستخدم بلاغاته فقط، بينما يرى المنشئ جميع البلاغات ويضيف الملاحظات ويغير الحالة بين مفتوح وقيد المعالجة وتم الحل ومغلق.' },
    { icon: Printer, title: 'المستندات والطباعة', body: 'تتوفر مستندات وزارة التعليم ونماذج الإحالة وتصاريح الخروج وسجلات الحضور وكشوف الدرجات والتصديرات من مساراتها. صممت معاينات الطباعة لتناسب ورق A4 والتوقيعات ورموز QR والسجلات المدرسية.' },
    { icon: Settings, title: 'الملفات والإسنادات', body: 'تحفظ الملفات هوية المستخدم والدور والمواد والشعب والتوقيعات واللغة والإعدادات الأخرى. يدير المعلم مواده وشعبه، بينما يدير المنشئ والإداريون المخولون الأدوار والملفات.' },
    { icon: ShieldCheck, title: 'الأدوار والخصوصية', body: 'يتحدد الوصول حسب الدور. يرى المعلم أدواته وبلاغاته الخاصة فقط، ويرى الوكيل أدوات العمليات الخاصة به، بينما يملك المنشئ صلاحيات الإدارة الشاملة بما فيها جميع بلاغات الدعم والصلاحيات.' },
    { icon: Languages, title: 'العربية والإنجليزية', body: 'استخدم زر اللغة للتبديل بين الواجهتين. تتبع القوائم والنماذج والإرشادات والحالات والتواريخ ودليل الترحيب اللغة المختارة.' },
    { icon: Lightbulb, title: 'حفظ البيانات والاعتمادية', body: 'تبقى مواد المعلم وإسناداته محفوظة أثناء التنقل بين تبويبات لوحة التحكم. وتستخدم كشوف الدرجات المعلم والمادة والشعبة والطلاب المحددين حتى تبقى الدرجات مرتبطة بصاحبها الصحيح.' },
  ]

  const close = () => setOpen(false)
  return <Modal open={open} onOpenChange={(nextOpen) => { if (!nextOpen) close() }} className="max-w-3xl">
    <div dir={dir} className="max-h-[82vh] overflow-y-auto pe-1">
      <header className="border-b border-border pb-5"><div className="flex items-start gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-white"><Sparkles className="h-6 w-6" /></div><div><p className="text-sm font-bold uppercase tracking-wider text-primary">{english ? 'Thabat School Operations' : 'نظام ثَبَت للتشغيل المدرسي'}</p><h2 className="mt-1 text-2xl font-bold">{english ? 'Welcome to the final launch 🎉' : 'مرحباً بك في الإطلاق الرسمي 🎉'}</h2><p className="mt-2 text-sm leading-6 text-card-foreground/65">{english ? 'The website has finally launched. Here is the complete guide to what is available and how the system works.' : 'تم إطلاق الموقع أخيراً. إليك الدليل الكامل لما تمت إضافته وكيف يعمل النظام.'}</p></div></div></header>
      <div className="grid gap-3 py-5 sm:grid-cols-2">{sections.map(({ icon: Icon, title, body }) => <section key={title} className="rounded-xl border border-border bg-muted/25 p-4"><div className="flex items-start gap-3"><Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div><h3 className="font-bold">{title}</h3><p className="mt-1 text-sm leading-6 text-card-foreground/70">{body}</p></div></div></section>)}</div>
      <footer className="sticky bottom-0 border-t border-border bg-card pt-4"><button type="button" onClick={close} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:opacity-90"><CheckCircle2 className="h-4 w-4" />{english ? 'I have read the guide and understand' : 'قرأت الدليل وفهمت'}</button></footer>
    </div>
  </Modal>
}