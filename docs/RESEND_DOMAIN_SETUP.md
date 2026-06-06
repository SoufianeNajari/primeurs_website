# Configurer Resend pour livrer les emails clients

> **Pourquoi ce guide ?** Aujourd'hui le site envoie les emails depuis
> `onboarding@resend.dev` (adresse de test partagée Resend). Resend **n'achemine
> réellement** ces emails que vers l'adresse du **titulaire du compte**
> (najarisoufiane@gmail.com). Résultat : le mail boutique arrive, mais les
> **confirmations clients ne sont jamais délivrées**.
>
> Le seul correctif est de **vérifier un domaine** sur Resend et de définir la
> variable `RESEND_FROM`. Aucune modification de code n'est nécessaire — le code
> bascule automatiquement sur `RESEND_FROM` dès qu'elle est renseignée
> (`lib/mailer.ts`).

Dans la suite, remplace `tondomaine.fr` par ton vrai nom de domaine.

---

## 1. Ajouter le domaine sur Resend

1. Connecte-toi sur https://resend.com → **Domains** → **Add Domain**.
2. Saisis `tondomaine.fr` (ou un sous-domaine d'envoi recommandé, ex.
   `send.tondomaine.fr` ou `mail.tondomaine.fr` — ça isole la réputation email
   du reste du domaine).
3. Resend affiche **3 à 4 enregistrements DNS** à créer. Ils sont **générés pour
   ton domaine** (les clés DKIM sont uniques), donc copie-les depuis l'écran
   Resend — ne les invente pas. Tu auras typiquement :

   | Type  | Nom (host)                    | Valeur                                  | Rôle              |
   |-------|-------------------------------|-----------------------------------------|-------------------|
   | `MX`  | `send` (ou `@`)               | `feedback-smtp.<region>.amazonses.com`  | retours/bounces   |
   | `TXT` | `send` (ou `@`)               | `v=spf1 include:amazonses.com ~all`     | SPF               |
   | `TXT` | `resend._domainkey`           | `p=MIGfMA0GCSq...` (longue clé)         | DKIM (signature)  |
   | `TXT` | `_dmarc` *(optionnel)*        | `v=DMARC1; p=none;`                      | DMARC (recommandé)|

## 2. Créer les enregistrements DNS chez ton registrar

Va dans la zone DNS de là où tu as acheté le domaine (OVH, Gandi, Cloudflare,
IONOS…) et crée chaque enregistrement **à l'identique** de l'écran Resend.

- Pour le **host/nom** : selon le registrar, mets juste `send` /
  `resend._domainkey` (il ajoute le domaine), ou la forme complète
  `send.tondomaine.fr`. En cas de doute, regarde comment sont écrits tes
  enregistrements existants.
- **Ne mets pas de guillemets** autour des valeurs TXT (sauf si l'interface le
  demande explicitement).
- TTL : laisse la valeur par défaut (ou 3600).

## 3. Vérifier

- Retourne sur Resend → **Domains** → clique **Verify**.
- La propagation DNS prend de **quelques minutes à ~1 h** (parfois plus selon le
  registrar). Le statut passe à **Verified** (pastille verte) quand c'est bon.

## 4. Définir `RESEND_FROM`

Une fois le domaine **Verified**, configure l'expéditeur **partout où le site
tourne** :

### Vercel (production / preview)
1. Vercel → ton projet → **Settings** → **Environment Variables**.
2. Ajoute :
   - **Name** : `RESEND_FROM`
   - **Value** : `Primeur Chez Vous <contact@tondomaine.fr>`
     *(le `contact@` doit être sur le domaine vérifié ; il n'a pas besoin
     d'exister comme boîte mail réelle pour l'envoi)*
   - **Environments** : Production (+ Preview si tu testes via preview).
3. **Redeploy** le projet (les variables d'env ne sont prises en compte qu'au
   prochain build).

### En local (`.env.local`)
```
RESEND_FROM="Primeur Chez Vous <contact@tondomaine.fr>"
```

> La clé `RESEND_API_KEY` actuelle est "send-only" : c'est **suffisant** pour
> l'envoi runtime. Tu n'as besoin d'une clé "Full access" que si tu veux gérer
> les domaines **via l'API** — la vérification se fait dans le dashboard, donc
> pas nécessaire ici.

## 5. Tester

1. Passe une commande test avec une **adresse email différente** de celle du
   compte Resend (ex. une autre boîte à toi).
2. Vérifie la réception du mail **client** (pense à regarder les spams au
   premier envoi, le temps que la réputation s'installe).
3. Côté technique, tu peux confirmer l'envoi dans Resend → **Emails** (logs avec
   statut delivered), ou dans la table `commandes` : `email_client_sent_at`
   renseigné + `email_last_error` null.

---

## Pendant que le domaine n'est pas prêt

- Le **mail boutique** arrive bien au titulaire du compte Resend → vérifie
  spams / onglet **Promotions** de Gmail.
- Les **confirmations clients** ne partiront pas de façon fiable : préviens tes
  premiers clients de vive voix / via WhatsApp (07 64 38 39 35) en attendant.
- Tu peux suivre l'historique des envois dans Resend → **Emails**.
