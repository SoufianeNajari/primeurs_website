# Primeur — Project context for Gemini CLI

## Project overview

E-commerce website for a fruit & vegetable shop (primeur). Customers browse products,
place orders, and receive a confirmation email. The shop owner manages product
availability from their phone with a single toggle per product — no technical knowledge
required.

## Stack

| Layer | Tool | Why |
|---|---|---|
| Framework | Next.js 14 (App Router) | Web + mobile PWA + admin — one codebase |
| Database | Supabase (PostgreSQL) | Hosted DB + auto REST API + realtime |
| Email | Resend | Simple API, reliable delivery |
| PWA | next-pwa | Makes the site installable on mobile |
| Hosting | Vercel | Native Next.js hosting, auto-deploy from GitHub |

## Folder structure

```
/
├── app/
│   ├── page.tsx                  # Homepage — product catalogue
│   ├── order/page.tsx            # Order form
│   ├── order/confirmation/page.tsx
│   ├── admin/page.tsx            # Product toggle panel (password protected)
│   └── api/
│       ├── products/route.ts     # GET all products
│       ├── order/route.ts        # POST new order → sends email
│       └── toggle/route.ts       # PATCH product availability
├── components/
│   ├── ProductCard.tsx
│   ├── ProductGrid.tsx
│   ├── OrderForm.tsx
│   └── AdminToggleList.tsx
├── lib/
│   ├── supabase.ts               # Supabase client (singleton)
│   └── resend.ts                 # Resend client
├── public/
│   └── manifest.json             # PWA manifest
├── next.config.js                # includes next-pwa config
└── .env.local                    # secrets (never commit)
```

## Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=       # server-side only, never expose to client
RESEND_API_KEY=
ADMIN_PASSWORD=                  # plain string, checked server-side
SHOP_EMAIL=                      # receives order notifications
```

## Database schema

```sql
-- Products table
create table produits (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  categorie text not null,           -- 'Fruits' | 'Légumes' | etc.
  description text,
  prix_kg numeric(6,2),              -- price per kg, optional
  disponible boolean default true,
  ordre integer default 0,           -- display order
  created_at timestamptz default now()
);

-- Orders table
create table commandes (
  id uuid primary key default gen_random_uuid(),
  client_nom text not null,
  client_email text not null,
  client_telephone text,
  lignes jsonb not null,             -- [{produit_id, nom, quantite, unite}]
  message text,
  statut text default 'reçue',       -- 'reçue' | 'traitée' | 'annulée'
  created_at timestamptz default now()
);

-- Enable RLS
alter table produits enable row level security;
alter table commandes enable row level security;

-- Public can read available products
create policy "Public read products"
  on produits for select using (true);

-- Only service role can update products and insert orders
-- (enforced via SUPABASE_SERVICE_ROLE_KEY on API routes)
```

## API routes

### GET /api/products
Returns all products ordered by `ordre`. Filters `disponible = true` for public
catalogue. Accepts `?all=true` (with admin auth) to return all products including
unavailable ones.

### POST /api/order
Body: `{ client_nom, client_email, client_telephone?, lignes[], message? }`
- Inserts a row in `commandes`
- Sends confirmation email to client via Resend
- Sends notification email to shop owner via Resend
- Returns `{ success: true, commande_id }`

### PATCH /api/toggle
Body: `{ id: string, disponible: boolean }`
Header: `x-admin-password: <ADMIN_PASSWORD>`
- Checks password server-side
- Updates `produits.disponible` via service role key
- Returns updated product row

## Admin panel rules

- Route: `/admin`
- Protection: simple password prompt stored in `sessionStorage` (not a full auth system)
- Password checked on every API call server-side via `x-admin-password` header
- UI: list of all products grouped by category, each with a toggle switch
- Toggle fires immediately on change — no save button
- Visual feedback: badge switches green/red instantly, toast confirms the update
- Designed for one-handed mobile use — large touch targets (min 44px)

## PWA setup

In `next.config.js`:
```js
const withPWA = require('next-pwa')({ dest: 'public', disable: process.env.NODE_ENV === 'development' })
module.exports = withPWA({ /* next config */ })
```

`public/manifest.json` must include `name`, `short_name`, `start_url: "/"`,
`display: "standalone"`, `theme_color`, and at least one 192×192 icon.

## Coding conventions

- TypeScript everywhere — no plain `.js` files except `next.config.js`
- Use the App Router (`app/` directory) — no Pages Router
- Server Components by default; add `"use client"` only when needed (forms, toggles)
- Supabase calls in API routes use `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS)
- Supabase calls in client components use the anon key (respects RLS)
- All user-facing text in French
- Tailwind CSS for styling
- No UI component library — keep dependencies minimal

## Key behaviours

**Product catalogue:**
- Only shows products where `disponible = true`
- Grouped by `categorie`
- Each card shows name, category, optional price, and an "Ajouter à la commande" button

**Order flow:**
1. Customer fills cart on catalogue page (client state, no persistence needed)
2. Clicks "Passer la commande" → goes to `/order` with cart in URL params or context
3. Fills name, email, phone (optional), message (optional)
4. Submits → POST /api/order → confirmation page
5. Both client and shop owner receive an email

**Email format (Resend):**
- Client email: order summary with product list, thank-you message, shop contact
- Owner email: same order details + client contact info

## What NOT to build (out of scope)

- No online payment (no Stripe) — orders are confirmed by the shop manually
- No customer accounts or login
- No stock quantity tracking — just available/unavailable
- No App Store / Play Store submission — PWA only
- No back-office beyond the toggle panel

## Suggested build order

1. Supabase project + schema + seed a few products
2. `/api/products` route + product catalogue page
3. Admin panel + `/api/toggle` route — validate the core toggle feature first
4. Order form + `/api/order` route
5. Resend email templates
6. PWA manifest + next-pwa setup
7. Deploy to Vercel
