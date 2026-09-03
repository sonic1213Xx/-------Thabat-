import * as XLSX from 'xlsx'

export type ImportField = 'name' | 'academicId' | 'gpa' | 'parentPhone' | 'nationalId' | 'divisionCode' | 'gradeLevel' | 'level'

export type ParsedImportRow = {
  name: string
  academicId: string
  gpa: number | null
  parentPhone: string
  nationalId: string
  divisionCode: string
  derivedDivision: string
  gradeLevel: number | null
  level: string
  sourceRow: number
}

export type ImportMapping = Record<ImportField, number | null>

export type ParsedSheet = {
  headers: string[]
  rows: unknown[][]
  metadata: {
    division: string
    subject: string
    divisions: string[]
  }
  mapping: ImportMapping
  records: ParsedImportRow[]
}

const clean = (value: unknown) => (value == null ? '' : String(value).trim())
const compact = (value: string) => value.toLocaleLowerCase('ar').replace(/[\s_\-./\\:؛،()[\]{}]/g, '')

const hasAny = (value: string, candidates: string[]) => {
  const normalized = compact(value)
  return candidates.some((candidate) => normalized.includes(compact(candidate)))
}

const FIELD_LABELS: Record<ImportField, string[]> = {
  name: ['اسم الطالب', 'اسم الطالبة', 'اسم التلميذ', 'الطالب', 'الطالبة', 'الاسم', 'student name', 'studentname', 'name'],
  academicId: ['الرقم الأكاديمي', 'الرقم الاكاديمي', 'رقم الطالب', 'academic id', 'academicid', 'student number'],
  gpa: ['المعدل', 'المعدل التراكمي', 'gpa', 'grade point average', 'grade'],
  parentPhone: ['جوال ولي الأمر', 'جوال ولي الامر', 'جوال', 'هاتف ولي الأمر', 'الهاتف', 'parent phone', 'parentphone', 'phone', 'mobile'],
  nationalId: ['رقم الهوية', 'السجل المدني', 'رقم السجل', 'الهوية', 'national id', 'nationalid', 'student id', 'id'],
  divisionCode: ['الفصل', 'الشعبة', 'الصف والفصل', 'division', 'division code', 'class'],
  gradeLevel: ['الصف', 'المرحلة', 'grade', 'grade level'],
  level: ['المستوى', 'level'],
}

function findColumn(headers: string[], field: ImportField): number | null {
  const index = headers.findIndex((header) => hasAny(header, FIELD_LABELS[field]))
  return index >= 0 ? index : null
}

function findHeaderRow(rows: unknown[][]): number {
  let bestIndex = 0
  let bestScore = -1

  rows.slice(0, 30).forEach((row, index) => {
    const values = row.map(clean)
    const score = (Object.keys(FIELD_LABELS) as ImportField[]).reduce(
      (total, field) => total + (findColumn(values, field) !== null ? (field === 'name' ? 4 : 1) : 0),
      0,
    )
    if (score > bestScore) {
      bestScore = score
      bestIndex = index
    }
  })

  return bestScore > 0 ? bestIndex : 0
}

function metadataFromRows(rows: unknown[][], headerIndex: number) {
  const text = rows
    .slice(0, headerIndex)
    .flat()
    .map(clean)
    .filter(Boolean)
    .join(' | ')

  const divisionMatch = text.match(/(?:فصل|الفصل|شعبة|الشعبة)\s*[:：-]?\s*([^|]+)/i)
  const subjectMatch = text.match(/(?:مادة|المادة|subject)\s*[:：-]?\s*([^|]+)/i)

  return {
    division: divisionMatch?.[1]?.trim() ?? '',
    subject: subjectMatch?.[1]?.trim() ?? '',
  }
}

function contextFromRow(row: unknown[]) {
  const text = row.map(clean).filter(Boolean).join(' ')
  const level = text.match(/المستوى\s*([^|،,\n]+)/i)?.[1]?.trim() ?? ''
  const division = text.match(/(?:الشعبة|شعبة)\s*([\w\u0600-\u06ff]+)/i)?.[1]?.trim() ?? ''
  return { level: level ? `المستوى ${level}` : '', division: division ? `الشعبة ${division}` : '' }
}

function gradeFromLevel(level: string): number | null {
  const normalized = compact(level)
  if (/الأول|الاول|الثاني|الثانى|level1|level2/.test(normalized)) return 1
  if (/الثالث|الثالث|الرابع|level3|level4/.test(normalized)) return 2
  if (/الخامس|السادس|level5|level6/.test(normalized)) return 3
  return null
}

function canonicalDivision(level: string, section: string): string {
  const grade = gradeFromLevel(level)
  const sectionNumber = Number(section.match(/\d+/)?.[0] ?? '')
  if (grade && sectionNumber >= 1 && sectionNumber <= 9) return `${grade}0${sectionNumber}`
  return ''
}

