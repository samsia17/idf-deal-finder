// En-têtes CORS partagés par toutes les Edge Functions appelées depuis le
// navigateur (via supabase.functions.invoke). Sans la réponse à la requête
// de vérification OPTIONS, le navigateur bloque la vraie requête avant même
// de l'envoyer — erreur générique "Failed to send a request to the Edge
// Function" côté client, sans détail exploitable.
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export function handleCorsPreflight(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  return null;
}
