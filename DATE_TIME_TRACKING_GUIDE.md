# ثَبَت - Date & Time Tracking & User Attribution Enhancement Guide

> **Implementation note (September 2, 2026):** This guide remains the detailed reference for timestamp and attribution fields. The feature is implemented in the current Prisma schema and API handlers. Local verification uses SQLite with `npm run prisma:push`; do not treat the fallback active user as production authentication.

## 📋 Overview

This document outlines the comprehensive enhancements made to the ثَبَت (Thabat) system to include **precise date/time tracking** and **complete user attribution** across all core features.

---

## 🔄 Database Schema Updates

### 1. Student Model - Enhanced Timestamps

**New Fields Added:**
```prisma
createdAt        DateTime @default(now())  // Creation timestamp
createdDateOnly  String?                   // YYYY-MM-DD format
createdTimeOnly  String?                   // HH:mm:ss format

updatedAt        DateTime @updatedAt       // Last update timestamp
lastUpdatedBy    String?                   // User ID of last modifier
lastUpdatedByName String?                  // Name of last person who edited
lastUpdatedByRole String?                  // Role of last modifier
```

**Purpose:**
- Track exact creation date and time of student records
- Record who last modified student information and when
- Enable audit trails for data modifications

---

### 2. Warning Model - Full Audit Trail

**New Fields Added:**
```prisma
issuedByName     String      // Cached: Full name of issuing user
issuedByRole     String      // Cached: Role (PRINCIPAL, VICE_PRINCIPAL, TEACHER)

resolvedByName   String?     // Name of person who resolved warning

issuedAt         DateTime    // When warning was issued (separate from created)
issuedDateOnly   String?     // YYYY-MM-DD format for quick filtering
issuedTimeOnly   String?     // HH:mm:ss format for display
```

**Purpose:**
- Immutable record of who issued each warning
- Clear timestamp of when warning was issued
- Role information cached for audit reports
- Easy date filtering for reports (e.g., "warnings issued on Sept 5")

---

### 3. TransferHistory Model - Transfer Attribution

**New Fields Added:**
```prisma
performedByName  String      // Full name of person who performed transfer
performedByRole  String      // Role of transferring user

transferredAt    DateTime    // When transfer occurred
transferDateOnly String?     // YYYY-MM-DD for filtering
transferTimeOnly String?     // HH:mm:ss for display
```

**Purpose:**
- Clear accountability for student transfers
- Historical record of who moved students between divisions
- Filter transfers by date for batch reports

---

### 4. AuditLog Model - Comprehensive Tracking

**Enhanced Fields:**
```prisma
userName   String     // Cached user name (immutable)
userRole   String     // Cached user role (immutable)

// Complete timestamp set
timestamp  DateTime   // Full ISO timestamp
dateOnly   String     // YYYY-MM-DD for daily filtering
timeOnly   String     // HH:mm:ss for display
relativeTime String?  // Arabic relative time (e.g., "اليوم الساعة 10:45 ص")
```

**Purpose:**
- Every operation is recorded with user and role information
- Timestamps cached prevent data inconsistency
- Multiple time formats for different reporting needs
- Arabic relative timestamps for user-friendly interface

---

## 🎨 UI Components Enhanced

### 1. Enhanced Audit Log View Component

**File**: `components/dashboard/enhanced-audit-log.tsx`

#### Features:

✅ **Date Range Filtering**
```typescript
interface DateRange {
  startDate: string  // YYYY-MM-DD
  endDate: string    // YYYY-MM-DD
}
```
- Interactive date picker modal
- Default: Last 30 days
- Users can select custom date ranges

✅ **Arabic Timestamp Display**
```typescript
formatRelativeTimeArabic(date)    // "اليوم الساعة 10:45 ص"
formatFullArabicDateTime(date)    // "01 سبتمبر 2026 - 14:30"
```

✅ **User Attribution Cards**
- Shows full name of person who performed action
- Displays user role (مديرة, مساعدة, معلمة)
- Clear visual hierarchy for action details

✅ **Timeline View with Filters**
- Filter by action type (STUDENT_CREATED, WARNING_ISSUED, etc.)
- Filter by severity (Low, Medium, High)
- Search across user names, target names, and details
- AnimatePresence for smooth list transitions

---

### 2. Student History Tab Component

**File**: `components/dashboard/student-history-tab.tsx`

#### Features:

✅ **Chronological Edit History**
- Shows ALL actions on a specific student
- Includes: Creation, updates, warnings, transfers, score resets

✅ **Action Type Filtering**
```typescript
actionTypes = [
  'creation',      // ✨ When student record created
  'update',        // ✏️ When data was modified
  'warning',       // ⚠️ When warning issued
  'transfer',      // ↔️ When student moved to new division
  'score_reset'    // 🔄 When behavior score reset
]
```

✅ **Before/After Value Tracking**
- Shows old value and new value for updates
- Example: "Behavior Score: 100/100 → 98/100 (-2 points)"
- Clear visual diff for understanding changes

