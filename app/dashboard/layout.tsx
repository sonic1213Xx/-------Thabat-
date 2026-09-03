import { SidebarNav } from '@/components/dashboard/sidebar-nav'
import { TopNav } from '@/components/dashboard/top-nav'
import { ChatBotDrawer } from '@/components/chat-bot-drawer'
import { AuthGate } from '@/components/auth-gate'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AuthGate>
    <div className="flex min-h-screen w-full overflow-x-hidden bg-slate-50 dark:bg-slate-950 md:h-screen md:overflow-hidden">
      <SidebarNav />
      <ChatBotDrawer />
      <div className="flex min-w-0 flex-1 flex-col md:overflow-hidden">
        <TopNav />
        <main className="dashboard-main mx-auto w-full max-w-7xl flex-1 overflow-x-hidden p-6 md:overscroll-contain md:overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  </AuthGate>
}
