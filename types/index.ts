/**
 * ثَبَت (Thabat) - TypeScript Type Definitions
 */

/**
 * User Role Enumeration
 */
export enum UserRole {
  PRINCIPAL = 'PRINCIPAL',
  VICE_PRINCIPAL = 'VICE_PRINCIPAL',
  TEACHER = 'TEACHER',
  VP_STUDENT_AFFAIRS = 'VP_STUDENT_AFFAIRS',
  VP_ACADEMIC_AFFAIRS = 'VP_ACADEMIC_AFFAIRS',
  VP_OPERATIONS = 'VP_OPERATIONS',
  COUNSELOR = 'COUNSELOR',
  ACTIVITIES_COORDINATOR = 'ACTIVITIES_COORDINATOR',
  GATE_SECURITY = 'GATE_SECURITY',
  TRANSPORTATION_SUPERVISOR = 'TRANSPORTATION_SUPERVISOR',
}

/**
 * Warning Type Enumeration
 */
export enum WarningType {
  TARDINESS = 'TARDINESS',
  ABSENCE = 'ABSENCE',
  CONDUCT = 'CONDUCT',
  ACADEMIC_FAILURE = 'ACADEMIC_FAILURE',
  DISRUPTIVE = 'DISRUPTIVE',
  CLASSROOM_EXIT = 'CLASSROOM_EXIT',
  UNIFORM_VIOLATION = 'UNIFORM_VIOLATION',
  OTHER = 'OTHER',
}

/**
 * Warning Severity Level
 */
export enum WarningDeverity {
  MINOR = 'MINOR',
  MODERATE = 'MODERATE',
  MAJOR = 'MAJOR',
}

/**
 * Audit Action Enumeration
 */
export enum AuditAction {
  STUDENT_CREATED = 'STUDENT_CREATED',
  STUDENT_UPDATED = 'STUDENT_UPDATED',
  STUDENT_DELETED = 'STUDENT_DELETED',
  STUDENT_TRANSFERRED = 'STUDENT_TRANSFERRED',
  WARNING_ISSUED = 'WARNING_ISSUED',
  WARNING_RESOLVED = 'WARNING_RESOLVED',
  BEHAVIOR_SCORE_RESET = 'BEHAVIOR_SCORE_RESET',
  ATTENDANCE_MARKED = 'ATTENDANCE_MARKED',
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  BULK_IMPORT = 'BULK_IMPORT',
  REPORT_GENERATED = 'REPORT_GENERATED',
  RECORD_ARCHIVED = 'RECORD_ARCHIVED',
  SYSTEM_OVERRIDE = 'SYSTEM_OVERRIDE',
}

/**
 * Import Status Enumeration
 */
export enum ImportStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  SUCCESS = 'SUCCESS',
  PARTIAL_SUCCESS = 'PARTIAL_SUCCESS',
  FAILED = 'FAILED',
  ROLLED_BACK = 'ROLLED_BACK',
}

/**
 * User Interface
 */
