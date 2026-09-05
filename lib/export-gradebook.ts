import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

export type GradebookStudent = {
  id: string
  studentId?: string
  fullName: string
  academicId?: string | null
  nationalId?: string | null
  divisionCode?: string | null
  gpa?: number | null
  taskPeriod1?: number | null
  taskPeriod2?: number | null
  examPeriod1?: number | null
  examPeriod2?: number | null
  finalExam?: number | null
}
export type GradebookCustomCategory = { key: string; label: string; max: number }
export type GradebookPeriod = 'period1' | 'period2' | 'both'

const headers = ['م', 'اسم الطلاب/ة', 'الرقم الأكاديمي', 'الهوية الوطنية', 'الشعبة', 'مشاركة - الفترة 1 (10)', 'مهام أدائية - الفترة 1 (30)', 'اختبار قصير - الفترة 1 (10)', 'جانب عملي - الفترة 1 (10)', 'مشاركة - الفترة 2 (10)', 'مهام أدائية - الفترة 2 (30)', 'اختبار قصير - الفترة 2 (10)', 'جانب عملي - الفترة 2 (10)', 'المجموع النهائي (60)']
const templateFields = headers.slice(5, 13)

export type GradebookExportMetadata = { schoolName?: string; teacherName?: string; subject?: string; principalName?: string }
export async function exportGradebookToExcel(divisionName: string, studentsData: GradebookStudent[], customCategories: GradebookCustomCategory[] = [], customScores: Record<string, Record<string, number | null>> = {}, finalMaximum = 60, configuredFields: GradebookCustomCategory[] = [], period: GradebookPeriod = 'both', metadata: GradebookExportMetadata = {}) {
  const templatePath = period === 'period1' ? '/gradebook-templates/term-1.xlsx' : period === 'period2' ? '/gradebook-templates/term-2.xlsx' : '/gradebook-templates/both-terms.xlsx'
  const templateResponse = await fetch(templatePath)
  if (templateResponse.ok) {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(await templateResponse.arrayBuffer())
    const worksheet = workbook.worksheets[0]
    worksheet.getCell('B2').value = `المادة : ${metadata.subject ?? ''}`
    worksheet.getCell('C2').value = metadata.schoolName ?? ''
    worksheet.getCell('B3').value = `المعلم : ${metadata.teacherName ?? ''}`
    worksheet.getCell('C4').value = `مدير المدرسة : ${metadata.principalName ?? ''}`
    const hasScore = (student: GradebookStudent, key: string) => customScores[student.id]?.[key] !== undefined || student[key as keyof GradebookStudent] !== undefined && student[key as keyof GradebookStudent] !== null
    const score = (student: GradebookStudent, key: string) => Number(customScores[student.id]?.[key] ?? student[key as keyof GradebookStudent] ?? 0)
    const writeTerm = (row: ExcelJS.Row, student: GradebookStudent, keys: string[], scoreColumns: string[], totalColumn: string) => {
      const values = keys.map((key) => score(student, key))
      values.forEach((value, index) => { row.getCell(scoreColumns[index]).value = hasScore(student, keys[index]) ? value : null })
      row.getCell(totalColumn).value = keys.some((key) => hasScore(student, key)) ? values.reduce((sum, value) => sum + value, 0) : null
    }
    const period1Keys = ['participationPeriod1', 'performancePeriod1', 'quizPeriod1', 'practicalPeriod1']
    const period2Keys = ['participationPeriod2', 'performancePeriod2', 'quizPeriod2', 'practicalPeriod2']
    studentsData.forEach((student, index) => {
      const row = index < 26 ? worksheet.getRow(11 + index) : worksheet.addRow([])
      if (index >= 26) {
        const templateRow = worksheet.getRow(36)
        for (let column = 1; column <= worksheet.columnCount; column += 1) row.getCell(column).style = { ...templateRow.getCell(column).style }
      }
      row.getCell('A').value = index + 1
      row.getCell('B').value = student.fullName
      row.getCell('C').value = student.academicId ?? student.studentId ?? ''
      row.getCell('D').value = student.nationalId ?? ''
      row.getCell('E').value = student.divisionCode ?? divisionName
      writeTerm(row, student, period === 'period2' ? period2Keys : period1Keys, ['F', 'G', 'H', 'I'], 'J')
      if (period === 'both') writeTerm(row, student, period2Keys, ['K', 'L', 'M', 'N'], 'O')
    })
    const buffer = await workbook.xlsx.writeBuffer()
    saveAs(new Blob([buffer]), `كشف_درجات_${divisionName}.xlsx`)
    return
  }
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet(divisionName)
  worksheet.views = [{ rtl: true } as unknown as ExcelJS.WorksheetView]
  const fields = configuredFields.length ? configuredFields : [
    { key: 'participationPeriod1', label: 'مشاركة - الفترة 1', max: 10 }, { key: 'performancePeriod1', label: 'مهام أدائية - الفترة 1', max: 30 }, { key: 'quizPeriod1', label: 'اختبار قصير - الفترة 1', max: 10 }, { key: 'practicalPeriod1', label: 'جانب عملي - الفترة 1', max: 10 },
    { key: 'participationPeriod2', label: 'مشاركة - الفترة 2', max: 10 }, { key: 'performancePeriod2', label: 'مهام أدائية - الفترة 2', max: 30 }, { key: 'quizPeriod2', label: 'اختبار قصير - الفترة 2', max: 10 }, { key: 'practicalPeriod2', label: 'جانب عملي - الفترة 2', max: 10 },
  ]
  const selectedFields = fields.filter((field) => period === 'both' || (period === 'period1' ? field.key.toLowerCase().includes('period1') || !field.key.toLowerCase().includes('period2') : field.key.toLowerCase().includes('period2') || !field.key.toLowerCase().includes('period1')))
  const exportHeaders = ['م', 'اسم الطلاب/ة', 'الرقم الأكاديمي', 'الهوية الوطنية', 'الشعبة', ...selectedFields.map((field) => `${field.label} (${field.max})`), ...customCategories.map((category) => `${category.label} (${category.max})`), `المجموع النهائي (${finalMaximum})`]
  worksheet.columns = exportHeaders.map((header, index) => ({ width: index === 1 ? 30 : index >= 5 ? 18 : 20 }))
  const schoolRow = worksheet.addRow([metadata.schoolName ?? ''])
  worksheet.mergeCells(1, 1, 1, exportHeaders.length)
  schoolRow.font = { bold: true, size: 14 }
  schoolRow.alignment = { horizontal: 'center' }
  const titleRow = worksheet.addRow(['كشف درجات الطلاب/ة'])
  worksheet.mergeCells(2, 1, 2, exportHeaders.length)
  titleRow.font = { bold: true, size: 13 }
  titleRow.alignment = { horizontal: 'center' }
  const metadataRow = worksheet.addRow([`المادة: ${metadata.subject ?? ''}`, `المعلم: ${metadata.teacherName ?? ''}`, `مدير المدرسة: ${metadata.principalName ?? ''}`])
  metadataRow.alignment = { horizontal: 'right' }
  const headerRow = worksheet.addRow(exportHeaders)
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9BBB59' } }
    cell.font = { bold: true }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
  })
  headerRow.height = 34

  studentsData.forEach((student, index) => {
    const row = worksheet.addRow([
      index + 1,
      student.fullName,
      student.academicId ?? student.studentId ?? '',
      student.nationalId ?? '',
      student.divisionCode ?? divisionName,
      ...selectedFields.map((field) => customScores[student.id]?.[field.key] ?? student[field.key as keyof GradebookStudent] ?? ''),
      ...customCategories.map((category) => customScores[student.id]?.[category.key] ?? ''),
      (() => {
        const customTotal = customCategories.reduce((sum, category) => sum + Number(customScores[student.id]?.[category.key] ?? 0), 0)
        const fieldTotal = selectedFields.reduce((sum, field) => sum + Number(customScores[student.id]?.[field.key] ?? student[field.key as keyof GradebookStudent] ?? 0), 0)
        const configuredMaximum = selectedFields.reduce((sum, field) => sum + field.max, 0) + customCategories.reduce((sum, category) => sum + category.max, 0)
        return Math.round(((fieldTotal + customTotal) / configuredMaximum) * finalMaximum * 100) / 100
      })(),
    ])
    row.eachCell((cell, columnNumber) => {
      cell.alignment = { horizontal: columnNumber === 2 ? 'right' : 'center', vertical: 'middle' }
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
      if (index % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F5F0' } }
    })
  })

  const buffer = await workbook.xlsx.writeBuffer()
  saveAs(new Blob([buffer]), `كشف_درجات_${divisionName}.xlsx`)
}

