import { NavLink, Outlet } from "react-router-dom";
import { supabase } from "@/lib/supabase/client";

const navItems = [
  { to: "/", label: "Annonces" },
  { to: "/contacts", label: "Prises de contact" },
];

function SignOutButton() {
  if (!supabase) return null;
  const client = supabase;
  return (
    <button onClick={() => client.auth.signOut()} className="text-sm text-neutral-500 hover:text-neutral-800">
      Se déconnecter
    </button>
  );
}

export function Layout() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <span className="text-lg font-bold text-neutral-900">IDF Deal Finder</span>
          <div className="flex items-center gap-3">
            <nav className="flex gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                      isActive ? "bg-brand-100 text-brand-700" : "text-neutral-600 hover:bg-neutral-100"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