export interface IUser {
  id: string
  username: string
  name: string
  email?: string
  password: string // Hashed
  role: UserRole
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * Student Interface
 */
export interface IStudent {
  id: string
  nationalId?: string | null
  academicId?: string | null
  fullName: string
  arabicName?: string
  gradeLevel?: number | null
  level?: string | null
  gpa?: number | string | null
  parentPhone?: string | null
  divisionId?: string | null
  divisionCode?: string | null
  behaviorScore: number // Default 100
  attendanceScore: number // Default 100
  admissionDate: Date
  createdAt: Date
  createdDateOnly?: string     // YYYY-MM-DD
  createdTimeOnly?: string     // HH:mm:ss
  updatedAt: Date
  lastUpdatedBy?: string       // User ID of last modifier
  lastUpdatedByName?: string   // Name of last modifier
  lastUpdatedByRole?: string   // Role of last modifier
  isActive: boolean
}

/**
 * Warning Interface
 */
export interface IWarning {
  id: string
  studentId: string
  student?: IStudent
  issuedBy: string
  issuedByUser?: IUser
  issuedByName: string         // Full name of issuing user (cached)
  issuedByRole: string         // Role cached (PRINCIPAL, VICE_PRINCIPAL, TEACHER)
  type: WarningType
  reason?: string
  deduction: number
  severity: WarningDeverity
  isResolved: boolean
  resolvedBy?: string
  resolvedByName?: string      // Name of resolver
  resolvedAt?: Date
  issuedAt: Date               // When warning was issued
  issuedDateOnly?: string      // YYYY-MM-DD format
  issuedTimeOnly?: string      // HH:mm:ss format
  createdAt: Date
  updatedAt: Date
}

/**
 * Transfer History Interface
 */
export interface ITransferHistory {
  id: string
  studentId: string
  student?: IStudent
  fromDivision: string
  toDivision: string
  changedBy: string
  changedByUser?: IUser
  performedByName: string      // Full name of person who performed transfer
  performedByRole: string      // Role (PRINCIPAL, VICE_PRINCIPAL, TEACHER)
  reason?: string
  transferredAt: Date          // When transfer occurred
  transferDateOnly?: string    // YYYY-MM-DD for filtering
  transferTimeOnly?: string    // HH:mm:ss for display
  timestamp: Date
}

/**
 * Audit Log Interface
 */
export interface IAuditLog {
  id: string
  userId: string
  user?: IUser
  userName: string             // Cached user name for audit immutability
  userRole: string             // Cached user role
  action: AuditAction
  targetType: string // e.g., "Student", "Warning"
  targetId?: string
  targetName?: string
  studentId?: string
  student?: IStudent
  details?: string // JSON serializable
  oldValue?: string
  newValue?: string
  ipAddress?: string
  userAgent?: string
  timestamp: Date
  dateOnly: string             // YYYY-MM-DD format for filtering
  timeOnly: string             // HH:mm:ss format for display
  relativeTime?: string        // e.g., "اليوم الساعة 10:45 ص"
}

/**
 * Login History Interface
 */
export interface ILoginHistory {
  id: string
  userId: string
  user?: IUser
  ipAddress?: string
  userAgent?: string
  success: boolean
  reason?: string // Error reason if failed
  timestamp: Date
}

/**
 * Excel Import Log Interface
 */
export interface IExcelImportLog {
  id: string
  fileName: string
  fileSize: number
  rowCount: number
  successCount: number
  errorCount: number
  importedBy?: string
  status: ImportStatus
  details?: string // JSON: detailed error logs
  createdAt: Date
  completedAt?: Date
}

/**
 * Parsed Excel Student Data
 */
export interface IParsedStudent {
  name: string
  nationalId: string
  gradeLevel?: number
  divisionCode?: string
  performanceTasks?: number
  participation?: number
  quizzes?: number
}

/**
 * API Response Types
 */
export interface IApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
  timestamp: Date
}

/**
 * Pagination Interface
 */
export interface IPagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

/**
 * Paginated Response
 */
export interface IPaginatedResponse<T> {
  data: T[]
  pagination: IPagination
}

/**
 * Filter Options
 */
export interface IStudentFilters {
  gradeLevel?: number
  divisionCode?: string
  search?: string
  isActive?: boolean
  page?: number
  pageSize?: number
}

export interface IWarningFilters {
  type?: WarningType
  severity?: WarningDeverity
  isResolved?: boolean
  dateFrom?: Date
  dateTo?: Date
  page?: number
  pageSize?: number
}

export interface IAuditLogFilters {
  action?: AuditAction
  userId?: string
  dateFrom?: Date
  dateTo?: Date
  search?: string
  page?: number
  pageSize?: number
}

/**
 * Division Configuration
 */
export interface IDivision {
  code: string
  label: string
  grade: number
  arabicLabel: string
}

/**
 * Dashboard Statistics
 */
export interface IDashboardStats {
  totalStudents: number
  activeDivisions: number
  warningsToday: number
  auditLogsTotal: number
  averageBehaviorScore: number
  attendanceRate: number
  recentActivities: IAuditLog[]
}

/**
 * Bulk Transfer Request
 */
export interface IBulkTransferRequest {
  studentIds: string[]
  toDivision: string
  reason?: string
  changedBy: string
}

/**
 * Bulk Transfer Response
 */
export interface IBulkTransferResponse {
  success: boolean
  totalTransferred: number
  failedCount: number
  failedStudents?: string[]
  message: string
}

/**
 * System Configuration
 */
export interface ISystemConfig {
  schoolName: string
  schoolArName: string
  supportedGrades: number[]
  supportedDivisions: IDivision[]
  maxWarningDeduction: number
  minimumBehaviorScore: number
  maintenanceMode: boolean
}
