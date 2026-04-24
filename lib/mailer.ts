import { Resend } from 'resend';

// Ne pas initialiser Resend en haut du fichier pour éviter le crash au chargement si la clé manque
// On l'initialisera dans la fonction

type SendMailOptions = {
  to: string | string[];
  subject: string;
  html: string;
};

export async function sendEmail({ to, subject, html }: SendMailOptions) {
  const apiKey = process.env.RESEND_API_KEY;
  
  if (!apiKey) {
    console.error("ERREUR CRITIQUE: RESEND_API_KEY est manquante dans .env.local");
    throw new Error("Configuration e-mail manquante.");
  }

  const resend = new Resend(apiKey);

  try {
    // Par défaut, Resend permet d'envoyer depuis onboarding@resend.dev vers l'adresse
    // avec laquelle vous avez créé le compte Resend (pour tester gratuitement).
    // Une fois un nom de domaine configuré sur Resend, remplacez "onboarding@resend.dev" par "contact@votre-domaine.com".
    const data = await resend.emails.send({
      from: 'Pontault Primeurs <onboarding@resend.dev>',
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    });

    return data;
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'e-mail avec Resend:", error);
    throw error;
  }
}

