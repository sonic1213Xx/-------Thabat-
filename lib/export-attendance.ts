import { exportAttendanceWorkbook, type AttendanceExportStudent } from './export-attendance-fixed'

export type { AttendanceExportStudent }

export async function exportEmptyAttendanceTemplates(
  divisionCodes: string[],
  date: string,
  suppliedStudents: AttendanceExportStudent[] = [],
) {
  return exportAttendanceWorkbook(divisionCodes, date, suppliedStudents, {
    name: 'غير محدد',
    role: 'TEACHER',
  })
}
