export const SETTINGS_KEY = 'thabat-settings'
export const CLASSROOM_SETTINGS_KEY = 'thabat-classroom-settings'
export const DEFAULT_SCHOOL_NAME = 'مدرسة السلمية الثانوية'
export const DEFAULT_LATE_TIME = '07:00'

type StoredSettings = { schoolName?: string; lateTime?: string }

export function getConfiguredSchoolName(): string {
  if (typeof window === 'undefined') return DEFAULT_SCHOOL_NAME
  try {
    const settings = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) ?? '{}') as StoredSettings
    return settings.schoolName?.trim() || DEFAULT_SCHOOL_NAME
  } catch {
    return DEFAULT_SCHOOL_NAME
  }
}

export function getConfiguredLateTime(): string {
  if (typeof window === 'undefined') return DEFAULT_LATE_TIME
  try {
    const lateTime = (JSON.parse(window.localStorage.getItem(SETTINGS_KEY) ?? '{}') as StoredSettings).lateTime
    return /^\d{2}:\d{2}$/.test(lateTime ?? '') ? lateTime! : DEFAULT_LATE_TIME
  } catch {
    return DEFAULT_LATE_TIME
  }
}

export function getConfiguredClassroomDefaultAttendance(): 'UNMARKED' | 'PRESENT' {
  if (typeof window === 'undefined') return 'UNMARKED'
  try {
    const value = (JSON.parse(window.localStorage.getItem(CLASSROOM_SETTINGS_KEY) ?? '{}') as { defaultAttendance?: string }).defaultAttendance
    return value === 'PRESENT' ? 'PRESENT' : 'UNMARKED'
  } catch {
    return 'UNMARKED'
  }
}