export function exportGradebookToPdf(divisionName: string, studentsData: GradebookStudent[], fields: GradebookCustomCategory[], finalMaximum = 60, period: GradebookPeriod = 'both', metadata: GradebookExportMetadata = {}) {
  if (typeof window === 'undefined') return
  const selectedFields = fields.filter((field) => period === 'both' || (period === 'period1' ? field.key.toLowerCase().includes('period1') || !field.key.toLowerCase().includes('period2') : field.key.toLowerCase().includes('period2') || !field.key.toLowerCase().includes('period1')))
  const headers = ['م', 'اسم الطلاب/ة', 'الرقم الأكاديمي', 'الهوية الوطنية', 'الشعبة', ...selectedFields.map((field) => `${field.label} (${field.max})`), `المجموع النهائي (${finalMaximum})`]
  const rows = studentsData.map((student, index) => {
    const total = selectedFields.reduce((sum, field) => sum + Number(student[field.key as keyof GradebookStudent] ?? 0), 0)
    const maximum = selectedFields.reduce((sum, field) => sum + field.max, 0)
    const finalScore = maximum ? Math.round((total / maximum) * finalMaximum * 100) / 100 : 0
    return `<tr><td>${index + 1}</td><td>${escapeHtml(student.fullName)}</td><td>${escapeHtml(student.academicId ?? student.studentId ?? '')}</td><td>${escapeHtml(student.nationalId ?? '')}</td><td>${escapeHtml(student.divisionCode ?? divisionName)}</td>${selectedFields.map((field) => `<td>${student[field.key as keyof GradebookStudent] ?? ''}</td>`).join('')}<td><strong>${finalScore}</strong></td></tr>`
  }).join('')
  const printWindow = window.open('', '_blank', 'width=1100,height=800')
  if (!printWindow) return
  printWindow.document.write(`<html dir="rtl"><head><title>كشف درجات ${escapeHtml(divisionName)}</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#111}h1{text-align:center;font-size:22px}h2{text-align:center;font-size:18px}p{text-align:right;margin:6px 0}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #9ca3af;padding:8px;text-align:center}th{background:#d9ead3;font-weight:700}td:nth-child(2){text-align:right}@media print{body{padding:0}}</style></head><body><h1>${escapeHtml(metadata.schoolName ?? '')}</h1><h2>كشف درجات ${escapeHtml(divisionName)}</h2><p>المادة: ${escapeHtml(metadata.subject ?? '')} | المعلم: ${escapeHtml(metadata.teacherName ?? '')} | مدير المدرسة: ${escapeHtml(metadata.principalName ?? '')}</p><table><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table><script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}</script></body></html>`)
  printWindow.document.close()
}

