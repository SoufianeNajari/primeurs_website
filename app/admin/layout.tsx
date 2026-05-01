import LoginForm from './LoginForm'
import { isAdmin } from '@/lib/admin-auth'
import AdminNav from '@/components/admin/AdminNav'
import { ToastProvider } from '@/components/admin/Toast'
import { ConfirmProvider } from '@/components/admin/ConfirmModal'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdmin())) {
    return <LoginForm />
  }

  return (
    <ToastProvider>
      <ConfirmProvider>
        <div className="min-h-screen bg-neutral-50 flex flex-col">
          <AdminNav />
          <div className="flex-grow">{children}</div>
        </div>
      </ConfirmProvider>
    </ToastProvider>
  )
}
