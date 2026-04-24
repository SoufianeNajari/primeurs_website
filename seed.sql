-- Création de la table 'produits' (si elle n'existe pas déjà)
create table if not exists produits (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  categorie text not null,
  description text,
  prix_kg numeric(6,2),
  disponible boolean default true,
  ordre integer default 0,
  created_at timestamptz default now()
);

-- Insertion des données de test
insert into produits (nom, categorie, disponible) values
('Pommes', 'Fruits', true),
('Poires', 'Fruits', true),
('Fraises', 'Fruits', true),
('Bananes', 'Fruits', true),
('Oranges', 'Fruits', true),
('Carottes', 'Légumes', true),
('Courgettes', 'Légumes', true),
('Tomates', 'Légumes', true),
('Salade', 'Légumes', true),
('Pommes de terre', 'Légumes', true),
('Comté', 'Fromages', true),
('Brie', 'Fromages', true),
('Chèvre frais', 'Fromages', true);

-- Autoriser la lecture publique (nécessaire pour la page client plus tard)
alter table produits enable row level security;
create policy "Public read products" on produits for select using (true);
