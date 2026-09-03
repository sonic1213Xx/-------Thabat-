# ثَبَت (Thabat) - Quick Start Cheat Sheet

> **Verified September 2, 2026:** Use the commands below with the current Next.js 14 app. The production build passes TypeScript and lint checks. Arabic (`ar`/`rtl`) and English (`en`/`ltr`) switching is implemented with a 500 ms full-viewport wave; localization of some page-body strings remains in progress.

## 🚀 Get Started in 5 Minutes

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Setup Database
```bash
npx prisma generate
npx prisma db push
```

### Step 3: Start Development Server
```bash
npm run dev
```

### Step 4: Open Browser
Navigate to: **http://localhost:3000**

---

## 🎯 Most Used Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server |
| `npx prisma studio` | View/manage database |
| `npx prisma db push` | Sync schema to database |
| `npm run build` | Build for production |
| `npm run lint` | Check code quality |

---

## 📁 Key Files to Edit

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Database models |
| `app/dashboard/page.tsx` | Dashboard page |
| `components/dashboard/*.tsx` | Dashboard components |
| `.env.local` | Environment variables |
| `tailwind.config.ts` | Tailwind configuration |

---

## 🎨 Color Palette (Tailwind Classes)

- **Primary (Emerald School)**: `bg-emerald-school-600`, `text-emerald-school-500`
- **Neutral (Slate)**: `bg-slate-100`, `text-slate-900`
- **Dark Mode**: `dark:bg-slate-900`, `dark:text-white`

---

## 🔗 Important Links

- **Dashboard**: http://localhost:3000/dashboard
- **Database UI**: http://localhost:5555 (after `npx prisma studio`)
- **Next.js Docs**: https://nextjs.org/docs
- **Prisma Docs**: https://www.prisma.io/docs/

---

## 🎬 Component Usage Example

### Using MainDashboard
```typescript
'use client'
import { MainDashboard } from '@/components/dashboard/main-dashboard'

export default function DashboardPage() {
  return <MainDashboard />
}
```

### Using ExcelParser
```typescript
<ExcelParser 
  onParsed={(students) => {
    console.log('Parsed students:', students)
  }} 
/>
```

---

## 📊 Division Codes Reference

| Code | Label | Grade |
|------|-------|-------|
| 101 | الأول الثانوي - أ | 1st |
| 102 | الأول الثانوي - ب | 1st |
| 201 | الثاني الثانوي - أ | 2nd |
| 202 | الثاني الثانوي - ب | 2nd |
| 301 | الثالث الثانوي - أ | 3rd |
| 302 | الثالث الثانوي - ب | 3rd |

---

## 🔄 Environment Variables

**Local Development (.env.local)**:
```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="dev-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

**Production (PostgreSQL)**:
```env
DATABASE_URL="postgresql://user:pass@host/thabat"
```

---

## 🧪 Testing Excel Parser

1. Open http://localhost:3000/dashboard
2. Click "استيراد من Excel" in Quick Actions
3. Drag `.xlsx` file or click to select
4. Preview data in table
5. Click "حفظ البيانات"

---

## 💡 Pro Tips

✨ **Theme Switching**: Click sun/moon icon in top nav  
🔍 **Database Exploration**: Run `npx prisma studio`  
📱 **Responsive**: Works on mobile, tablet, desktop  
🎬 **Smooth Animations**: Framer Motion handles all transitions  
🌐 **RTL Support**: Arabic text is right-aligned by default  

---

## ❌ Common Issues & Fixes

**Port 3000 in use?**
```bash
npm run dev -- -p 3001
```

**Database not created?**
```bash
npx prisma db push --force-reset
```

**Type errors?**
```bash
npx tsc --noEmit
```

**Module not found?**
```bash
npm install
npx prisma generate
```

---

## 📞 Need Help?

- Check [LOCAL_SETUP_GUIDE.md](LOCAL_SETUP_GUIDE.md) for detailed setup
- Check [ARCHITECTURE.md](ARCHITECTURE.md) for technical details
- Check [README.md](README.md) for feature documentation

---

**Happy Coding! 💚**  
Built with ❤️ for Saudi schools