export async function exportEmptyGradebookTemplates(divisionCodes: string[], period: GradebookPeriod = 'both') {
  const response = await fetch('/api/students')
  const json = await response.json() as { data?: GradebookStudent[] }
  const students = json.data ?? []
  let schoolName = ''
  try { schoolName = (JSON.parse(localStorage.getItem('thabat-settings') ?? '{}') as { schoolName?: string }).schoolName ?? '' } catch { schoolName = '' }
  const workbook = new ExcelJS.Workbook()
  const selectedTemplateFields = templateFields.filter((field) => period === 'both' || (period === 'period1' ? field.includes('الفترة 1') : field.includes('الفترة 2')))
  const exportHeaders = [...headers.slice(0, 5), ...selectedTemplateFields, 'المجموع النهائي']
  const uniqueCodes = Array.from(new Set(divisionCodes)).sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))
  uniqueCodes.forEach((divisionCode) => {
    const worksheet = workbook.addWorksheet(divisionCode)
    worksheet.views = [{ rtl: true } as unknown as ExcelJS.WorksheetView]
    worksheet.columns = exportHeaders.map((header, index) => ({ width: index === 1 ? 30 : index >= 5 ? 18 : 20 }))
    worksheet.addRow([schoolName])
    worksheet.mergeCells(1, 1, 1, exportHeaders.length)
    worksheet.getRow(1).font = { bold: true, size: 14 }
    worksheet.getRow(1).alignment = { horizontal: 'center' }
    worksheet.addRow(['قالب كشف درجات الطلاب/ة'])
    worksheet.mergeCells(2, 1, 2, exportHeaders.length)
    worksheet.getRow(2).font = { bold: true, size: 13 }
    worksheet.getRow(2).alignment = { horizontal: 'center' }
    const headerRow = worksheet.addRow(exportHeaders)
    headerRow.eachCell((cell) => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9BBB59' } }; cell.font = { bold: true }; cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true } })
    headerRow.height = 34
    students.filter((student) => student.divisionCode === divisionCode).forEach((student, index) => worksheet.addRow([index + 1, student.fullName, student.academicId ?? student.studentId ?? '', student.nationalId ?? '', student.divisionCode ?? divisionCode, ...selectedTemplateFields.map(() => ''), '']))
  })
  const buffer = await workbook.xlsx.writeBuffer()
  saveAs(new Blob([buffer]), 'قوالب_الدرجات_جميع_الشعب.xlsx')
}

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character)