✅ **Expandable Timeline Entries**
- Click to expand for detailed information
- Smooth animations with Framer Motion
- Shows exact timestamp in full detail

✅ **User Attribution on Every Entry**
- Full name of person who performed action
- Their role (Principal, Vice Principal, Teacher)
- Exact date and time with Arabic formatting

---

## 📚 Utility Functions - Date & Time Formatting

**File**: `lib/utils.ts`

### New Functions Added:

#### 1. `getDateOnly(date: Date): string`
```typescript
// Returns: "2026-09-01"
// Used for: Database storage, filtering
```

#### 2. `getTimeOnly(date: Date): string`
```typescript
// Returns: "14:30:45"
// Used for: Time displays in UI
```

#### 3. `formatRelativeTimeArabic(date: Date): string`
```typescript
// Returns:
// - "اليوم الساعة 10:45 ص" (Today at 10:45 AM)
// - "أمس - 14:30" (Yesterday - 14:30)
// - "01 سبتمبر 2026 - 14:30" (Older dates)
```

#### 4. `formatFullArabicDateTime(date: Date): string`
```typescript
// Returns: "01 سبتمبر 2026 - 14:30"
// Used for: Detailed audit entries
```

### Arabic Month Names (Built-in):
```
1  → يناير (January)
2  → فبراير (February)
3  → مارس (March)
4  → أبريل (April)
5  → مايو (May)
6  → يونيو (June)
7  → يوليو (July)
8  → أغسطس (August)
9  → سبتمبر (September)
10 → أكتوبر (October)
11 → نوفمبر (November)
12 → ديسمبر (December)
```

---

## 💾 How to Use - Implementation Guide

### Storing Timestamps When Creating Records

```typescript
// Example: Issuing a warning
import { getDateOnly, getTimeOnly } from '@/lib/utils'

const warning = await prisma.warning.create({
  data: {
    studentId: 'student-123',
    issuedBy: 'user-456',
    issuedByName: 'أ. نورا محمد إبراهيم',      // Fetch from User table
    issuedByRole: 'VICE_PRINCIPAL',            // Fetch from User table
    issuedAt: new Date(),
    issuedDateOnly: getDateOnly(new Date()),   // "2026-09-01"
    issuedTimeOnly: getTimeOnly(new Date()),   // "14:30:45"
    type: 'TARDINESS',
    deduction: 2,
    severity: 'MINOR',
  },
})
```

### Storing Audit Log Entries

```typescript
import { formatRelativeTimeArabic } from '@/lib/utils'

const auditEntry = await prisma.auditLog.create({
  data: {
    userId: 'user-456',
    userName: 'أ. نورا محمد إبراهيم',        // Cached from User
    userRole: 'VICE_PRINCIPAL',
    action: 'WARNING_ISSUED',
    targetType: 'Warning',
    targetId: 'warning-789',
    targetName: 'فاطمة محمد أحمد',
    studentId: 'student-123',
    details: 'إصدار إنذار تأخر (-2 نقاط)',
    timestamp: new Date(),
    dateOnly: getDateOnly(new Date()),         // For filtering
    timeOnly: getTimeOnly(new Date()),
    relativeTime: formatRelativeTimeArabic(new Date()),
  },
})
```

### Updating Student Last Editor

```typescript
const updatedStudent = await prisma.student.update({
  where: { id: 'student-123' },
  data: {
    fullName: 'فاطمة محمد أحمد الجديد',
    updatedAt: new Date(),
    lastUpdatedBy: 'user-456',
    lastUpdatedByName: 'أ. نورا محمد إبراهيم',
    lastUpdatedByRole: 'VICE_PRINCIPAL',
  },
})
```

---

## 🔍 Querying & Filtering Examples

### Filter by Date Range

```typescript
// Get all warnings issued on a specific day
const warningsOnDate = await prisma.warning.findMany({
  where: {
    issuedDateOnly: '2026-09-05',  // Use dateOnly field
  },
})

// Get all operations in a date range
const auditLogs = await prisma.auditLog.findMany({
  where: {
    dateOnly: {
      gte: '2026-09-01',
      lte: '2026-09-30',
    },
  },
  orderBy: { timestamp: 'desc' },
})
```

### Get All Actions on a Student

```typescript
// Timeline of everything done to a student
const studentHistory = await prisma.auditLog.findMany({
  where: {
    studentId: 'student-123',
  },
  orderBy: { timestamp: 'desc' },
  include: {
    user: true,
  },
})
```

### Get Warnings Issued by a Specific User

```typescript
const userWarnings = await prisma.warning.findMany({
  where: {
    issuedBy: 'user-456',
  },
  include: {
    student: true,
  },
  orderBy: { issuedAt: 'desc' },
})
```

---

## 📊 Reporting & Export Use Cases

