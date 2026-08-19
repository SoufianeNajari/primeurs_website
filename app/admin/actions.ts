'use server'

import { revalidatePath } from 'next/cache'
import { getSession, isAdmin } from '@/lib/admin-auth'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { PARAM_COMMANDES_BLOQUEES, setParam } from '@/lib/parametres'

export async function login(formData: FormData) {
  const ip = getClientIp()
  const rl = await rateLimit('admin-login', ip, 5, 15 * 60 * 1000)
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

export async function setCommandesBloquees(bloque: boolean) {
  if (!(await isAdmin())) {
    return { success: false, error: 'Non autorisé' }
  }
  try {
    await setParam(PARAM_COMMANDES_BLOQUEES, bloque)
    revalidatePath('/admin/dashboard')
    revalidatePath('/boutique', 'layout')
    revalidatePath('/order', 'layout')
    // Le CartDrawer lit `bloquees` via cette route, servie en s-maxage=300 :
    // sans purge, le bouton « commander » reste figé jusqu'à 15 min après la
    // bascule (grisé à la réouverture, actif à la mise en pause).
    revalidatePath('/api/parametres/livraison')
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Erreur' }
  }
}
