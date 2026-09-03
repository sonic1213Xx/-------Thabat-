# ثَبَت (Thabat) - Architecture & Implementation Guide

> **Architecture status (September 2, 2026):** All dashboard page routes listed below are implemented, not placeholders. The API layer is active for students, teams, divisions, warnings, attendance, audit logs, chat, imports, transfers, and development data reset. Authentication and authorization remain future work. The default database is SQLite; PostgreSQL requires changing the Prisma datasource and applying a migration.

## 📐 System Architecture

### Technology Stack Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Layer (React)                   │
├──────────────────────────────────────────────────────────────┤
│  Next.js 14 (App Router)  │  TypeScript  │  Tailwind CSS    │
│  Framer Motion (Animations) │  Shadcn UI (Components)       │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────┐
│              API Layer (Next.js API Routes)                 │
├───────────────────────────────────────────────────────────────┤
│  RESTful endpoints for CRUD operations                       │
│  Authentication & Authorization middleware                  │
└──────────────────────────┬────────────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────┐
│            Data Access Layer (Prisma ORM)                   │
├───────────────────────────────────────────────────────────────┤
│  SQLite (Development)  │  PostgreSQL (Production)           │
└──────────────────────────┬────────────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────────┐
│              Database Layer (SQLite / PostgreSQL)           │
├───────────────────────────────────────────────────────────────┤
│  User  │  Student  │  Warning  │  TransferHistory           │
│  AuditLog  │  LoginHistory  │  ExcelImportLog             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗂️ Project Organization

### Directory Structure Explained

```
app/
├── layout.tsx              # Root HTML structure + providers
├── globals.css             # Global styles (reset, RTL, animations)
├── page.tsx                # Redirect to /dashboard
└── dashboard/
    ├── layout.tsx          # Dashboard wrapper (sidebar + nav)
    ├── page.tsx            # Main dashboard view
    ├── students/           # Student management routes
    ├── divisions/          # Division management routes
    ├── warnings/           # Warning management routes
    ├── audit-log/          # Audit trail routes
    ├── reports/            # Analytics routes
    └── settings/           # System settings routes

components/
├── theme-provider.tsx      # Next-themes wrapper for dark mode
└── dashboard/
    ├── top-nav.tsx         # Top navigation bar
    ├── sidebar-nav.tsx     # Left sidebar menu
    ├── main-dashboard.tsx  # Dashboard home page (animated)
    ├── stat-card.tsx       # Statistics card component
    ├── recent-activity-card.tsx  # Activity timeline
    ├── quick-action-card.tsx    # Quick action buttons
    ├── student-management.tsx   # Student table + import
    ├── division-transfer.tsx    # Division transfer UI
    ├── audit-log-view.tsx       # Audit log timeline
    └── excel-parser.tsx        # Excel file upload & parse

lib/
└── utils.ts               # Utility functions + Arabic translations
                           # Functions: cn(), formatDateArabic(), etc.

types/
└── index.ts              # TypeScript interfaces & enums
                          # All data models defined here

prisma/
├── schema.prisma         # Database models & relationships
├── migrations/           # Database migration history (auto-generated)
└── dev.db               # SQLite database (local development)

.env.local               # Environment variables (DATABASE_URL, etc)
tailwind.config.ts       # Tailwind CSS config + RTL support
tsconfig.json            # TypeScript configuration
next.config.js           # Next.js build configuration
postcss.config.js        # CSS processing pipeline
package.json             # Dependencies & scripts
```

---

## 🎨 UI Component Hierarchy

```
MainDashboard
├── Header (h1, subtitle)
├── Stats Grid (4 columns)
│   ├── StatCard ×4
│   └── Animations: staggered spring physics
├── Content Grid (3 columns)
│   ├── RecentActivityCard (col-span-2)
│   │   └── Activity Timeline (AnimatePresence)
│   └── Quick Stats Card
└── Quick Actions Grid (4 columns)
    └── QuickActionCard ×4
```

---

## 🔄 Data Flow

### User → UI → API → Database

```
1. User Action (Click button)
   ↓
2. React State Update (useState)
   ↓
3. API Call (fetch /api/...)
   ↓
4. Next.js API Route Handler
   ↓
5. Prisma Client Query
   ↓
6. SQLite Database
   ↓
7. Response → UI Update (Framer Motion animations)
```

### Example: Issue Warning to Student

