# IDF Deal Finder

Application qui aide à repérer, parmi les annonces immobilières en
Île-de-France, les meilleures affaires (prix/m² nettement sous le marché
local, avec un potentiel de marge après travaux et revente), puis à
automatiser la prise de contact avec les agences pour organiser des visites.

## Comment ça marche

1. **Ingestion** (`npm run ingest`) — récupère des annonces via des
   adaptateurs (voir `src/scrapers/`) et les enregistre en base.
2. **Prix de référence DVF** (`npm run import:dvf`) — importe les
   transactions immobilières réelles publiées par la DGFiP/Etalab
   (open data, gratuit, pas de clé API) et calcule le prix médian €/m² par
   commune et type de bien.
3. **Scoring** (`src/lib/scoring.ts`) — compare chaque annonce à sa
   référence marché, estime le coût travaux selon l'état déclaré, et projette
   une marge après revente. Score 0-100.
4. **Dashboard** — classe et filtre les annonces par score.
5. **Agent de contact** — rédige et envoie (ou simule en mode démo) un email
   de demande de visite à l'agence, avec créneaux de disponibilité proposés.
   Un "pilote automatique" (Edge Function planifiable) peut contacter sans
   validation humaine toutes les nouvelles annonces au-dessus d'un seuil de
   score — voir "Automatisation complète" ci-dessous.

## État du projet — ce qui est réellement fonctionnel aujourd'hui

- ✅ **Moteur de scoring** : testé (29 tests, `npm test`), logique claire et
  ajustable (`DEFAULT_ASSUMPTIONS` dans `scoring.ts`).
- ✅ **Import DVF** : script complet contre l'API open data officielle. Pas
  testé en conditions réelles dans cette session (pas d'accès à un projet
  Supabase pour écrire les résultats) — à valider au premier run.
- ✅ **Dashboard, détail d'annonce, agent de contact (UI)** : testés dans un
  vrai navigateur (Playwright) en mode démonstration — captures d'écran
  validées, aucune erreur console. Fonctionne sans aucune configuration.
- ⚠️ **Jinka** : adaptateur écrit et testé unitairement (mapping des données,
  6 tests), mais **jamais exécuté contre un vrai compte Jinka** — je n'ai pas
  d'identifiants dans cette session. Intégration non officielle (voir
  `src/scrapers/adapters/jinkaAdapter.ts`) : Jinka n'a pas d'API publique
  documentée, ceci s'appuie sur leur API interne. Probable violation de leurs
  CGU, risque de suspension de compte, peut casser sans préavis. Le mapping
  prix/type de bien a été déduit d'exemples de LOCATION (une seule référence
  publique disponible) — à vérifier pour des alertes ACHAT au premier run
  réel. Jinka n'expose pas le contact agence dans le flux observé : les
  annonces Jinka ne seront donc pas prises en charge par l'agent de contact
  automatique tant que ce point n'est pas résolu.
- ⚠️ **Scraping d'autres sites d'annonces** : **non implémenté**. Seul un
  gabarit (`src/scrapers/adapters/siteAdapter.template.ts`) existe pour un
  site direct (SeLoger, PAP...). Voir `src/scrapers/README.md`.
- ⚠️ **Envoi réel d'email et pilote automatique** : le code est écrit
  (Supabase Edge Functions + Resend) mais **jamais exécuté contre un vrai
  compte Resend/Supabase** dans cette session — aucune clé API disponible ici.
  À tester avec de vraies clés avant de compter dessus.

En clair : le cœur (scoring + DVF + UI) est solide et vérifié. Le scraping
réel et l'envoi réel d'email sont la prochaine étape, à brancher avec tes
propres comptes/clés.

## Démarrage rapide (mode démonstration, sans rien configurer)

```sh
npm install
npm run dev
```

Ouvre `http://localhost:5173` — le dashboard tourne avec des annonces
générées localement (aucune donnée réelle, aucun appel réseau), pour se
faire une idée de l'interface et du scoring immédiatement.

## Passer en mode réel

### 1. Créer un projet Supabase

Crée un projet sur [supabase.com](https://supabase.com), puis applique le
schéma :

```sh
supabase link --project-ref <ton-project-ref>
supabase db push   # applique supabase/migrations/0001_init.sql
```

Crée un compte (Supabase Auth) pour toi-même, récupère ton `user_id`
(Dashboard → Authentication → Users), et renseigne `.env` :

```sh
cp .env.example .env
# VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (Dashboard → Settings → API)
# SUPABASE_SERVICE_ROLE_KEY (idem — à garder secrète, jamais côté client)
# APP_OWNER_USER_ID (ton user_id)
```

### 2. Importer les prix de référence DVF

```sh
npm run import:dvf -- --year 2024
```

Télécharge et agrège les transactions DVF pour les 8 départements
franciliens (~quelques minutes). Peut être relancé chaque année.

### 3. Ingérer des annonces

Avec seulement l'adaptateur de démo activé par défaut :

```sh
npm run ingest
```

Pour d'autres sources, implémente un adaptateur (voir `src/scrapers/README.md`
— CGU, robots.txt, API officielles à privilégier), ajoute-le dans
`buildAdapters()` (`scripts/ingest.ts`), relance `npm run ingest`.

#### Jinka (non officiel)

