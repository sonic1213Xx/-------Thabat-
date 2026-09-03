'use client'

export function TabLoadingSkeleton() {
  return (
    <div className="min-h-[320px] w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="h-7 w-40 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
        <div className="h-10 w-32 animate-pulse rounded-lg bg-emerald-100 dark:bg-emerald-900/30" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-4 flex items-center justify-between">
              <div className="h-10 w-10 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
              <div className="h-4 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            </div>
            <div className="space-y-3">
              <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function StudentsLoadingSkeleton() {
  return (
    <div className="min-h-[520px] w-full space-y-6" dir="rtl" aria-busy="true" aria-label="Loading students">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <div className="h-9 w-52 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
          <div className="h-4 w-72 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-24 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
          <div className="h-10 w-32 animate-pulse rounded-lg bg-emerald-100 dark:bg-emerald-900/30" />
        </div>
      </div>

      <div className="flex gap-2 rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
        <div className="h-10 w-52 animate-pulse rounded-lg bg-emerald-100 dark:bg-emerald-900/30" />
        <div className="h-10 w-44 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="h-5 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="h-10 w-64 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
            <div className="h-10 w-44 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-7 gap-4 bg-slate-50 px-4 py-4 dark:bg-slate-800">
          {Array.from({ length: 7 }).map((_, index) => <div key={index} className="h-4 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />)}
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {Array.from({ length: 7 }).map((_, rowIndex) => (
            <div key={rowIndex} className="students-loading-row grid grid-cols-7 items-center gap-4 px-4 py-5">
              {Array.from({ length: 7 }).map((__, cellIndex) => <div key={cellIndex} className={`h-4 animate-pulse rounded bg-slate-200 dark:bg-slate-700 ${cellIndex === 0 ? 'w-32' : 'w-full'}`} />)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function DivisionsLoadingSkeleton() {
  return (
    <div className="min-h-[520px] w-full space-y-6" dir="rtl" aria-busy="true" aria-label="Loading divisions">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-3">
          <div className="h-9 w-44 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
          <div className="h-4 w-72 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        </div>
        <div className="h-10 w-32 animate-pulse rounded-lg bg-emerald-100 dark:bg-emerald-900/30" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between">
              <div className="space-y-3">
                <div className="h-4 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-8 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
              </div>
              <div className="flex gap-2"><div className="h-8 w-8 animate-pulse rounded-md bg-slate-200 dark:bg-slate-700" /><div className="h-8 w-8 animate-pulse rounded-md bg-slate-200 dark:bg-slate-700" /></div>
            </div>
            <div className="mt-5 space-y-3"><div className="h-4 animate-pulse rounded bg-slate-200 dark:bg-slate-700" /><div className="h-4 animate-pulse rounded bg-slate-200 dark:bg-slate-700" /></div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-5 flex items-center justify-between"><div className="h-6 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-700" /><div className="h-9 w-9 animate-pulse rounded-lg bg-emerald-100 dark:bg-emerald-900/30" /></div>
        <div className="grid grid-cols-5 gap-4 bg-slate-50 px-4 py-4 dark:bg-slate-800">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-4 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />)}</div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">{Array.from({ length: 5 }).map((_, rowIndex) => <div key={rowIndex} className="grid grid-cols-5 gap-4 px-4 py-5">{Array.from({ length: 5 }).map((__, cellIndex) => <div key={cellIndex} className="h-4 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />)}</div>)}</div>
      </div>
    </div>
  )
}
