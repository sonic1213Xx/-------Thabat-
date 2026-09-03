export type ExportStudent = {
  fullName?: string | null
  academicId?: string | null
  nationalId?: string | null
  divisionCode?: string | null
  behaviorScore?: number | null
  attendanceScore?: number | null
  warnings?: Array<{ isResolved?: boolean | null }>
  attendance?: Array<{ status?: string | null }>
}

const headers = ['اسم الطالب', 'الرقم الأكاديمي / رقم الهوية', 'الفصل / الشعبة', 'درجات السلوك', 'درجات المواظبة', 'إجمالي الغياب', 'عدد الإنذارات']

const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`

export function generateReportCsv(students: ExportStudent[]): string {
  const rows = students.map((student) => {
    const absences = student.attendance?.filter((record) => record.status === 'ABSENT_UNEXCUSED' || record.status === 'ABSENT_EXCUSED').length ?? 0
    const activeWarnings = student.warnings?.filter((warning) => !warning.isResolved).length ?? 0
    return [
      student.fullName ?? '',
      student.academicId || student.nationalId || '',
      student.divisionCode ?? '',
      student.behaviorScore ?? 0,
      student.attendanceScore ?? 0,
      absences,
      activeWarnings,
    ].map(csvCell).join(',')
  })
  return `\uFEFF${[headers.map(csvCell).join(','), ...rows].join('\r\n')}`
}

export function downloadReportCsv(students: ExportStudent[]): void {
  const blob = new Blob([generateReportCsv(students)], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'thabat-report.csv'
  link.click()
  URL.revokeObjectURL(url)
}
