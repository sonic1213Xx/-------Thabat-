'use client'

import { useMemo, useState } from 'react'
import { BookOpen, Coffee, Search, Users } from 'lucide-react'
import { useLanguage } from '@/components/language-provider'
import { getProfiles } from '@/lib/auth'

export default function TeachersLoungePage() {
  const { dir, locale } = useLanguage()
  const english = locale === 'en'
  const [query, setQuery] = useState('')
  const teachers = getProfiles().filter((profile) => profile.role === 'TEACHER')
  const visibleTeachers = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase()
    if (!normalized) return teachers
    return teachers.filter((teacher) => `${teacher.name} ${teacher.subject ?? ''} ${(teacher.assigned_divisions ?? []).join(' ')}`.toLocaleLowerCase().includes(normalized))
  }, [query, teachers])
  const labels = english ? { eyebrow: 'Staff directory', title: "Teachers' lounge", description: 'A shared view of the teaching team and their assigned divisions.', search: 'Search teachers', placeholder: 'Search by name, subject, or division', teachers: 'teachers', subject: 'Subject', divisions: 'Assigned divisions', noSubject: 'Subject not specified', noDivisions: 'No divisions assigned', empty: 'No teachers match your search.' } : { eyebrow: 'دليل الموظفين', title: 'استراحة المعلمين', description: 'مساحة مشتركة للتعرف على فريق التعليم والشعب المسندة لكل معلم.', search: 'البحث عن معلم', placeholder: 'ابحث بالاسم أو المادة أو الشعبة', teachers: 'معلمين', subject: 'المادة', divisions: 'الشعب المسندة', noSubject: 'لم تحدد المادة', noDivisions: 'لا توجد شعب مسندة', empty: 'لا يوجد معلمون مطابقون للبحث.' }

  return <div className="space-y-6" dir={dir}>
    <header className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-sm"><div className="relative z-10 flex flex-wrap items-end justify-between gap-5"><div><div className="mb-3 flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white"><Coffee className="h-5 w-5" /></span><span className="text-sm font-semibold uppercase tracking-wider text-primary">{labels.eyebrow}</span></div><h1 className="text-3xl font-bold tracking-tight">{labels.title}</h1><p className="mt-2 max-w-xl text-sm text-card-foreground/65">{labels.description}</p></div><div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/50 px-4 py-3"><Users className="h-5 w-5 text-primary" /><div><p className="text-2xl font-bold leading-none">{teachers.length}</p><p className="mt-1 text-xs text-card-foreground/60">{labels.teachers}</p></div></div></div></header>
    <section className="rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm"><label className="block text-xs font-bold text-card-foreground/65">{labels.search}<div className="relative mt-2 max-w-xl"><Search className="absolute start-3 top-3 h-4 w-4 text-card-foreground/40" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={labels.placeholder} aria-label={labels.search} className="w-full rounded-xl border border-border bg-card px-3 py-2.5 ps-9 text-sm outline-none focus:border-primary" /></div></label></section>
    {visibleTeachers.length ? <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visibleTeachers.map((teacher) => <article key={teacher.id} className="rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted text-lg font-bold text-primary">{teacher.name.slice(0, 1)}</div><div className="min-w-0"><h2 className="truncate text-lg font-bold">{teacher.name}</h2><p className="mt-1 text-sm text-card-foreground/60">{teacher.subject || labels.noSubject}</p></div></div><div className="mt-5 space-y-3 border-t border-border/60 pt-4 text-sm"><div className="flex items-center gap-2 text-card-foreground/70"><BookOpen className="h-4 w-4 shrink-0 text-primary" /><span className="font-semibold">{labels.divisions}:</span></div><div className="flex flex-wrap gap-2">{teacher.assigned_divisions?.length ? teacher.assigned_divisions.map((division) => <span key={division} className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">{division}</span>) : <span className="text-card-foreground/50">{labels.noDivisions}</span>}</div></div></article>)}</section> : <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-12 text-center text-sm text-card-foreground/60">{labels.empty}</div>}
  </div>
}