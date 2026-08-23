import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

export function Login() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setStatus("sending");
    setErrorMessage(null);
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }
    setStatus("sent");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-6">
        <h1 className="text-lg font-bold text-neutral-900">IDF Deal Finder</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Connecte-toi pour accéder à tes annonces et prises de contact.
        </p>

        {status === "sent" ? (
          <p className="mt-4 text-sm text-brand-600">
            Lien de connexion envoyé à {email}. Ouvre-le depuis ta boîte mail.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <input
              type="email"
              required
              placeholder="ton@email.fr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {status === "sending" ? "Envoi..." : "Recevoir un lien de connexion"}
            </button>
            {status === "error" && <p className="text-sm text-red-600">{errorMessage}</p>}
          </form>
        )}
      </div>
    </div>
  );
}
