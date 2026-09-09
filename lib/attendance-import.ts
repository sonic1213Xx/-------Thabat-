import * as XLSX from 'xlsx'
import { getConfiguredLateTime } from '@/lib/school-settings'

export type AttendanceImportStatus = 'PRESENT' | 'ABSENT_UNEXCUSED' | 'ABSENT_EXCUSED' | 'LATE' | 'OTHER' | 'UNMARKED'

export type AttendanceImportRow = {
  sourceRow: number
  name: string
  divisionCode: string
  date: string
  status: AttendanceImportStatus
  entryTime: string | null
  notes: string
  lateCount: number | null
}

export type AttendanceImportStudent = {
  id: string
  fullName: string
  divisionCode?: string | null
  isActive?: boolean
}

export type AttendanceImportCandidate = AttendanceImportStudent & { score: number }

export type AttendanceImportReview = {
  row: AttendanceImportRow
  exactMatch: AttendanceImportStudent | null
  candidates: AttendanceImportCandidate[]
  reason: 'EXACT' | 'NEEDS_APPROVAL' | 'SKIP' | 'INVALID'
  approvalConfirmed?: boolean
}

const MINIMUM_NAME_CONFIDENCE = 0.72

const clean = (value: unknown) => value == null ? '' : String(value).trim()
const compact = (value: string) => value.normalize('NFKC').toLocaleLowerCase('ar').replace(/[ًٌٍَُِّْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/[\s_\-./\\:؛،()[\]{}]/g, '')
const headerMatches = (header: string, terms: string[]) => terms.some((term) => compact(header).includes(compact(term)))

const fieldTerms = {
  name: ['اسم الطالب', 'اسم الطالبة', 'الاسم', 'اسم', 'طالب', 'student name', 'studentname', 'name', 'الاسم الكامل', 'الاسم كامل'],
  division: ['الشعبة', 'الفصل', 'الصف والفصل', 'division', 'class', 'section', 'قسم', 'شعبة', 'صف'],
  date: ['التاريخ', 'اليوم', 'date', 'day', 'اليوم', 'التاريخ الميلادي'],
  status: ['الحالة', 'الحضور', 'الغياب', 'الوصف', 'status', 'attendance', 'حالة الحضور', 'الحالة الحضور'],
  notes: ['ملاحظات', 'ملاحظة', 'notes', 'note', 'remark', 'ملاحظ'],
  lateCount: ['عدد مرات التأخر', 'عدد التأخر', 'مرات التأخر', 'late count', 'latecount', 'tardies', 'التأخر'],
  entryTime: ['وقت الدخول', 'وقت الحضور', 'entry time', 'entrytime', 'check-in time'],
} as const

function columnIndex(headers: string[], field: keyof typeof fieldTerms) {
  const index = headers.findIndex((header) => headerMatches(header, [...fieldTerms[field]]))
  return index >= 0 ? index : null
}

function excelDate(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value)
    if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`
  }
  const valueText = clean(value)
  const iso = valueText.match(/(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})/)
  if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`
  const dayFirst = valueText.match(/(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2})/)
  if (dayFirst) return `${dayFirst[3]}-${dayFirst[2].padStart(2, '0')}-${dayFirst[1].padStart(2, '0')}`
  return /^20\d{2}-\d{2}-\d{2}$/.test(valueText) ? valueText : ''
}

function parseStatus(value: unknown): AttendanceImportStatus {
  const normalized = compact(clean(value))
  if (!normalized) return 'UNMARKED'
  if (['حاضر', 'حضور', 'دخول صحيح', 'دخول', 'present', 'p', '1'].includes(normalized) || normalized.includes('دخولصحيح')) return 'PRESENT'
  if (['غائب', 'غياب', 'absent', 'a', '0'].includes(normalized)) return 'ABSENT_UNEXCUSED'
  if (normalized.includes('بعذر') || normalized.includes('excused')) return 'ABSENT_EXCUSED'
  if (normalized.includes('متاخر') || normalized.includes('تاخر') || normalized.includes('تاخير') || normalized.includes('late')) return 'LATE'
  if (/\d{1,2}[:：]\d{2}/.test(clean(value))) return 'PRESENT'
  return 'OTHER'
}

function parseEntryTime(value: unknown) {
  const match = clean(value).match(/(?:^|\s)(\d{1,2})[:：](\d{2})(?:\s*([ap]m))?/i)
  if (!match) return null
  let hour = Number(match[1])
  const minute = match[2]
  if (match[3]?.toLowerCase() === 'pm' && hour < 12) hour += 12
  if (match[3]?.toLowerCase() === 'am' && hour === 12) hour = 0
  return `${String(hour).padStart(2, '0')}:${minute}`
}