```
StudentWarningForm.tsx (Component)
   ↓ (form submission)
POST /api/warnings/create
   ↓ (API route handler)
app/api/warnings/route.ts
   ↓ (Prisma ORM)
prisma.warning.create({
  studentId,
  issuedBy,
  type,
  deduction,
  ...
})
   ↓
SQLite: INSERT INTO "Warning" ...
   ↓
AuditLog: Create audit entry
   ↓ (Response)
UI Updates → Framer Motion animation
```

---

## 🔐 Role-Based Access Control (RBAC)

### Roles & Permissions

```
┌─────────────────┬──────────────────┬──────────────────┬──────────────┐
│ Permission      │ Principal        │ Vice Principal   │ Teacher      │
├─────────────────┼──────────────────┼──────────────────┼──────────────┤
│ View Dashboard  │ ✅               │ ✅               │ ✅           │
│ Add Student     │ ✅               │ ✅               │ ❌           │
│ Delete Student  │ ✅               │ ❌               │ ❌           │
│ Issue Warning   │ ✅               │ ✅               │ ✅           │
│ Transfer Student│ ✅               │ ✅               │ ❌           │
│ View Audit Log  │ ✅               │ ✅               │ ❌           │
│ System Override │ ✅ (Master Key)  │ ❌               │ ❌           │
│ Generate Report │ ✅               │ ✅               │ ✅ (Limited) │
└─────────────────┴──────────────────┴──────────────────┴──────────────┘
```

---

## 🎬 Animation Strategy

### Framer Motion Configuration

All animations use consistent spring physics for smooth, natural motion:

```typescript
const motionConfig = {
  type: 'spring',
  stiffness: 300,      // Higher = snappier
  damping: 30,         // Higher = less bouncy
}
```

### Animation Patterns Used

#### 1. Container Stagger Animation
```typescript
containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,  // Delay between each child
      delayChildren: 0.2,    // Initial delay
    },
  },
}
```

#### 2. Individual Item Animation
```typescript
itemVariants = {
  hidden: { opacity: 0, y: 20 },      // Start invisible, below
  show: {
    opacity: 1,
    y: 0,                              // Move to position
    transition: { type: 'spring', ... },
  },
}
```

#### 3. Hover/Tap Effects
```typescript
whileHover={{ scale: 1.02, translateY: -4 }}
whileTap={{ scale: 0.98 }}
```

#### 4. AnimatePresence Mode
```typescript
<AnimatePresence mode="popLayout">
  {/* Items animate in/out with layout reflow */}
</AnimatePresence>
```

---

## 📊 Database Schema Deep Dive

### User Model
```prisma
User {
  id: String          @id @default(cuid())
  username: String    @unique
  name: String
  email: String?      @unique
  password: String    // bcryptjs hashed
  role: UserRole      // PRINCIPAL, VICE_PRINCIPAL, TEACHER
  isActive: Boolean   @default(true)
  createdAt: DateTime @default(now())
  updatedAt: DateTime @updatedAt
}
```

### Student Model
```prisma
Student {
  id: String
  nationalId: String    @unique
  fullName: String
  gradeLevel: Int       // 1, 2, or 3
  divisionCode: String  // 101, 102, etc.
  behaviorScore: Int    // 0-100 (decremented by warnings)
  attendanceScore: Int  // 0-100 (tracked separately)
  isActive: Boolean
}
```

### Warning Model
```prisma
Warning {
  studentId: String     // Foreign key to Student
  issuedBy: String      // User ID
  type: WarningType     // TARDINESS, ABSENCE, etc.
  deduction: Int        // Points deducted (default 2)
  severity: Severity    // MINOR, MODERATE, MAJOR
  isResolved: Boolean
}
```

### Relationships
- **User** ← → **Warning** (One-to-Many): User issues warnings
- **Student** ← → **Warning** (One-to-Many): Student receives warnings
- **Student** ← → **TransferHistory** (One-to-Many): Multiple transfers per student
- **User** ← → **AuditLog** (One-to-Many): Users trigger audit entries

---

## 🔑 Key Features Implementation

### 1. Excel Parser (`components/dashboard/excel-parser.tsx`)
- Drag-and-drop file upload
- Uses SheetJS to parse `.xlsx` and `.xls` files
- Auto-detects Arabic column headers
- Preview table before saving
- Error handling for malformed data