function parseGpa(value: unknown): number | null {
  const normalized = clean(value).replace(',', '.')
  if (!normalized) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function parseGrade(value: unknown): number | null {
  const match = clean(value).match(/[1-3]/)
  return match ? Number(match[0]) : null
}

function gradeFromDivisionCode(code: string): number | null {
  const match = code.match(/^([1-3])\d{2}$/)
  return match ? Number(match[1]) : null
}

export function parseSpreadsheet(rows: unknown[][]): ParsedSheet {
  const safeRows = rows.filter((row) => Array.isArray(row))
  const headerIndex = findHeaderRow(safeRows)
  const headers = (safeRows[headerIndex] ?? []).map((value) => clean(value))
  const mapping = Object.fromEntries((Object.keys(FIELD_LABELS) as ImportField[]).map((field) => [field, findColumn(headers, field)])) as ImportMapping
  const metadata = metadataFromRows(safeRows, headerIndex)
  const detectedDivisions = new Set<string>()
  let detectedLevel = ''
  for (const row of safeRows) {
    const context = contextFromRow(row)
    if (context.level) detectedLevel = context.level
    if (context.division) {
      const code = canonicalDivision(detectedLevel, context.division)
      if (code) detectedDivisions.add(code)
    }
  }
  let activeLevel = metadata.division ? metadata.division : ''
  let activeDivision = metadata.division
  let activeSection = ''
  let activeMapping = mapping
  const records = safeRows.slice(headerIndex + 1).reduce<ParsedImportRow[]>((result, row, index) => {
    const context = contextFromRow(row)
    const previousMetadata = safeRows.slice(Math.max(0, headerIndex + index - 5), headerIndex + index).map(contextFromRow)
    const inheritedLevel = previousMetadata.find((item) => item.level)?.level ?? ''
    const inheritedDivision = previousMetadata.find((item) => item.division)?.division ?? ''
    const effectiveContext = { level: context.level || inheritedLevel, division: context.division || inheritedDivision }
    if (effectiveContext.level) {
      activeLevel = effectiveContext.level
      activeDivision = activeLevel
    }
    if (effectiveContext.division) {
      activeSection = effectiveContext.division
      activeDivision = canonicalDivision(activeLevel, activeSection) || (activeLevel ? `${activeLevel} - ${activeSection}` : activeSection)
    }

    const rowHeaders = row.map(clean)
    const rowNameColumn = findColumn(rowHeaders, 'name')
    if (rowNameColumn !== null && findColumn(rowHeaders, 'academicId') !== null) {
      activeMapping = Object.fromEntries((Object.keys(FIELD_LABELS) as ImportField[]).map((field) => [field, findColumn(rowHeaders, field)])) as ImportMapping
      return result
    }

    const name = clean(activeMapping.name === null ? '' : row[activeMapping.name])
    const academicId = clean(activeMapping.academicId === null ? '' : row[activeMapping.academicId])
    if (!name && !academicId) return result
    if (hasAny(name, ['اسم الطالب', 'الاسم', 'student name'])) return result

    const explicitDivision = clean(activeMapping.divisionCode === null ? '' : row[activeMapping.divisionCode])
    const level = clean(activeMapping.level === null ? '' : row[activeMapping.level]) || activeLevel
    const derivedDivision = canonicalDivision(level, activeSection)
    const divisionCode = derivedDivision || (/^\d{3}$/.test(explicitDivision) ? explicitDivision : activeDivision) || level
    const gradeLevel = gradeFromDivisionCode(divisionCode) ?? gradeFromLevel(level) ?? parseGrade(level)
    result.push({
      name,
      academicId,
      gpa: parseGpa(activeMapping.gpa === null ? '' : row[activeMapping.gpa]),
      parentPhone: clean(activeMapping.parentPhone === null ? '' : row[activeMapping.parentPhone]),
      nationalId: clean(activeMapping.nationalId === null ? '' : row[activeMapping.nationalId]),
      divisionCode: divisionCode || level,
      derivedDivision,
      gradeLevel: activeMapping.gradeLevel === null ? gradeLevel : parseGrade(row[activeMapping.gradeLevel]) ?? gradeLevel,
      level,
      sourceRow: headerIndex + index + 2,
    })
    return result
  }, [])

  return { headers, rows: safeRows, metadata: { ...metadata, divisions: [...detectedDivisions] }, mapping, records: records.slice(0, 1000) }
}

export function parseWorkbook(input: string | ArrayBuffer, type: 'string' | 'array') {
  const workbook = XLSX.read(input, { type })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) return null
  const worksheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as unknown[][]
  return parseSpreadsheet(rows)
}

export function importFieldLabel(field: ImportField) {
  return { name: 'اسم الطالب', academicId: 'الرقم الأكاديمي', gpa: 'المعدل', parentPhone: 'جوال ولي الأمر', nationalId: 'السجل المدني', divisionCode: 'الشعبة / الفصل', gradeLevel: 'الصف', level: 'المستوى' }[field]
}
