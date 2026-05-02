import LoginForm from './LoginForm'
import { isAdmin } from '@/lib/admin-auth'
import AdminNav from '@/components/admin/AdminNav'
import { ToastProvider } from '@/components/admin/Toast'
import { ConfirmProvider } from '@/components/admin/ConfirmModal'
import AdminAuthWatcher from '@/components/admin/AdminAuthWatcher'
import AdminRouterRefresh from '@/components/admin/AdminRouterRefresh'
import OfflineBanner from '@/components/admin/OfflineBanner'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdmin())) {
    return <LoginForm />
  }

  return (
    <ToastProvider>
      <ConfirmProvider>
        <AdminAuthWatcher />
        <AdminRouterRefresh />
        <div className="min-h-screen bg-neutral-50 flex flex-col">
          <AdminNav />
          <OfflineBanner />
          <div className="flex-grow">{children}</div>
        </div>
      </ConfirmProvider>
    </ToastProvider>
  )
}
