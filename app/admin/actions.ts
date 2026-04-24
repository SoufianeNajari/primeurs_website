'use server'

import { getSession } from '@/lib/admin-auth'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

export async function login(formData: FormData) {
  const ip = getClientIp()
  const rl = rateLimit('admin-login', ip, 5, 15 * 60 * 1000)
  if (!rl.success) {
    return { success: false, error: 'Trop de tentatives. Réessayez dans quelques minutes.' }
  }

  const password = formData.get('password')
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!adminPassword) {
    return { success: false, error: 'Configuration serveur incomplète.' }
  }

  if (typeof password !== 'string' || password !== adminPassword) {
    return { success: false, error: 'Mot de passe incorrect' }
  }

  const session = await getSession()
  session.isAdmin = true
  session.loggedInAt = Date.now()
  await session.save()

  return { success: true }
}

export async function logout() {
  const session = await getSession()
  session.destroy()
  return { success: true }
}
