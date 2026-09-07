export const SETTINGS_KEY = 'thabat-settings'
export const DEFAULT_SCHOOL_NAME = 'مدرسة السلمية الثانوية'

type StoredSettings = { schoolName?: string }

export function getConfiguredSchoolName(): string {
  if (typeof window === 'undefined') return DEFAULT_SCHOOL_NAME
  try {
    const settings = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) ?? '{}') as StoredSettings
    return settings.schoolName?.trim() || DEFAULT_SCHOOL_NAME
  } catch {
    return DEFAULT_SCHOOL_NAME
  }
}