### 2. Student Management (`components/dashboard/student-management.tsx`)
- Paginated table with search
- Filter by grade level
- Bulk import from Excel
- Add/Edit/Delete individual students
- Display behavior and attendance scores

### 3. Division Transfer (`components/dashboard/division-transfer.tsx`)
- Visual division selector
- Multi-select students for bulk transfer
- Transfer reason optional field
- Real-time student count display
- Confirmation modal before transfer

### 4. Audit Log (`components/dashboard/audit-log-view.tsx`)
- Timeline view with visual indicators
- Filter by action type and severity
- Search across user, student, and details
- Export audit trail to PDF/Excel
- Color-coded severity levels (low/medium/high)

---

## 🚀 API Routes (To Be Implemented)

```
/api/students
  GET   /         (List all students)
  POST  /         (Create student)
  GET   /:id      (Get student details)
  PATCH /:id      (Update student)
  DELETE/:id      (Delete student)

/api/warnings
  GET   /         (List warnings)
  POST  /         (Issue warning)
  PATCH /:id      (Resolve warning)

/api/divisions
  GET   /         (List divisions)
  POST  /transfer (Bulk transfer students)

/api/audit-log
  GET   /         (Get audit log entries)
  POST  /export   (Export audit trail)

/api/excel
  POST  /import   (Import Excel file)
```

---

## 🛡️ Security Considerations

### Authentication (Not Yet Implemented)
- Session-based authentication
- Password hashing with bcryptjs
- CSRF protection
- Secure cookies (HttpOnly, Secure, SameSite)

### Authorization
- Middleware to check user role
- Route protection based on permissions
- Audit logging for sensitive operations

### Data Validation
- Server-side validation on all inputs
- Sanitize user input to prevent XSS
- Rate limiting on API endpoints

### Database
- Prepared statements (Prisma handles this)
- No SQL injection possible
- Regular database backups

---

## 📈 Performance Optimization

### Frontend
- Code splitting (Next.js automatic)
- Image optimization
- CSS-in-JS (Tailwind)
- Animation frame optimization (Framer Motion)

### Database
- Indexed columns (defined in schema.prisma)
- Pagination for large datasets
- Query optimization via Prisma

### Caching
- Next.js incremental static regeneration
- Browser cache headers
- Local storage for theme preference

---

## 🧪 Testing Strategy (Current Gap)

### Unit Tests
```bash
npm test -- components/
```

### Integration Tests
```bash
npm test -- __tests__/
```

### E2E Tests (Playwright)
```bash
npm run test:e2e
```

---

## 📦 Deployment Checklist

- [ ] Update `.env` variables for production
- [ ] Switch DATABASE_URL to PostgreSQL
- [ ] Run `npm run build`
- [ ] Test production build locally
- [ ] Deploy to Vercel/Netlify
- [ ] Configure domain
- [ ] Set up HTTPS
- [ ] Monitor performance & errors
- [ ] Backup database regularly

---

## 🎓 Learning Resources

### For Development Team
1. **Next.js App Router**: https://nextjs.org/docs/app
2. **Prisma ORM**: https://www.prisma.io/docs/
3. **Tailwind CSS**: https://tailwindcss.com/docs
4. **Framer Motion**: https://www.framer.com/motion/
5. **React Best Practices**: https://react.dev/

### For School IT Team
1. **Database Setup**: See `LOCAL_SETUP_GUIDE.md`
2. **Deployment**: See `README.md` PostgreSQL section
3. **Backup Strategy**: Regular database snapshots
4. **User Management**: Create users via Prisma Studio

---

## 📋 Development Workflow

### Creating a New Feature

```bash
# 1. Create component
touch components/dashboard/new-feature.tsx

# 2. Add types if needed
# Edit types/index.ts

# 3. Update database if needed
# Edit prisma/schema.prisma
npx prisma db push

# 4. Create API route
touch app/api/new-feature/route.ts

# 5. Test locally
npm run dev

# 6. Build for production
npm run build

# 7. Commit to git
git add .
git commit -m "feat: Add new feature"
```

---

## 🔧 Maintenance Tasks

### Weekly
- Monitor database size
- Check error logs
- Review audit log

### Monthly
- Database optimization (VACUUM)
- Update dependencies: `npm update`
- Performance benchmarking

### Quarterly
- Security audit
- Backup verification
- User access review

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**For Questions**: Refer to inline code comments or README.md