function lateDuration(entryTime: string) {
  const [hour, minute] = entryTime.split(':').map(Number)
  const [startHour, startMinute] = getConfiguredLateTime().split(':').map(Number)
  const minutes = hour * 60 + minute - (startHour * 60 + startMinute)
  if (minutes <= 0) return ''
  return minutes >= 60 ? `${Math.floor(minutes / 60)} ساعة و${minutes % 60} دقيقة` : `${minutes} دقيقة`
}

function parseCount(value: unknown): number | null {
  const parsed = Number(clean(value).replace(',', '.'))
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : null
}

function divisionCode(value: unknown) {
  const text = clean(value)
  return text.match(/[1-3]\d{2}/)?.[0] ?? text
}

export function parseAttendanceWorkbook(input: string | ArrayBuffer, type: 'string' | 'array'): AttendanceImportRow[] {
  const workbook = XLSX.read(input, { type, cellDates: true })
  const rows: AttendanceImportRow[] = []
  workbook.SheetNames.forEach((sheetName) => {
    const values = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '' }) as unknown[][]
    console.log(`[ATTENDANCE IMPORT] Sheet "${sheetName}" has ${values.length} total rows`)
    const headerIndex = values.slice(0, 40).reduce((best, row, index) => {
      const headers = row.map(clean)
      const score = (Object.keys(fieldTerms) as Array<keyof typeof fieldTerms>).reduce((total, field) => total + (columnIndex(headers, field) === null ? 0 : field === 'name' ? 3 : 1), 0)
      return score > best.score ? { index, score } : best
    }, { index: 0, score: -1 }).index
    const headers = (values[headerIndex] ?? []).map(clean)
    console.log(`[ATTENDANCE IMPORT] Header row at index ${headerIndex}:`, headers)
    let nameColumn = columnIndex(headers, 'name')
    console.log(`[ATTENDANCE IMPORT] Name column detected at index: ${nameColumn}`)
    
    // Fallback: if no name column found, assume first non-empty column with text is the name
    if (nameColumn === null) {
      nameColumn = 0
      console.log(`[ATTENDANCE IMPORT] Using fallback: first column (0) as name column`)
    }
    
    const divisionColumn = columnIndex(headers, 'division')
    const dateColumn = columnIndex(headers, 'date')
    const statusColumn = columnIndex(headers, 'status')
    const notesColumn = columnIndex(headers, 'notes')
    const lateCountColumn = columnIndex(headers, 'lateCount')
    const entryTimeColumn = columnIndex(headers, 'entryTime')
    const dateColumns = dateColumn === null && statusColumn === null
      ? headers.map((header, index) => ({ index, date: excelDate(header) })).filter((item) => item.date)
      : []
    console.log(`[ATTENDANCE IMPORT] Columns - Division: ${divisionColumn}, Date: ${dateColumn}, Status: ${statusColumn}`)
    
    let rowCount = 0
    values.slice(headerIndex + 1).forEach((row, index) => {
      const name = clean(row[nameColumn])
      if (!name || headerMatches(name, [...fieldTerms.name])) {
        if (!name) console.log(`[ATTENDANCE IMPORT] Skipping row ${headerIndex + index + 2}: empty name`)
        return
      }
      rowCount++
      const common = {
        sourceRow: headerIndex + index + 2,
        name,
        divisionCode: divisionColumn === null ? '' : divisionCode(row[divisionColumn]),
        notes: [
          notesColumn === null ? '' : clean(row[notesColumn]),
          statusColumn !== null && compact(clean(row[statusColumn])).includes('تاخيرمكرر') ? 'الطالب متأخر عدة مرات بواسطة جهاز البصمة' : '',
        ].filter(Boolean).join(' | '),
        lateCount: lateCountColumn === null ? null : parseCount(row[lateCountColumn]),
        entryTime: entryTimeColumn === null ? (statusColumn === null ? null : parseEntryTime(row[statusColumn])) : parseEntryTime(row[entryTimeColumn]),
      }
      if (dateColumns.length) dateColumns.forEach(({ index: dateIndex, date }) => {
        if (clean(row[dateIndex])) rows.push({ ...common, date, status: parseStatus(row[dateIndex]), entryTime: parseEntryTime(row[dateIndex]) })
      })
      else rows.push({ ...common, date: dateColumn === null ? '' : excelDate(row[dateColumn]), status: statusColumn === null ? 'PRESENT' : parseStatus(row[statusColumn]) })
    })
    console.log(`[ATTENDANCE IMPORT] Extracted ${rowCount} valid data rows from sheet "${sheetName}" (total rows in final array: ${rows.length})`)
  })
  const lateCounts = new Map<string, number>()
  rows.forEach((row) => {
    const key = compact(row.name)
    const count = row.lateCount ?? (row.status === 'LATE' ? 1 : 0)
    lateCounts.set(key, Math.max(lateCounts.get(key) ?? 0, count))
  })
  return rows.slice(0, 5000).map((row) => {
    const lateCount = lateCounts.get(compact(row.name)) ?? row.lateCount
    const escalationNote = lateCount !== null && lateCount >= 3 ? `تأخر متكرر: ${lateCount} مرات` : ''
    const lateNote = row.status === 'LATE' && row.entryTime ? `وقت الدخول: ${row.entryTime} | التأخر: ${lateDuration(row.entryTime) || 'بعد بداية الدوام'}` : ''
    return { ...row, lateCount, notes: [row.notes, lateNote, escalationNote].filter(Boolean).join(' | ') }
  })
}