export async function exportEmptyGradebookTemplatesToPdf(divisionCodes: string[]) {
  if (typeof window === 'undefined') return
  const response = await fetch('/api/students')
  const json = await response.json() as { data?: GradebookStudent[] }
  const students = json.data ?? []
  let schoolName = ''
  try { schoolName = (JSON.parse(localStorage.getItem('thabat-settings') ?? '{}') as { schoolName?: string }).schoolName ?? '' } catch { schoolName = '' }
  const sections = Array.from(new Set(divisionCodes)).sort((left, right) => left.localeCompare(right, undefined, { numeric: true })).map((divisionCode) => {
    const rows = students.filter((student) => student.divisionCode === divisionCode).sort((left, right) => left.fullName.localeCompare(right.fullName, 'ar')).map((student, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(student.fullName)}</td><td>${escapeHtml(student.academicId ?? student.studentId ?? '')}</td><td>${escapeHtml(student.nationalId ?? '')}</td><td>${escapeHtml(student.divisionCode ?? divisionCode)}</td>${Array.from({ length: 9 }, () => '<td></td>').join('')}</tr>`).join('')
    return `<section><h2>الشعبة ${escapeHtml(divisionCode)}</h2><table><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></section>`
  }).join('')
  const printWindow = window.open('', '_blank', 'width=1200,height=800')
  if (!printWindow) return
  printWindow.document.write(`<html dir="rtl"><head><title>قوالب كشوف الدرجات</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#111}h1{text-align:center;color:#047857}h2{border-right:5px solid #047857;padding:8px 12px;background:#ecfdf5;page-break-after:avoid}section{page-break-after:always}section:last-child{page-break-after:auto}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #94a3b8;padding:8px;text-align:center;height:24px}th{background:#047857;color:#fff}td:nth-child(2){text-align:right}@media print{body{padding:0}}</style></head><body><h1>${escapeHtml(schoolName)}</h1><h2>قوالب كشوف الدرجات</h2>${sections}<script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}</script></body></html>`)
  printWindow.document.close()
}
