import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isAdmin } from '@/lib/admin-auth';

export async function PATCH(request: Request) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const { id, disponible, masque_boutique } = body as {
      id?: string;
      disponible?: boolean;
      masque_boutique?: boolean;
    };

    if (!id || (typeof disponible !== 'boolean' && typeof masque_boutique !== 'boolean')) {
      return NextResponse.json({ error: 'Données invalides' }, { status: 400 });
    }

    const update: { disponible?: boolean; masque_boutique?: boolean } = {};
    if (typeof disponible === 'boolean') update.disponible = disponible;
    if (typeof masque_boutique === 'boolean') {
      update.masque_boutique = masque_boutique;
      // Couplage : un produit masqué est forcément indispo (cohérence visuelle
      // côté admin et garantie côté boutique).
      if (masque_boutique === true) update.disponible = false;
    }

    const { error } = await supabaseAdmin
      .from('produits')
      .update(update)
      .eq('id', id);

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur API toggle:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
