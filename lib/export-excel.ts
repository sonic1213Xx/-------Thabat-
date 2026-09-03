import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

export type StudentRecord = {
  fullName?: string | null
  academicId?: string | number | null
  nationalId?: string | number | null
  divisionCode?: string | null
  classGroup?: string | number | null
  behaviorScore?: number | null
  attendanceScore?: number | null
  warnings?: Array<{ type?: string | null; reason?: string | null; isResolved?: boolean | null; issuedAt?: string | Date | null }>
  attendance?: Array<{ status?: string | null }>
}

const headers = ['م', 'اسم الطالب', 'الرقم الأكاديمي / رقم الهوية', 'درجات السلوك', 'درجات المواظبة', 'إجمالي الغياب', 'عدد الإنذارات', 'نوع المخالفة', 'سبب/تفاصيل الإنذار']
const emerald = 'FF065F46'
const darkEmerald = 'FF047857'
const headerEmerald = 'FF059669'
const zebraEmerald = 'FFF0FDF4'
const borderGray = 'FFD1D5DB'
const warningTypeLabels: Record<string, string> = {
  TARDINESS: 'تأخر',
  ABSENCE: 'غياب',
  CONDUCT: 'مخالفة سلوكية',
  ACADEMIC_FAILURE: 'تعثر دراسي',
  DISRUPTIVE: 'إخلال بالنظام',
  CLASSROOM_EXIT: 'خروج من الفصل',
  UNIFORM_VIOLATION: 'مخالفة الزي',
  OTHER: 'أخرى',
}

const getGradeName = (section: string) => {
  if (section.startsWith('1')) return 'الصف الأول الثانوي'
  if (section.startsWith('2')) return 'الصف الثاني الثانوي'
  if (section.startsWith('3')) return 'الصف الثالث الثانوي'
  return 'المرحلة الثانوية'
}

const getSection = (student: StudentRecord) => String(student.classGroup ?? student.divisionCode ?? '').trim() || 'غير محدد'

const getIdCellValue = (student: StudentRecord): string | number => {
  const rawId = student.academicId ?? student.nationalId
  if (rawId === null || rawId === undefined || String(rawId).trim() === '') return ''
  const normalizedId = String(rawId).trim()
  const numericId = Number(normalizedId)
  return Number.isFinite(numericId) ? numericId : normalizedId
}

const getActiveWarnings = (student: StudentRecord) => student.warnings?.filter((warning) => !warning.isResolved) ?? []

const getWarningType = (warning: NonNullable<StudentRecord['warnings']>[number]) => warning.type ? warningTypeLabels[warning.type] ?? warning.type : ''

const getWarningValues = (student: StudentRecord) => {
  const warnings = getActiveWarnings(student)
  return {
    types: warnings.map(getWarningType).filter(Boolean).join(' / ') || '-',
    reasons: warnings.map((warning) => warning.reason?.trim()).filter(Boolean).join(' / ') || '-',
    count: warnings.length,
  }
}

const getAbsenceCount = (student: StudentRecord) => student.attendance?.filter((record) => record.status === 'ABSENT_UNEXCUSED' || record.status === 'ABSENT_EXCUSED').length ?? 0

const applyBorders = (row: ExcelJS.Row) => row.eachCell((cell) => {
  cell.border = {
    top: { style: 'thin', color: { argb: borderGray } },
    left: { style: 'thin', color: { argb: borderGray } },
    bottom: { style: 'thin', color: { argb: borderGray } },
    right: { style: 'thin', color: { argb: borderGray } },
  }
})

export function createThabatExcelWorkbook(students: StudentRecord[]): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('تقرير ثبات', { views: [{ rightToLeft: true }] })
  const titleFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: emerald } }

  worksheet.mergeCells('A1:I1')
  worksheet.getCell('A1').value = 'نظام ثبات - تقرير المواظبة والسلوك مقسم حسب الصفوف والشعب'
  worksheet.getCell('A1').fill = titleFill
  worksheet.getCell('A1').font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } }
  worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' }
  worksheet.getRow(1).height = 28

  worksheet.mergeCells('A2:I2')
  worksheet.getCell('A2').value = `تاريخ التقرير: ${new Date().toISOString().split('T')[0]} | وزارة التعليم - المملكة العربية السعودية`
  worksheet.getCell('A2').fill = titleFill
  worksheet.getCell('A2').font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FFBFDBFE' } }
  worksheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' }
  worksheet.getRow(2).height = 20

  const grouped = new Map<string, StudentRecord[]>()
  students.forEach((student) => {
    const section = getSection(student)
    grouped.set(section, [...(grouped.get(section) ?? []), student])
  })
  const sections = [...grouped.keys()].sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))
  const widths = [6, 30, 26, 14, 14, 14, 14, 24, 34]

  sections.forEach((section) => {
    const bannerRow = worksheet.addRow([`📌 ${getGradeName(section)} — الشعبة (${section})`])
    worksheet.mergeCells(`A${bannerRow.number}:I${bannerRow.number}`)
    const bannerCell = worksheet.getCell(`A${bannerRow.number}`)
    bannerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: darkEmerald } }
    bannerCell.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FFFFFFFF' } }
    bannerCell.alignment = { horizontal: 'right', vertical: 'middle' }
    bannerRow.height = 24

    const headerRow = worksheet.addRow(headers)
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerEmerald } }
      cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    })
    applyBorders(headerRow)
    headerRow.height = 24

    grouped.get(section)?.forEach((student, index) => {
      const warningValues = getWarningValues(student)
      const row = worksheet.addRow([
        index + 1,
        student.fullName ?? '',
        getIdCellValue(student),
        student.behaviorScore ?? 0,
        student.attendanceScore ?? 0,
        getAbsenceCount(student),
        warningValues.count,
        warningValues.types,
        warningValues.reasons,
      ])
      row.eachCell((cell, columnNumber) => {
        cell.font = { name: 'Arial', size: 11, color: { argb: 'FF111827' } }
        cell.alignment = { horizontal: columnNumber === 2 || columnNumber === 8 || columnNumber === 9 ? 'right' : 'center', vertical: 'middle', wrapText: columnNumber === 8 || columnNumber === 9 }
        if (index % 2 === 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraEmerald } }
      })
      row.getCell(3).numFmt = '0'
      applyBorders(row)
    })
    worksheet.addRow([])
  })

  worksheet.columns.forEach((column, index) => { column.width = widths[index] })
  return workbook
}

export async function exportThabatExcelReport(students: StudentRecord[]): Promise<void> {
  const workbook = createThabatExcelWorkbook(students)
  const buffer = await workbook.xlsx.writeBuffer()
  saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'thabat-report.xlsx')
}
