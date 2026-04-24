'use server'

import { cookies } from 'next/headers'

export async function login(formData: FormData) {
  const password = formData.get('password')
  const adminPassword = process.env.ADMIN_PASSWORD

  if (password === adminPassword) {
    cookies().set('admin_auth', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 8 * 60 * 60, // 8 heures
      path: '/',
    })
    return { success: true }
  } else {
    return { success: false, error: 'Mot de passe incorrect' }
  }
}
