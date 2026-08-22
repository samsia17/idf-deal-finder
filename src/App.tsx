import { HashRouter, Route, Routes } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Dashboard } from "@/pages/Dashboard";
import { ListingDetail } from "@/pages/ListingDetail";
import { Outreach } from "@/pages/Outreach";
import { ComposeOutreach } from "@/pages/ComposeOutreach";
import { RankedListingsProvider } from "@/lib/RankedListingsContext";

export function App() {
  return (
    <RankedListingsProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/annonces/:id" element={<ListingDetail />} />
            <Route path="/contacts" element={<Outreach />} />
            <Route path="/contacts/nouveau" element={<ComposeOutreach />} />
          </Route>
        </Routes>
      </HashRouter>
    </RankedListingsProvider>
  );
}
