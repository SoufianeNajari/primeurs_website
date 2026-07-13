import { Resend } from 'resend';

// Ne pas initialiser Resend en haut du fichier pour éviter le crash au chargement si la clé manque
// On l'initialisera dans la fonction

type MailAttachment = {
  filename: string;
  content: Buffer;
};

type SendMailOptions = {
  to: string | string[];
  subject: string;
  html: string;
  attachments?: MailAttachment[];
};

export async function sendEmail({ to, subject, html, attachments }: SendMailOptions) {
  const apiKey = process.env.RESEND_API_KEY;
  
  if (!apiKey) {
    console.error("ERREUR CRITIQUE: RESEND_API_KEY est manquante dans .env.local");
    throw new Error("Configuration e-mail manquante.");
  }

  const resend = new Resend(apiKey);

  try {
    // Par défaut, Resend permet d'envoyer depuis onboarding@resend.dev vers l'adresse
    // avec laquelle vous avez créé le compte Resend (pour tester gratuitement).
    // Une fois un nom de domaine configuré sur Resend (cf TODO domaine custom),
    // basculer sur "Primeurs Chez Vous <contact@[domaine].fr>".
    const fromAddress = process.env.RESEND_FROM || 'Primeurs Chez Vous <onboarding@resend.dev>';
    const data = await resend.emails.send({
      from: fromAddress,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      ...(attachments && attachments.length > 0
        ? { attachments: attachments.map((a) => ({ filename: a.filename, content: a.content })) }
        : {}),
    });

    return data;
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'e-mail avec Resend:", error);
    throw error;
  }
}

