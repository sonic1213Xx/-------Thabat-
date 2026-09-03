# ثَبَت (Thabat) - School Operations Logging System

> **Current status (September 2, 2026):** The dashboard, student CRUD/import/transfer flows, teams, divisions, warnings, attendance, audit log, reports, settings, chat drawer, themes, and Arabic/English language switching are implemented. English coverage is still partial in some page-body strings. The 500 ms language wave covers the full viewport, including portaled modals and drawers. Authentication/RBAC is not yet wired to a sign-in flow; API routes currently use the application's fallback active user.
## مرحبًا بك في نظام ثَبَت لتسجيل العمليات المدرسية

A modern, high-speed operational logbook and audit engine for Saudi schools. **ثَبَت** is built with Next.js 14, TypeScript, Prisma ORM, and Framer Motion for beautiful animations.

---

## 🚀 Quick Start (Local SQLite Setup)

### Prerequisites
- Node.js 18+ and npm/yarn
- Git (optional)

### 1. Install Dependencies
```bash
npm install
```

### 2. Generate Prisma Client
```bash
npx prisma generate
```

### 3. Initialize Local SQLite Database
```bash
npx prisma db push
```

This command will:
- Create a local `dev.db` SQLite database file in your project root
- Apply all Prisma migrations
- Prepare the database schema

### 4. Start Development Server
```bash
npm run dev
```

The app will be available at **http://localhost:3000**

### 5. View Database (Optional)
```bash
npx prisma studio
```

Opens Prisma Studio for visual database management at **http://localhost:5555**

---

## 📁 Project Structure

```
thabat/
├── app/
│   ├── layout.tsx              # Root layout with theme provider
│   ├── globals.css             # Global styles + RTL support
│   ├── page.tsx                # Home redirect
│   └── dashboard/
│       ├── layout.tsx          # Dashboard layout with sidebar
│       ├── page.tsx            # Main dashboard
│       ├── students/           # Student management
│       ├── divisions/          # Division management
│       ├── warnings/           # Warnings management
│       ├── audit-log/          # Audit trail view
│       ├── reports/            # Analytics & reports
│       └── settings/           # System settings
├── components/
│   ├── theme-provider.tsx      # Next-themes wrapper
│   └── dashboard/
│       ├── top-nav.tsx         # Top navigation bar
│       ├── sidebar-nav.tsx     # Left sidebar menu
│       ├── main-dashboard.tsx  # Main dashboard component
│       ├── stat-card.tsx       # Statistics card
│       ├── recent-activity-card.tsx  # Activity timeline
│       └── quick-action-card.tsx     # Action buttons
├── lib/
│   └── utils.ts                # Utility functions + translations
├── prisma/
│   └── schema.prisma           # Database schema
├── .env.local                  # Environment config (SQLite)
├── tailwind.config.ts          # Tailwind with RTL support
├── tsconfig.json               # TypeScript configuration
├── next.config.js              # Next.js configuration
└── package.json                # Dependencies
```

---

## 🛠️ Tech Stack

| Technology | Purpose |
|-----------|---------|
| **Next.js 14** | React framework with App Router |
| **TypeScript** | Type-safe development |
| **Prisma ORM** | Database abstraction & migrations |
| **SQLite** | Local database (dev.db) |
| **Tailwind CSS** | Styling + RTL support |
| **Shadcn UI** | Component library |
| **Framer Motion** | Smooth animations |
| **next-themes** | Dark/Light/Custom themes |
| **SheetJS/ExcelJS** | Excel file parsing |
| **Lucide React** | Icon library |
| **Zustand** | State management |

---

## 🗄️ Database Schema

### Core Models:
1. **User** - System users (Principal, Vice Principal, Teachers)
2. **Student** - Student records with behavior/attendance scores
3. **Warning** - Behavior warnings with point deductions
4. **TransferHistory** - Track student division transfers
5. **AuditLog** - Complete audit trail for all operations
6. **LoginHistory** - Track user login attempts
7. **ExcelImportLog** - Track Excel file imports

### Division Numbering System:
- **1st Thanawiya (الأول الثانوي)**: 101, 102
- **2nd Thanawiya (الثاني الثانوي)**: 201, 202
- **3rd Thanawiya (الثالث الثانوي)**: 301, 302

---

## 🎨 Theme System

The app supports three themes:
- **Light** (default)
- **Dark**
- **School Emerald** (custom green palette)

Theme switching is available in the top navigation. Theme preference is saved to localStorage.

---

## 🔄 Switching to PostgreSQL (Production)

To switch from SQLite to PostgreSQL for production deployment:

