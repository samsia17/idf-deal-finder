-- Schéma initial : annonces, prix de référence DVF, scores, agent de contact, RDV.

create extension if not exists "pgcrypto";

-- Prix médian €/m² par commune + type de bien, calculé à partir des données
-- ouvertes DVF (Demandes de Valeurs Foncières, DGFiP/Etalab). Table de
-- référence partagée, alimentée par le script scripts/import-dvf.ts avec la
-- clé de service (bypass RLS) — jamais écrite depuis le client.
create table reference_prices (
  id uuid primary key default gen_random_uuid(),
  insee_code text not null,
  commune text not null,
  postal_code text not null,
  property_type text not null check (property_type in ('appartement', 'maison')),
  median_price_m2 numeric not null check (median_price_m2 > 0),
  sample_size integer not null check (sample_size >= 0),
  period_start date not null,
  period_end date not null,
  source text not null default 'dvf',
  updated_at timestamptz not null default now(),
  unique (insee_code, property_type, period_start, period_end)
);

alter table reference_prices enable row level security;

create policy "reference_prices are readable by authenticated users"
  on reference_prices for select
  to authenticated
  using (true);

-- Annonces ingérées (scraping best-effort ou import manuel).
create table listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) default auth.uid(),
  source text not null,
  source_url text not null,
  title text not null,
  commune text not null,
  postal_code text not null,
  insee_code text,
  property_type text not null check (property_type in ('appartement', 'maison')),
  price_eur numeric not null check (price_eur > 0),
  surface_m2 numeric not null check (surface_m2 > 0),
  rooms integer,
  condition text not null default 'inconnu'
    check (condition in ('neuf', 'bon_etat', 'travaux_a_prevoir', 'a_renover', 'inconnu')),
  construction_year integer,
  floor integer,
  has_elevator boolean,
  description text not null default '',
  published_at timestamptz,
  scraped_at timestamptz not null default now(),
  latitude double precision,
  longitude double precision,
  contact_agency_name text,
  contact_agent_name text,
  contact_email text,
  contact_phone text,
  status text not null default 'new'
    check (status in ('new', 'reviewed', 'contacted', 'visit_scheduled', 'visited', 'rejected', 'archived')),
  created_at timestamptz not null default now(),
  unique (user_id, source_url)
);

alter table listings enable row level security;

create policy "users manage their own listings"
  on listings for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index listings_insee_code_idx on listings (insee_code);
create index listings_status_idx on listings (status);

-- Score de décote/marge calculé pour une annonce (figé au moment du calcul,
-- utile pour l'historique et pour ce que l'agent de contact a vu/utilisé).
create table deal_scores (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings (id) on delete cascade unique,
  price_per_m2 numeric not null,
  reference_price_per_m2 numeric not null,
  discount_ratio numeric not null,
  renovation_cost_estimate numeric not null,
  estimated_resale_value numeric not null,
  total_project_cost numeric not null,
  projected_margin numeric not null,
  margin_ratio numeric not null,
  confidence text not null check (confidence in ('faible', 'moyenne', 'haute')),
  score integer not null check (score between 0 and 100),
  computed_at timestamptz not null default now()
);

alter table deal_scores enable row level security;

create policy "users read scores of their own listings"
  on deal_scores for select
  to authenticated
  using (
    exists (
      select 1 from listings
      where listings.id = deal_scores.listing_id
        and listings.user_id = auth.uid()
    )
  );

create index deal_scores_score_idx on deal_scores (score desc);

-- Créneaux de disponibilité de l'utilisateur, proposés aux agences lors de la
-- prise de contact.
create table availability_slots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) default auth.uid(),
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  is_booked boolean not null default false,
  listing_id uuid references listings (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table availability_slots enable row level security;

create policy "users manage their own availability"
  on availability_slots for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Messages de prise de contact envoyés (ou en attente d'envoi) aux agences.
create table outreach_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) default auth.uid(),
  listing_id uuid not null references listings (id) on delete cascade,
  channel text not null default 'email' check (channel in ('email')),
  status text not null default 'draft'
    check (status in ('draft', 'queued', 'sent', 'failed', 'replied')),
  to_email text not null,
  subject text not null,
  body text not null,
  proposed_slot_ids uuid[] not null default '{}',
  sent_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
);

alter table outreach_messages enable row level security;

create policy "users manage their own outreach messages"
  on outreach_messages for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index outreach_messages_listing_idx on outreach_messages (listing_id);

-- Rendez-vous de visite confirmés.
create table appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) default auth.uid(),
  listing_id uuid not null references listings (id) on delete cascade,
  slot_id uuid references availability_slots (id) on delete set null,
  scheduled_at timestamptz not null,
  status text not null default 'proposed'
    check (status in ('proposed', 'confirmed', 'cancelled', 'completed')),
  notes text not null default '',
  created_at timestamptz not null default now()
);

alter table appointments enable row level security;

create policy "users manage their own appointments"
  on appointments for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
