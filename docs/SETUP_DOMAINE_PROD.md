# Setup domaine prod — de Vercel à Resend (OVH)

> Guide **complet et ordonné** pour brancher ton nom de domaine en production.
> Registrar/DNS : **OVH**. Domaine **racine** en principal (`primeurschezvous.fr`),
> `www` qui redirige dessus.
>
> Domaine : **primeurschezvous.fr**.
>
> Ordre à respecter : **1) Vercel domaine → 2) DNS OVH (site) → 3) Variables
> d'env → 4) Resend (email) → 5) DNS OVH (email) → 6) Tests.**
> Les étapes DNS site (2) et DNS email (5) se font dans la **même zone DNS OVH** :
> tu peux d'ailleurs tout saisir d'un coup à l'étape 5 si tu préfères.

---

## 0. Pré-requis / accès

- [ ] Compte **Vercel** avec le projet déjà déployé (URL `*.vercel.app` fonctionne).
- [ ] Espace client **OVH** (accès à la zone DNS du domaine).
- [ ] Compte **Resend** (titulaire : najarisoufiane@gmail.com).
- [ ] Cet ordi pour générer les secrets (`openssl`).

---

## 1. Ajouter le domaine sur Vercel

1. Vercel → ton projet → **Settings** → **Domains**.
2. Saisis `primeurschezvous.fr` → **Add**.
3. Ajoute aussi `www.primeurschezvous.fr` → **Add**. Vercel proposera de **rediriger
   `www` → racine** : accepte (Redirect to `primeurschezvous.fr`).
4. Vercel affiche les valeurs DNS à créer. Pour un domaine racine sur OVH, on
   garde **OVH comme hébergeur DNS** (on ne change PAS les serveurs DNS, sinon il
   faudrait re-créer les enregistrements Resend chez Vercel). On ajoute juste :

   | Type    | Pour                | Valeur cible            |
   |---------|---------------------|-------------------------|
   | `A`     | racine `primeurschezvous.fr` | `76.76.21.21`        |
   | `CNAME` | `www`               | `cname.vercel-dns.com.` |

   > ⚠️ Vérifie la valeur **affichée par Vercel** : l'IP `A` apex peut évoluer.
   > Si Vercel montre une autre IP / un autre CNAME, c'est **celle-là** qui fait foi.

---

## 2. Créer les enregistrements DNS du site sur OVH

1. OVH → **Web Cloud** → **Noms de domaine** → `primeurschezvous.fr` → onglet **Zone DNS**.
2. **Supprime d'abord les A/AAAA existants sur la racine** (OVH met par défaut un
   A vers une page de parking + souvent un AAAA). Sinon le site ne pointera pas
   sur Vercel. Cible : la racine ne doit avoir **qu'un seul A → `76.76.21.21`**.
   - Ne touche **pas** aux enregistrements `MX` / `TXT` existants à cette étape.
3. **Ajoute** le A racine :
   - **Type** : `A`
   - **Sous-domaine** : *(laisser vide)* → c'est la racine
   - **Cible** : `76.76.21.21`
4. **Ajoute / vérifie** le CNAME `www` :
   - **Type** : `CNAME`
   - **Sous-domaine** : `www`
   - **Cible** : `cname.vercel-dns.com.` (avec le point final)
   - Si un A/CNAME `www` existe déjà (parking OVH), remplace-le.