### 1. Update `.env.local`:
```env
# Option A: PostgreSQL (local or remote)
DATABASE_URL="postgresql://user:password@localhost:5432/thabat"

# Option B: Neon (Vercel's PostgreSQL)
DATABASE_URL="postgresql://user:password@[neon-host]/thabat"
```

### 2. Update `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"  # Change from "sqlite"
  url      = env("DATABASE_URL")
}
```

### 3. Create & apply migrations:
```bash
npx prisma migrate dev --name init
```

### 4. Deploy to Vercel:
```bash
vercel deploy
```

---

## 📋 Core Features (Implemented)

✅ **Dashboard**
- Statistics cards with real-time data
- Recent activity timeline with animations
- Quick action buttons
- Responsive grid layout
- Dark/Light theme switching

✅ **Navigation**
- Sidebar navigation with active state
- Top navigation bar with theme toggle
- Clean Arabic RTL layout

✅ **Animations**
- Framer Motion spring physics for all interactions
- Staggered animations for list items
- Smooth transitions and hover effects
- No visual glitches or layout shifts

---

## 📋 Current Feature Areas

🔲 **Excel Parser Component** (`/dashboard/import`)
- Drag-and-drop file upload
- Automatic column detection
- Preview modal before saving
- Error handling for merged cells

🔲 **Student Management** (`/dashboard/students`)
- List view with filters
- Manual entry form
- Bulk import from Excel
- Search and sort

🔲 **Division Management** (`/dashboard/divisions`)
- Division overview
- Single student transfer modal
- Bulk transfer feature
- Transfer history tracking

🔲 **Warnings System** (`/dashboard/warnings`)
- Issue new warning form
- Warning history
- Score recalculation
- Resolution tracking

🔲 **Audit Log** (`/dashboard/audit-log`)
- Timeline view of all operations
- Filter by action/user/date
- Export audit trail

🔲 **Reports** (`/dashboard/reports`)
- Behavior statistics
- Attendance reports
- Student performance charts
- Export to PDF/Excel

🔲 **Settings** (`/dashboard/settings`)
- User management
- System configuration
- Master override for Principal

---

## 🔐 Authentication Status

Next-Auth v5 integration is configured in `.env.local`. Implementation details:
- Password hashing with bcryptjs
- Session management
- Role-based access control (RBAC)

---

## 📊 Database Seed (For Testing)

To populate the database with sample data:

```bash
# Create a seed file at prisma/seed.ts
npx prisma db seed
```

---

## 🐛 Troubleshooting

### Database Issues
**Problem**: `dev.db` not created
```bash
# Solution: Manually push schema
npx prisma db push --force-reset
```

**Problem**: Port 3000 already in use
```bash
# Solution: Run on different port
npm run dev -- -p 3001
```

### Theme Not Persisting
- Clear browser cache (Ctrl+Shift+Del)
- Check localStorage: `thabat-theme`

### Animations Laggy
- Reduce animation complexity in `main-dashboard.tsx`
- Check browser performance (F12 → Performance)

---

## 📝 Environment Variables

Create/update `.env.local`:

```env
# Database (SQLite for local, PostgreSQL for production)
DATABASE_URL="file:./dev.db"

# App Configuration
NODE_ENV="development"
NEXT_PUBLIC_API_URL="http://localhost:3000"

# Authentication
NEXTAUTH_SECRET="dev-secret-key-change-in-production"
NEXTAUTH_URL="http://localhost:3000"

# Theme
NEXT_PUBLIC_THEME_DEFAULT="light"
```

---

## 📱 Responsive Design

The app is fully responsive:
- **Mobile**: Single column, collapsible sidebar
- **Tablet**: 2-3 columns with responsive grid
- **Desktop**: Full 4-column layout with fixed sidebar

---

## 🎯 Development Roadmap

1. ✅ Project setup & configuration
2. ✅ Dashboard with animations
3. ⏳ Excel parser component
4. ⏳ Student management module
5. ⏳ Division transfer system
6. ⏳ Warnings management
7. ⏳ Audit logging dashboard
8. ⏳ Reports & analytics
9. ⏳ Authentication & RBAC
10. ⏳ Deployment to Vercel

---

## 🤝 Contributing

To add new features:

1. Create a new branch: `git checkout -b feature/feature-name`
2. Create components in `components/` folder
3. Add new API routes in `app/api/` folder
4. Test locally before committing
5. Push and create a pull request

---

## 📄 License

This project is built for Saudi schools. All rights reserved.

---

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Prisma docs: https://www.prisma.io/docs/
3. Next.js docs: https://nextjs.org/docs

---

**Version**: 1.0.0  
**Last Updated**: 2024  
**Built with ❤️ for Saudi schools**