function levenshtein(left: string, right: string) {
  const matrix = Array.from({ length: left.length + 1 }, (_, row) => Array.from({ length: right.length + 1 }, (_, column) => row === 0 ? column : column === 0 ? row : 0))
  for (let row = 1; row <= left.length; row += 1) {
    for (let column = 1; column <= right.length; column += 1) matrix[row][column] = Math.min(matrix[row - 1][column] + 1, matrix[row][column - 1] + 1, matrix[row - 1][column - 1] + (left[row - 1] === right[column - 1] ? 0 : 1))
  }
  return matrix[left.length][right.length]
}

function nameParts(value: string) {
  return value.normalize('NFKC').toLocaleLowerCase('ar').replace(/[ًٌٍَُِّْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').split(/\s+/).map((part) => compact(part)).filter(Boolean)
}

function similarity(left: string, right: string) {
  const normalizedLeft = compact(left)
  const normalizedRight = compact(right)
  if (!normalizedLeft || !normalizedRight) return 0
  if (normalizedLeft === normalizedRight) return 1
  return 1 - levenshtein(normalizedLeft, normalizedRight) / Math.max(normalizedLeft.length, normalizedRight.length)
}

export function reviewAttendanceRows(rows: AttendanceImportRow[], students: AttendanceImportStudent[]): AttendanceImportReview[] {
  return rows.map((row) => {
    if (!row.date || !row.name || !row.status) return { row, exactMatch: null, candidates: [], reason: 'INVALID' }

    const activeStudents = students.filter((s) => s.isActive !== false)
    const sourceParts = nameParts(row.name)
    const sourceFirst = sourceParts[0]
    const sourceMiddle = sourceParts.length > 2 ? sourceParts.slice(1, -1).join('') : ''
    const sourceLast = sourceParts[sourceParts.length - 1]

    const nameMatchScore = (student: AttendanceImportStudent) => {
      const studentParts = nameParts(student.fullName)
      if (!sourceFirst || !sourceLast || studentParts.length < sourceParts.length) return 0
      const studentFirst = studentParts[0]
      const studentLast = studentParts[studentParts.length - 1]
      const studentMiddle = studentParts.length > 2 ? studentParts.slice(1, -1).join('') : ''
      if (studentFirst !== sourceFirst || (sourceMiddle && studentMiddle !== sourceMiddle)) return 0
      const lastScore = similarity(sourceLast, studentLast)
      return lastScore >= 0.65 ? similarity(row.name, student.fullName) : 0
    }

    const matches = activeStudents
      .map((student) => ({ student, score: nameMatchScore(student), sameDivision: Boolean(row.divisionCode && student.divisionCode === row.divisionCode) }))
      .filter((match) => match.score >= MINIMUM_NAME_CONFIDENCE)
      .sort((left, right) => Number(right.sameDivision) - Number(left.sameDivision) || right.score - left.score)

    const exactMatch = matches.find(({ score }) => score >= 0.95)?.student ?? null
    
    if (exactMatch) return { row, exactMatch, candidates: [], reason: 'EXACT', approvalConfirmed: true }

    const approximateCandidates = matches
      .map(({ student, score }) => ({ ...student, score }))
      .slice(0, 5)
    
    if (approximateCandidates.length) return { row, exactMatch: null, candidates: approximateCandidates, reason: 'NEEDS_APPROVAL', approvalConfirmed: false }
    
    return { row, exactMatch: null, candidates: [], reason: 'SKIP' }
  })
}
