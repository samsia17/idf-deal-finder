import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/database.types";

/**
 * Client Supabase avec la clé de service (bypass RLS). Réservé aux scripts
 * exécutés côté serveur (import DVF, tâches d'ingestion) — ne jamais
 * embarquer cette clé côté navigateur.
 */
export function createAdminClient() {
  const url = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "VITE_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définis dans l'environnement.",
    );
  }

  return createClient<Database>(url, serviceKey, {
    auth: { persistSession: false },
  });
}
