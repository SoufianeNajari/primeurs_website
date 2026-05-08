-- Migration 023 — 3 articles SEO local pour le lancement (Sprint S2.2)
--
-- Articles publiés à `now()`. Cibles SEO :
--  1. Pages/zones livrées : "primeur livraison Pontault-Combault" + 7 villes alentours
--  2. Recherche saisonnière : "fruits légumes de saison [mois]"
--  3. Niche différenciante : "fromages affinés livraison Île-de-France"
--
-- Le primeur peut éditer ces articles via /admin/articles, ajouter des
-- images, lier des produits ou les remettre en brouillon (published_at=null).
-- Slugs choisis pour matcher des requêtes Google "longue traîne".

insert into public.articles (slug, titre, extrait, contenu_md, published_at)
values
(
  'livraison-fruits-legumes-pontault-combault-rungis',
  'Livraison de fruits, légumes et fromages à Pontault-Combault — directement de Rungis',
  'Notre primeur livre 8 communes autour de Pontault-Combault, deux fois par semaine, avec une sélection rapportée chaque matin du marché de Rungis.',
  $md$
Trouver un primeur qui livre **chez vous** dans le secteur de Pontault-Combault, sans abonnement, sans application compliquée, avec des produits sélectionnés à la main le matin même : c''est exactement la promesse de **Primeur Chez Vous**.

## Ce que nous livrons

Chaque mardi et chaque samedi, nous chargeons notre véhicule avec :

- **Fruits de saison** — sélectionnés au marché de Rungis avant 5 h du matin, à maturité, prêts à manger.
- **Légumes du moment** — racines, feuilles, herbes fraîches, courges et légumes-fruits selon ce que les producteurs ont sorti la veille.
- **Fromages affinés** — pâtes pressées, pâtes molles, chèvres frais et affinés, AOP de tous les terroirs français.

Le tout vient de notre boutique de Pontault-Combault, fondée en 1992, qui s''approvisionne directement auprès des grossistes de Rungis — sans intermédiaire qui rallonge les délais.

## Les 8 communes desservies

Nous livrons gratuitement (dès 30 € de panier) dans les villes suivantes :

| Commune | Code postal | Département |
|---|---|---|
| Pontault-Combault | 77340 | Seine-et-Marne |
| Roissy-en-Brie | 77680 | Seine-et-Marne |
| Ozoir-la-Ferrière | 77330 | Seine-et-Marne |
| Lésigny | 77150 | Seine-et-Marne |
| Émerainville | 77184 | Seine-et-Marne |
| Le Plessis-Trévise | 94420 | Val-de-Marne |
| Villiers-sur-Marne | 94350 | Val-de-Marne |
| Noisy-le-Grand | 93160 | Seine-Saint-Denis |

Si votre commune n''apparaît pas, contactez-nous : nous étudions les extensions de zone selon les demandes groupées.

## Comment ça se passe

1. **Vous commandez en ligne** sur [primeurchezvous](/) jusqu''à la veille du créneau.
2. **Karim, notre livreur**, prépare votre commande depuis Rungis le matin même.
3. **Livraison à domicile** sur votre créneau — Mardi 17 h-19 h ou Samedi 15 h-19 h.
4. **Paiement à la réception** — CB sans contact ou espèces. Aucun débit en ligne.

Si un produit ne vous convient pas à la livraison, vous le signalez au livreur sur place : échange ou remboursement immédiat. Pas de SAV en ligne, pas de retour à organiser.

## Pourquoi pas un drive de supermarché ?

Trois différences qui changent tout :

- **La sélection est faite par un primeur, pas par un préparateur de commandes.** Les fruits sont touchés, sentis, calibrés un par un.
- **Les produits viennent de Rungis le matin même**, pas d''un entrepôt frigorifique de la veille.
- **Vous payez à la réception**, ce qui force notre tournée à arriver avec ce qui a été commandé — sans excuses, sans substitution silencieuse.

## Pour qui c''est utile

- Familles qui veulent du frais sans courir le marché le samedi matin.
- Personnes âgées ou à mobilité réduite qui ne peuvent plus porter les sacs.
- Professionnels (cantines, brasseries, gîtes) qui veulent une fiabilité hebdomadaire.
- Tout le monde qui en a marre des fraises insipides et des fromages sous plastique.

Pour démarrer : on vous offre **−10 % avec le code BIENVENUE10** sur votre première commande, plafonné à 5 €. Pas de minimum d''engagement, pas de carte de fidélité à activer.

Et si vous nous appréciez, parrainez vos voisins : **−5 € pour eux + −5 € pour vous** à chaque filleul. Le code parrain est dans votre email de confirmation.
$md$,
  now()
),
(
  'fruits-legumes-de-saison-mai-selection-primeur',
  'Fruits et légumes de saison en mai : la sélection du primeur',
  'Asperges qui s''achèvent, premières fraises de pleine terre, fèves, radis et premières cerises : ce que met votre primeur dans le panier en mai.',
  $md$
Mai, c''est le mois où le panier commence à se colorer. Les légumes de printemps tirent leur révérence pendant que les premiers fruits d''été apparaissent. Voici ce que vous trouverez dans nos paniers ces prochaines semaines, et comment en profiter au mieux.

## Côté fruits

### Les fraises de pleine terre arrivent

Oubliez les fraises de janvier sous serre chauffée. À partir de **mi-mai en Île-de-France**, les premières fraises de pleine terre apparaissent sur les étals de Rungis. **Mara des Bois, Gariguette, Charlotte** : les variétés se relaient jusqu''en juillet. La règle : plus la fraise est rouge profond et parfumée crue, mieux c''est.

> **Conseil de conservation** : ne jamais laver à l''avance. On rince juste avant de manger, sinon les fraises gorgent d''eau et perdent leur goût en quelques heures.

### Les premières cerises

Fin mai, les **cerises du Vaucluse** ouvrent la saison française. Belge ou Burlat à la chair tendre, puis Reverchon et Summit en juin. Une cerise mûre est noire-bordeaux, brillante, avec sa queue verte (signe de fraîcheur).

### Rhubarbe et abricots

La rhubarbe est en pleine forme — parfaite en compote ou en tarte avec un peu de fraises. Les **premiers abricots du Roussillon** arrivent fin mai, mais c''est en juin qu''ils sont vraiment au top.

## Côté légumes

### Les asperges, dernier sursaut

La saison se termine à la fin du mois. **Vertes d''Île-de-France** ou **blanches du Sud-Ouest**, c''est le moment de se faire plaisir avant un an d''attente. Vapeur 8 minutes, beurre fondu, sel. Inutile d''en faire plus.

### Fèves fraîches et petits pois

Les **fèves** sont à leur apogée en mai. À l''ancienne : on écosse, on blanchit 2 minutes, on retire la deuxième peau. Plus de travail qu''un haricot vert mais le goût n''a rien à voir.

Les **petits pois frais** suivent. Une fois sortis de leur cosse, ils se cuisinent en 5 minutes — rien à voir avec ceux en boîte.

### Radis de printemps

**Radis roses, radis breakfast, navets nouveaux** : c''est la grande période des bottes croquantes. À grignoter avec du beurre demi-sel et un peu de fleur de sel, ou émincés crus dans une salade.

### Premières courgettes et premières tomates

Les courgettes arrivent dès mi-mai (variétés italiennes notamment). Les **premières tomates de pleine terre** attendront juin-juillet — méfiez-vous de celles qu''on vous propose en mai, elles viennent souvent de serres chauffées hors saison.

## Idées de paniers de la semaine

**Panier "premier dimanche de mai"** (pour 2 personnes, ~25 €) :
- 500 g de fraises Gariguette
- 1 botte de radis roses
- 500 g d''asperges vertes
- 250 g de fèves fraîches
- 2 oignons nouveaux
- 1 botte de menthe

**Panier "premier vrai apéro de l''année"** (~20 €) :
- 1 plateau de radis breakfast + beurre demi-sel + fleur de sel
- 500 g de fraises de pleine terre
- 200 g de fromage de chèvre frais
- 1 baguette levain (à prendre chez votre boulanger)

## Pour passer commande

On livre tous les **mardis** et **samedis** dans 8 communes autour de Pontault-Combault. La sélection bouge chaque semaine en fonction de ce qui arrive à Rungis : abonnez-vous à notre liste pour ne rater aucun arrivage exceptionnel (asperges sauvages, premières mirabelles…).

Première commande : **−10 % avec BIENVENUE10**. Pas d''engagement.
$md$,
  now()
),
(
  'fromages-affines-selection-primeur-livraison-idf',
  'Notre sélection de fromages affinés — conseils, accords et livraison',
  'Comté 24 mois, Saint-Nectaire fermier, chèvres de Touraine : comment notre primeur sélectionne ses fromages affinés et les livre à domicile en Île-de-France.',
  $md$
On ne va pas se mentir : la grande distribution a tué le fromage. Sous plastique, à 4 °C, coupé d''une manière standardisée — beaucoup de fromages ne se "réveillent" jamais en bouche. Chez nous, on a fait le choix inverse : **moins de références, mieux choisies, livrées au point d''affinage juste**.

Voici ce que vous trouverez dans nos paniers fromagers, et pourquoi ça change quelque chose.

## La règle d''or : un fromager sélectionne, il ne stocke pas

Notre primeur travaille avec des affineurs de Rungis qui suivent leurs fromages comme un caviste suit ses bouteilles. Concrètement :

- **Comté AOP** — on tourne entre 12 mois (doux, lacté), 18 mois (équilibré, salé), 24 mois (cristaux, longueur). Chaque meule a son histoire : on demande à goûter avant de couper.
- **Saint-Nectaire fermier** — uniquement le fermier (à différencier du laitier, plus industriel), affiné en cave naturelle 8 semaines minimum. Croûte rosée, cœur fondant.
- **Brie de Meaux AOP** — au lait cru, affiné 8 semaines. Différent du brie de supermarché à la pâte sans goût.
- **Chèvres de Touraine** — Sainte-Maure cendré, Selles-sur-Cher, Valençay. Frais ou affinés selon votre goût.

## Comment savoir qu''un fromage est "à point"

Trois indices qu''on regarde toujours à Rungis avant d''embarquer :

1. **L''aspect de la croûte.** Une croûte sèche, fissurée ou décollée de la pâte = trop affiné, sec dedans. Une croûte qui adhère, légèrement humide selon le type = bon signe.
2. **Le toucher au centre.** Un brie ou un camembert "à point" cède sous le doigt sans s''effondrer. Trop ferme = pas mûr. Trop liquide = passé.
3. **L''odeur.** Un Saint-Nectaire fermier doit sentir la cave humide, pas l''ammoniaque. Un comté doit sentir le lait grillé, pas le frigo.

Si vous voulez prolonger l''affinage à la maison, on indique sur l''étiquette si le fromage doit encore "se reposer" 1 ou 2 jours dans le bas du frigo.

## Quelques accords qu''on aime bien

### Pour un plateau d''apéritif (4 personnes)

- 200 g de **Comté 18 mois**
- 1 quart de **Brie de Meaux**
- 1 **Sainte-Maure de Touraine**
- 1 baguette tradition + une tranche de pain aux noix
- Confiture de cerises noires ou miel de châtaignier

### Pour cuisiner

- **Tartiflette d''été** : Saint-Nectaire fermier (au lieu du Reblochon classique), pommes de terre nouvelles, lardons fumés, oignons doux. Plus parfumé.
- **Soufflé au Comté** : 24 mois pour la longueur en bouche, blanc d''œuf monté très ferme, four bien chaud.
- **Salade chaude au chèvre** : Sainte-Maure légèrement affiné, sur tartine de pain aux céréales passée 3 minutes au four, salade roquette + miel + vinaigre de framboise.

## Comment on conserve un fromage à la maison

- **Boîte du fromager** ou film alimentaire spécial "respirant" — pas le film classique, qui empêche la croûte de respirer.
- **Bas du frigo** — la zone la moins froide (~6-8 °C). Le congélateur, c''est non.
- **Sortir 1 h avant dégustation** pour que la pâte revienne à température. Un fromage froid n''a pas de goût.

## Notre tournée fromagère

Chaque mardi et samedi, on livre nos plateaux assortis (à partir de 25 €) ou nos fromages à la coupe dans les **8 communes** du secteur Pontault-Combault. On peut même vous préparer un plateau sur mesure si vous nous appelez la veille.

Pour les amateurs : abonnez-vous à nos arrivages — on annonce sur la home les fromages exceptionnels qu''on sort uniquement quelques semaines par an (Tomme de Savoie estivale, Mont d''Or de la nouvelle saison, Vacherin Fribourgeois affiné en grotte…).

Première commande : **−10 % avec BIENVENUE10**, plafonné à 5 €.
$md$,
  now()
);