### Daily Operations Report
```
تقرير العمليات اليومية - 01 سبتمبر 2026
═══════════════════════════════════════

إصدار الإنذارات:
  - 10:45 ص: فاطمة محمد أحمد - إنذار تأخر (أ. نورا محمد)
  - 11:15 ص: علي سعود - إنذار سلوك (أ. نورا محمد)

نقل الطلاب:
  - 09:30 ص: محمد علي - من الفصل 101 إلى الفصل 102 (أ. سارة علي)

إضافة الطلاب:
  - 08:00 ص: مريم خالد (أ. ليلى خالد)
```

### Student Accountability Report
```
سجل تعديلات الطالبة: فاطمة محمد أحمد
════════════════════════════════════

2026-09-01 08:00 ✨ إنشاء السجل - أ. سارة علي
2026-09-03 10:30 ↔️ نقل من 101 إلى 102 - أ. نورا محمد
2026-09-05 11:15 ⚠️ إنذار تأخر (-2) - أ. نورا محمد
2026-09-07 09:00 ⚠️ إنذار سلوك (-2) - أ. نورا محمد
```

### User Activity Report
```
تقرير نشاط المستخدم: أ. نورا محمد إبراهيم
═══════════════════════════════════════════

العمليات المنفذة: 127
- إصدار إنذارات: 82
- نقل طلاب: 25
- تحديثات بيانات: 20

آخر نشاط: 01 سبتمبر 2026 - 14:45
```

---

## 🎯 Best Practices

### 1. Always Cache User Information
```typescript
// ✅ GOOD: Store user name in warning record
issuedByName: user.name

// ❌ AVOID: Store only user ID
// Reason: User might change name, role later
// Solution: Query user each time (slower) or cache name
```

### 2. Use Both Formats of Timestamps
```typescript
// For filtering/querying:
dateOnly: '2026-09-01'

// For user display:
relativeTime: 'اليوم الساعة 10:45 ص'
```

### 3. Index Date-Only Fields
```prisma
@@index([dateOnly])        // Fast date filtering
@@index([timestamp])       // Fast ordering
```

### 4. Include User Information in Queries
```typescript
const warnings = await prisma.warning.findMany({
  include: {
    issuedByUser: true,    // Get full user info
    student: true,
  },
})
```

---

## 🔐 Security & Compliance

### Immutable Audit Trail
- User name and role are **cached** at time of action
- Cannot be retroactively changed (unlike User table updates)
- Complies with regulatory requirements

### IP Address & User Agent Tracking
```prisma
model AuditLog {
  ipAddress String?   // Who accessed the system from where
  userAgent String?   // What browser/device they used
}
```

### Data Retention
- Keep detailed audit logs for minimum 2 years
- Daily/monthly summary reports for compliance
- Archive old records while maintaining queryability

---

## 📈 Performance Considerations

### Index Strategy
```prisma
// Fast lookups by date
@@index([dateOnly])

// Fast sorting
@@index([timestamp])

// Fast filtering by user
@@index([userId])

// Combined indexes for common queries
@@index([userId, dateOnly])
```

### Query Optimization
```typescript
// ❌ SLOW: N+1 queries
warnings.forEach(w => {
  const user = prisma.user.findUnique({ id: w.issuedBy })
})

// ✅ FAST: Use include
const warnings = await prisma.warning.findMany({
  include: { issuedByUser: true }  // Single query
})
```

---

## 🚀 Migration Guide

### Step 1: Update Prisma Schema
- Replace `prisma/schema.prisma` with the new version
- Run: `npx prisma db push`

### Step 2: Deploy Components
- Add `enhanced-audit-log.tsx` component
- Add `student-history-tab.tsx` component

### Step 3: Update API Routes
- Modify warning creation to include new fields
- Modify audit logging to include new fields
- Modify student updates to track lastUpdatedBy

### Step 4: Update Utilities
- Replace `lib/utils.ts` with enhanced version

### Step 5: Update Tests
- Test date filtering
- Test user attribution display
- Test Arabic timestamp formatting

---

## 📞 Common Questions

**Q: Why cache user name in audit logs?**  
A: So audit trail stays accurate even if user's name changes or account is deleted.

**Q: How far back should we keep audit logs?**  
A: Minimum 2 years (regulatory requirement). Optional archival after 5 years.

**Q: Can we change timestamps after creation?**  
A: Not recommended. Use new audit entry instead. Timestamps should be immutable.

**Q: How to export audit logs?**  
A: UI ready in `enhanced-audit-log.tsx`. Backend needs PDF/Excel export API route.

---

## ✨ Next Steps

1. ✅ Database schema updated
2. ✅ UI components created
3. ✅ Utility functions added
4. ✅ API routes for creating/updating records with timestamps are implemented
5. ⏳ PDF export remains future work; CSV/report exports are available where implemented
6. ✅ The reports dashboard is implemented
7. ⏳ User activity analytics beyond the audit log remains future work

---

**Document Version**: 1.0  
**Date**: September 1, 2026  
**Author**: GitHub Copilot  
**Status**: Ready for Implementation
