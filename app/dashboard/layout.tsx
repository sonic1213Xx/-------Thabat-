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
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-950">
      <SidebarNav />
      <ChatBotDrawer />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopNav />
        <main className="dashboard-main mx-auto w-full max-w-7xl flex-1 overscroll-contain overflow-y-auto overflow-x-hidden p-6">
          {children}
        </main>
      </div>
    </div>
  </AuthGate>
}
