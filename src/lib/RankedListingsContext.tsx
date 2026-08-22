import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getRankedListings, type RankedListingsResult } from "@/lib/rankedListings";

interface RankedListingsState {
  loading: boolean;
  error: string | null;
  result: RankedListingsResult | null;
  refetch: () => void;
}

const RankedListingsContext = createContext<RankedListingsState | null>(null);

export function RankedListingsProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RankedListingsResult | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getRankedListings()
      .then((res) => {
        if (!cancelled) setResult(res);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erreur inconnue");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  return (
    <RankedListingsContext.Provider
      value={{ loading, error, result, refetch: () => setReloadToken((t) => t + 1) }}
    >
      {children}
    </RankedListingsContext.Provider>
  );
}

export function useRankedListings(): RankedListingsState {
  const ctx = useContext(RankedListingsContext);
  if (!ctx) {
    throw new Error("useRankedListings doit être utilisé sous RankedListingsProvider");
  }
  return ctx;
}
