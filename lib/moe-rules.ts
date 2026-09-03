export const DEFAULT_CONDUCT_POINTS = 100
export const DEFAULT_ATTENDANCE_POINTS = 100

export type ViolationDegree = 1 | 2 | 3 | 4 | 5 | 6
export const VIOLATION_DEGREES: Array<{ degree: ViolationDegree; deduction: number; label: string; labelEn: string }> = [
  { degree: 1, deduction: 1, label: 'الدرجة الأولى', labelEn: 'Degree 1' },
  { degree: 2, deduction: 2, label: 'الدرجة الثانية', labelEn: 'Degree 2' },
  { degree: 3, deduction: 3, label: 'الدرجة الثالثة', labelEn: 'Degree 3' },
  { degree: 4, deduction: 10, label: 'الدرجة الرابعة', labelEn: 'Degree 4' },
  { degree: 5, deduction: 15, label: 'الدرجة الخامسة', labelEn: 'Degree 5' },
  { degree: 6, deduction: 0, label: 'الدرجة السادسة', labelEn: 'Deprivation / referral' },
]

export const ATTENDANCE_ESCALATIONS = [
  { days: 3, action: 'إنذار أول وإشعار ولي الأمر', actionEn: 'First warning and parent notice' },
  { days: 5, action: 'إنذار ثان وتعهد ولي الأمر', actionEn: 'Second warning and parent pledge' },
  { days: 10, action: 'إنذار ثالث وتحويل للموجه', actionEn: 'Third warning and counselor referral' },
  { days: 15, action: 'إنذار نهائي وشديد اللهجة', actionEn: 'Final serious warning' },
  { days: 20, action: 'إشعار بالحرمان', actionEn: 'Official deprivation referral' },
] as const

export function violationDeduction(degree: number): number {
  return VIOLATION_DEGREES.find((item) => item.degree === degree)?.deduction ?? 1
}

export function nextAttendanceEscalation(days: number) {
  return ATTENDANCE_ESCALATIONS.find((item) => item.days === days) ?? null
}
