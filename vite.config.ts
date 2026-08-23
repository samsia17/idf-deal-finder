import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // Nécessaire pour accéder au serveur de dev via un domaine de
    // redirection de port (GitHub Codespaces, Gitpod...) plutôt que
    // localhost directement — sinon Vite rejette la requête (protection
    // anti DNS-rebinding par défaut).
    allowedHosts: true,
  },
  test: {
    environment: "node",
  },
});