5. Enregistre la zone (OVH demande parfois de **confirmer l'application** de la zone).

**Propagation : quelques minutes à ~1 h.** De retour sur Vercel → Settings →
Domains, les deux domaines passent en **Valid Configuration** (coche verte).
Vercel émet le **certificat HTTPS automatiquement** ensuite.

---

## 3. Configurer les variables d'environnement Vercel

Vercel → projet → **Settings** → **Environment Variables**. Coche
**Production** (et **Preview** si tu testes via les previews) pour chacune.

### 3a. Générer les secrets (sur cet ordi)

```bash
openssl rand -base64 32   # → ADMIN_SESSION_SECRET
openssl rand -hex 32      # → ORDER_CANCEL_SECRET
openssl rand -hex 32      # → CRON_SECRET
```

### 3b. Liste complète des variables

| Variable | Valeur prod | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | (Supabase → Project Settings → API) | déjà connu |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clé `anon` publique | déjà connu |
| `SUPABASE_SERVICE_ROLE_KEY` | clé `service_role` (secrète) | serveur uniquement |
| `RESEND_API_KEY` | clé Resend existante | "send-only" suffit |
| `RESEND_FROM` | `Primeur Chez Vous <contact@primeurschezvous.fr>` | **⚠️ après domaine Resend vérifié (étape 4-5)** |
| `SHOP_EMAIL` | email qui reçoit les commandes | ex. najarisoufiane@gmail.com |
| `ADMIN_PASSWORD` | mot de passe admin `/admin` | choisis un mdp fort |
| `ADMIN_SESSION_SECRET` | `openssl rand -base64 32` | signe le cookie admin |
| `NEXT_PUBLIC_SITE_URL` | `https://primeurschezvous.fr` | **sans slash final** |
| `ORDER_CANCEL_SECRET` | `openssl rand -hex 32` | signe les liens d'annulation |
| `CRON_SECRET` | `openssl rand -hex 32` | protège `/api/cron/*` |
| `GOOGLE_PLACES_API_KEY` | *(optionnel)* | avis Google |
| `GOOGLE_PLACE_ID` | *(optionnel)* | avis Google |

> **Pas besoin** de `SUPABASE_DB_URL` / `DATABASE_URL` sur Vercel : elles ne
> servent qu'aux migrations locales (`npm run db:migrate`).

> `NEXT_PUBLIC_SITE_URL` : ne mets **jamais** `pontaultprimeurs.fr` — le code
> l'ignore (garde dans `lib/site.ts`) mais c'est trompeur. Mets bien le nouveau
> domaine. Comme c'est une variable `NEXT_PUBLIC_*`, elle est **gelée au build**
> → un **redeploy** est obligatoire pour qu'elle prenne effet.

### 3c. Redeploy

Après avoir saisi/modifié les variables : Vercel → **Deployments** → dernier
déploiement → **⋯** → **Redeploy** (décoche "use existing build cache" si tu as
changé une `NEXT_PUBLIC_*`).

---

## 4. Ajouter le domaine email sur Resend

1. https://resend.com → **Domains** → **Add Domain**.
2. Saisis un **sous-domaine d'envoi** : `send.primeurschezvous.fr`.
   *(Recommandé : isole la réputation email et évite tout conflit avec un SPF
   OVH déjà présent sur la racine.)*
3. Resend affiche **3-4 enregistrements DNS uniques** (les clés DKIM sont
   propres à ton domaine — copie-les depuis l'écran, ne les invente pas) :

   | Type  | Nom (host)                | Valeur (exemple)                        | Rôle    |
   |-------|---------------------------|-----------------------------------------|---------|
   | `MX`  | `send`                    | `feedback-smtp.<region>.amazonses.com`  | bounces |
   | `TXT` | `send`                    | `v=spf1 include:amazonses.com ~all`     | SPF     |
   | `TXT` | `resend._domainkey`       | `p=MIGfMA0GCSq...` (longue clé)         | DKIM    |
   | `TXT` | `_dmarc` *(optionnel)*    | `v=DMARC1; p=none;`                      | DMARC   |

---

## 5. Créer les enregistrements DNS email sur OVH

Même zone DNS OVH qu'à l'étape 2. Pour **chaque** ligne affichée par Resend :

- **Sous-domaine** : mets la partie **avant** ton domaine. OVH ajoute
  `primeurschezvous.fr` automatiquement. Donc :
  - host Resend `send` → sous-domaine `send`
  - host Resend `resend._domainkey` → sous-domaine `resend._domainkey`
    (ou `resend._domainkey.send` selon ce qu'affiche Resend — **recopie exactement**)
  - host Resend `_dmarc` → sous-domaine `_dmarc`
- **MX** : renseigne la **priorité** demandée par Resend (souvent `10`).
- **TXT** : **pas de guillemets** autour de la valeur (sauf si OVH l'exige) ;
  colle la valeur entière (les clés DKIM sont longues, attention au copier-coller).
- **TTL** : défaut (ou 3600).

Enregistre / applique la zone.

### Vérifier sur Resend

- Resend → **Domains** → **Verify**.
- Propagation : quelques minutes à ~1 h. Statut → **Verified** (pastille verte).
- Une fois **Verified**, reviens **finaliser `RESEND_FROM`** sur Vercel
  (`Primeur Chez Vous <contact@send.primeurschezvous.fr>` ou `<contact@primeurschezvous.fr>`
  selon le domaine que tu as vérifié) → **redeploy**.

> `contact@…` n'a pas besoin d'exister comme vraie boîte mail pour **envoyer**.
> Si tu veux **recevoir** sur cette adresse, configure une redirection email à part.

---

## 6. Tester de bout en bout

1. **Site** : ouvre `https://primeurschezvous.fr` (cadenas HTTPS) et `https://www.primeurschezvous.fr`
   (doit rediriger vers la racine).
2. **Commande test** : passe une commande avec une **adresse email différente**
   de celle du compte Resend (une autre boîte à toi).
3. Vérifie :
   - mail **boutique** reçu sur `SHOP_EMAIL` ;
   - mail **confirmation client** reçu (regarde les **spams** au 1er envoi) ;
   - dans Resend → **Emails** : statut **delivered** ;
   - en base `commandes` : `email_client_sent_at` rempli + `email_last_error` null.
4. **SEO** : `https://primeurschezvous.fr/sitemap.xml` et les balises OpenGraph doivent
   afficher le **nouveau** domaine (effet de `NEXT_PUBLIC_SITE_URL` après redeploy).
5. **Cron** : rien à faire, `vercel.json` les déclenche ; `CRON_SECRET` doit
   juste être présent côté env.

---

## Checklist finale

- [ ] `primeurschezvous.fr` + `www` → **Valid Configuration** sur Vercel (HTTPS OK)
- [ ] Toutes les variables d'env Production saisies + **redeploy** fait
- [ ] `NEXT_PUBLIC_SITE_URL = https://primeurschezvous.fr`
- [ ] Domaine email **Verified** sur Resend
- [ ] `RESEND_FROM` pointe sur le domaine vérifié + redeploy
- [ ] Commande test : mail boutique **ET** mail client reçus
- [ ] Sitemap / OG affichent le nouveau domaine

---

## Dépannage rapide

| Symptôme | Cause probable | Fix |
|---|---|---|
| Vercel reste "Invalid Configuration" | ancien A OVH sur la racine pas supprimé | garder **un seul** A racine → `76.76.21.21` |
| `www` ne redirige pas | CNAME `www` manquant/mauvais | CNAME `www` → `cname.vercel-dns.com.` |
| Resend reste "Not verified" | TXT DKIM tronqué / mauvais host | recopier la valeur entière, vérifier le sous-domaine |
| Mail client jamais reçu | `RESEND_FROM` vide → fallback `onboarding@resend.dev` | définir `RESEND_FROM` sur domaine vérifié + redeploy |
| Sitemap affiche l'ancien domaine | `NEXT_PUBLIC_SITE_URL` changée sans rebuild | redeploy sans cache |

Voir aussi : `docs/RESEND_DOMAIN_SETUP.md` (focus email seul).