```sh
# .env
JINKA_EMAIL=ton-email@example.com
JINKA_PASSWORD=ton-mot-de-passe
```

Dès que ces deux variables sont définies, `npm run ingest` interroge Jinka en
plus de la démo (qui se désactive automatiquement dès qu'une vraie source est
configurée). **Avant de lancer ça** :

- Crée au moins une alerte de recherche sur jinka.fr (achat, IDF) — sans
  alerte configurée, l'adaptateur ne récupère rien.
- Utilise idéalement un compte Jinka dédié, pas ton compte principal : cette
  intégration n'est pas officielle et peut entraîner une suspension.
- Le premier run va probablement afficher des avertissements dans la console
  (`[jinka] Valeur de type de bien inconnue...`, `...utilisation de "rent"
  comme prix...`) — c'est attendu, le mapping exact des champs Jinka pour des
  alertes achat n'a pas pu être vérifié sans compte réel. Regarde les valeurs
  réelles retournées et ajuste `PROPERTY_TYPE_MAP` / `resolvePriceEur` dans
  `src/scrapers/adapters/jinkaAdapter.ts` en conséquence.
- Les annonces importées via Jinka n'auront pas de contact agence (email/
  téléphone) — Jinka ne l'expose pas dans le flux observé — donc l'agent de
  contact automatique les ignorera. Il faudra soit suivre `sourceUrl` vers le
  site d'origine pour extraire le contact, soit préparer les messages
  manuellement pour ces annonces-là.

### 4. Activer l'agent de contact

```sh
supabase functions deploy send-outreach-email
supabase functions deploy auto-outreach
supabase secrets set RESEND_API_KEY=re_xxx \
  OUTREACH_FROM_EMAIL="Ton Nom <toi@tondomaine.fr>" \
  OUTREACH_SENDER_NAME="Ton Nom" \
  OUTREACH_SENDER_PHONE="06 xx xx xx xx" \
  AUTO_OUTREACH_MIN_SCORE=70
```

Depuis la page **Prises de contact**, ajoute tes disponibilités puis compose
et envoie un message depuis une annonce.

### Automatisation complète (pilote automatique)

`auto-outreach` contacte **sans validation humaine par message** toutes les
annonces `new` dont le score dépasse `AUTO_OUTREACH_MIN_SCORE`. Pour
l'exécuter automatiquement (pas seulement via le bouton "Lancer
maintenant"), planifie-la avec `pg_cron` + `pg_net` (Supabase Dashboard →
Database → Cron Jobs), par exemple toutes les heures :

```sql
select cron.schedule(
  'auto-outreach-hourly',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://<ton-projet>.supabase.co/functions/v1/auto-outreach',
    headers := jsonb_build_object('Authorization', 'Bearer <service-role-key>')
  );
  $$
);
```

**Désactiver le pilote automatique** : `select cron.unschedule('auto-outreach-hourly');`
ou ne définis simplement pas `RESEND_API_KEY` (la fonction refuse d'envoyer
sans clé). Chaque email envoyé se présente explicitement comme rédigé par un
assistant automatisé pour ton compte (voir `emailTemplate.ts`), avec ton
adresse en reply-to.

Les appels téléphoniques automatisés ne sont **pas** couverts par ce projet —
volontairement laissés de côté (réglementation du démarchage téléphonique,
consentement). À rediscuter séparément si besoin.

## Commandes

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm test` | Tests unitaires (vitest) |
| `npm run lint` | ESLint |
| `npm run build` | Build de production |
| `npm run import:dvf -- --year 2024` | Importe/rafraîchit les prix de référence DVF |
| `npm run ingest` | Récupère les annonces (adaptateurs configurés) et calcule leurs scores |

## Structure

```
src/
  types/listing.ts        Modèles de données (Listing, ReferencePrice, DealScoreBreakdown)
  lib/scoring.ts           Moteur de scoring décote/marge
  lib/dvf/aggregate.ts      Agrégation des transactions DVF en prix médian
  lib/outreach/            Templates d'email, store (Supabase ou localStorage démo)
  lib/rankedListings.ts     Chargement + classement (mode live ou démo)
  scrapers/                 Adaptateurs d'ingestion (interface, démo, gabarit, robots.txt)
  pages/                     Dashboard, détail d'annonce, prises de contact
scripts/
  import-dvf.ts              Import DVF (data.gouv.fr) → table reference_prices
  ingest.ts                   Adaptateurs → normalisation → scoring → base
supabase/
  migrations/0001_init.sql    Schéma complet (RLS incluse)
  functions/send-outreach-email/  Envoi d'un email via Resend
  functions/auto-outreach/         Pilote automatique (voir ci-dessus)
```

## Limites connues et hypothèses à valider

- Le coût des travaux est une **estimation par état déclaré** (barème dans
  `DEFAULT_ASSUMPTIONS`), pas un devis. À confronter à la réalité en visite.
- La valeur de revente estimée suppose que le bien rénové se vend au prix
  médian marché de sa commune — hypothèse prudente, pas une garantie.
- Le rapprochement annonce ↔ prix de référence se fait par code INSEE si
  connu, sinon par nom de commune (moins fiable en cas d'homonymie).
- Aucun scraper réel n'est fourni — seule une démo et un gabarit. Voir
  `src/scrapers/README.md` avant d'en construire un.
