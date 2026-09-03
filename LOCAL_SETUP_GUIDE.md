# ثَبَت (Thabat) - Local Development Setup Guide

> **Current setup note (September 2, 2026):** The repository uses Next.js 14, React 18, TypeScript, Prisma 5, and SQLite by default. Run `npm run setup:local` for the combined install, Prisma generation, and schema push. `GEMINI_API_KEY` is required only for the chat endpoint.

## 📖 Step-by-Step Setup Instructions

### ✅ Step 1: Install Node.js
Ensure you have Node.js 18 or higher installed:

```bash
node --version  # Should be v18.0.0 or higher
npm --version   # Should be v9.0.0 or higher
```

**Download**: https://nodejs.org/

---

### ✅ Step 2: Clone or Create Project

Navigate to your desired directory:
```bash
cd C:\Users\jks20\Documents
# Project folder "ثَبَت (Thabat)" should already exist
```

---

### ✅ Step 3: Install Dependencies

Open terminal in VS Code (Ctrl+`) and run:

```bash
npm install
```

This will install all required packages including:
- Next.js 14
- React 18.3.1
- Prisma ORM
- Tailwind CSS
- Framer Motion
- SheetJS (Excel parsing)
- And more...

**Expected time**: 2-5 minutes depending on internet speed

---

### ✅ Step 4: Initialize Prisma

Generate Prisma client:

```bash
npx prisma generate
```

This creates the Prisma client for database operations.

---

### ✅ Step 5: Create & Migrate Database

Push the schema to SQLite database:

```bash
npx prisma db push
```

**What this does**:
- Creates `dev.db` file in project root (SQLite database)
- Applies all model definitions from `prisma/schema.prisma`
- Sets up all tables and relationships

**Output should include**: ✅ Database push complete

---

### ✅ Step 6: Start Development Server

```bash
npm run dev
```

**Output should look like**:
```
  ▲ Next.js 14.0.0
  - Local:        http://localhost:3000
  - Environments: .env.local

 ✓ Ready in 1.2s
```

---

### ✅ Step 7: Open in Browser

Navigate to: **http://localhost:3000**

You should see the ثَبَت dashboard with:
- Top navigation with theme toggle
- Sidebar with menu items
- Main dashboard with animated cards
- Statistics and recent activity

---

## 🔧 Useful Development Commands

### Run Development Server
```bash
npm run dev
```
Starts Next.js in development mode with hot reload.

### Build Production
```bash
npm run build
```
Creates optimized production build.

### Start Production
```bash
npm start
```
Runs the production build.

### Lint Code
```bash
npm run lint
```
Checks for code quality issues.

### Generate Prisma Client
```bash
npx prisma generate
```
Regenerate Prisma client after schema changes.

### Migrate Database
```bash
npx prisma db push
```
Applies schema changes to database.

### Open Prisma Studio
```bash
npx prisma studio
```
Visual database management interface (http://localhost:5555)

### Seed Database (Add Sample Data)
```bash
npx prisma db seed
```
(Requires `prisma/seed.ts` file)

---

## 📁 Project Structure Overview

```
ثَبَت/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout
│   ├── globals.css        # Global styles
│   ├── page.tsx           # Home page
│   └── dashboard/         # Dashboard pages
│       ├── layout.tsx
│       ├── page.tsx
│       ├── students/
│       ├── divisions/
│       ├── warnings/
│       ├── audit-log/
│       ├── reports/
│       └── settings/
│
├── components/            # React components
│   ├── theme-provider.tsx
│   └── dashboard/
│       ├── main-dashboard.tsx
│       ├── stat-card.tsx
│       ├── student-management.tsx
│       ├── division-transfer.tsx
│       ├── audit-log-view.tsx
│       ├── excel-parser.tsx
│       ├── top-nav.tsx
│       └── sidebar-nav.tsx
│
├── lib/                   # Utilities
│   └── utils.ts          # Helper functions
│
├── prisma/               # Database
│   └── schema.prisma     # Data models
│
├── .env.local            # Environment variables
├── tailwind.config.ts    # Tailwind config
├── tsconfig.json         # TypeScript config
├── next.config.js        # Next.js config
├── postcss.config.js     # PostCSS config
├── package.json          # Dependencies
└── README.md             # Documentation
```

---

## 🗄️ Database Setup Details

### SQLite (Local Development - Default)

**Configuration** (`.env.local`):
```env
DATABASE_URL="file:./dev.db"
```

**Pros**:
- ✅ Zero setup required
- ✅ File-based (no server)
- ✅ Perfect for offline development
- ✅ Fast for small datasets

**Cons**:
- ❌ Single user (not suitable for production)
- ❌ Not ideal for high concurrency

**Database file location**: `C:\Users\jks20\Documents\ثَبَت (Thabat)\dev.db`

---

### PostgreSQL (Production - Optional)

To switch to PostgreSQL later:

1. **Update `.env.local`**:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/thabat"
```

2. **Update `prisma/schema.prisma`**:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

3. **Migrate**:
```bash
npx prisma migrate dev --name init
```

**Popular options**:
- **Neon** (Vercel's PostgreSQL): https://neon.tech
- **Supabase**: https://supabase.com
- **Local PostgreSQL**: https://www.postgresql.org/download/

---

## 🎯 Next Steps (Features to Build)

After setup, you can:

1. **Test Dashboard**: Navigate the UI, check animations
2. **Import Excel**: Go to `/dashboard` → Quick Actions → "استيراد من Excel"
3. **Add Students**: Click "إضافة طالب" button
4. **View Database**: Run `npx prisma studio`
5. **Check Logs**: View browser console for any errors

---

## 🐛 Troubleshooting

### Issue: Port 3000 Already in Use
**Solution**:
```bash
npm run dev -- -p 3001
```
Runs on port 3001 instead.

### Issue: `dev.db` Not Created
**Solution**:
```bash
npx prisma db push --force-reset
```

### Issue: Theme Not Persisting
**Solution**:
- Clear browser cache (Ctrl+Shift+Delete)
- Check: F12 → Application → localStorage → `thabat-theme`

### Issue: Module Not Found Errors
**Solution**:
```bash
npm install
npx prisma generate
```

### Issue: Animations Laggy
**Solution**:
- Reduce animation complexity in component files
- Check: F12 → Performance tab
- Disable browser extensions

### Issue: TypeScript Errors
**Solution**:
```bash
npx tsc --noEmit
```
Shows all type errors.

---

## 📊 Prisma Schema Overview

### Tables Created:

1. **User** - System users (Principal, Vice Principal, Teachers)
   - Fields: id, username, name, email, password, role, isActive

2. **Student** - Student records
   - Fields: id, nationalId, fullName, gradeLevel, divisionCode, behaviorScore, attendanceScore

3. **Warning** - Behavior warnings
   - Fields: id, studentId, issuedBy, type, deduction, severity, isResolved

4. **TransferHistory** - Division transfers
   - Fields: id, studentId, fromDivision, toDivision, changedBy, timestamp

5. **AuditLog** - Complete audit trail
   - Fields: id, userId, action, targetName, details, timestamp

6. **LoginHistory** - User login attempts
   - Fields: id, userId, ipAddress, userAgent, success, timestamp

7. **ExcelImportLog** - Excel import tracking
   - Fields: id, fileName, rowCount, status, createdAt

---

## 🎨 Theme System

### Switching Themes:
Click the sun/moon icon in top navigation.

### Available Themes:
- **Light**: Default light mode
- **Dark**: Dark mode for night viewing
- **Auto**: Follows system preference

### Custom Theme:
Edit `tailwind.config.ts` to add custom colors:
```typescript
colors: {
  'emerald-school': {
    50: '#f0fdf4',
    // ... more colors
    900: '#145231',
  },
}
```

---

## 🚀 Performance Tips

1. **Use Chrome DevTools**:
   - Press F12 → Performance tab
   - Record and analyze

2. **Check Build Size**:
   ```bash
   npm run build
   ```

3. **Optimize Images**: Use WebP format

4. **Monitor Database**: Use Prisma Studio
   ```bash
   npx prisma studio
   ```

---

## 📝 Git & Version Control

Initialize git (if not already done):
```bash
git init
git add .
git commit -m "Initial commit: ثَبَت school operations system"
```

### .gitignore already configured to exclude:
- `node_modules/`
- `dev.db` (database file)
- `.env.local`
- `.next/`
- Build artifacts

---

## 🔐 Security Notes

⚠️ **Local Development Only**:
- `.env.local` contains `NEXTAUTH_SECRET="dev-secret"`
- Change this before production deployment
- Never commit `.env.local` to git

---

## 📞 Support & Resources

- **Next.js Docs**: https://nextjs.org/docs
- **Prisma Docs**: https://www.prisma.io/docs/
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Framer Motion**: https://www.framer.com/motion/
- **Shadcn/ui**: https://ui.shadcn.com/

---

## ✨ Quick Commands Cheat Sheet

```bash
# Install dependencies
npm install

# Start development
npm run dev

# Prisma operations
npx prisma generate          # Generate client
npx prisma db push           # Sync schema
npx prisma studio            # Open UI
npx prisma migrate dev --name <name>  # Create migration

# Build & test
npm run build                # Production build
npm start                    # Run production
npm run lint                 # Check code quality
```

---

**You're all set! 🎉**

Visit http://localhost:3000 to see ثَبَت in action.

For questions or issues, refer to the troubleshooting section above or check project documentation.

**Happy coding! 💚**
