/**
 * supabase-js masque le corps de la réponse d'une Edge Function derrière un
 * message générique ("Edge Function returned a non-2xx status code") quand
 * elle répond avec un statut d'erreur. Le vrai message qu'on renvoie côté
 * fonction (`{ error: "..." }`) est accessible via `error.context` (l'objet
 * Response brut). Cette fonction va le chercher pour afficher quelque chose
 * d'exploitable à l'utilisateur au lieu du message générique.
 */
export async function describeFunctionError(err: unknown, fallback: string): Promise<string> {
  if (err && typeof err === "object" && "context" in err) {
    const context = (err as { context: unknown }).context;
    if (context instanceof Response) {
      try {
        const body = await context.clone().json();
        if (typeof body?.error === "string" && body.error) return body.error;
      } catch {
        // Corps non-JSON ou déjà consommé — on garde le repli ci-dessous.
      }
    }
  }
  return err instanceof Error && err.message ? err.message : fallback;
}
