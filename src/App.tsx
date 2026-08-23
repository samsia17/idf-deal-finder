import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Dashboard } from "@/pages/Dashboard";
import { ListingDetail } from "@/pages/ListingDetail";
import { Outreach } from "@/pages/Outreach";
import { ComposeOutreach } from "@/pages/ComposeOutreach";
import { AddListing } from "@/pages/AddListing";
import { Login } from "@/pages/Login";
import { RankedListingsProvider } from "@/lib/RankedListingsContext";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import { supabase } from "@/lib/supabase/client";

function Gate({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();

  // Mode démonstration (Supabase non configuré) : pas de connexion requise.
  if (!supabase) return <>{children}</>;

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-neutral-500">Chargement...</div>;
  }
  if (!session) return <Login />;
  return <>{children}</>;
}

export function App() {
  return (
    <AuthProvider>
      <Gate>
        <RankedListingsProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/annonces/nouvelle" element={<AddListing />} />
                <Route path="/annonces/:id" element={<ListingDetail />} />
                <Route path="/contacts" element={<Outreach />} />
                <Route path="/contacts/nouveau" element={<ComposeOutreach />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </RankedListingsProvider>
      </Gate>
    </AuthProvider>
  );
}
