# Ingestion d'annonces

## État actuel

- `adapters/demoAdapter.ts` — génère des annonces IDF réalistes et déterministes, **sans appel réseau**. C'est ce qui alimente le dashboard par défaut (`npm run dev`), pour que tout le pipeline (scoring, tri, agent de contact) soit démontrable immédiatement.
- `adapters/siteAdapter.template.ts` — gabarit **non fonctionnel**, à compléter site par site. Aucun adaptateur n'a été implémenté contre un vrai portail immobilier dans ce projet : les sélecteurs HTML n'ont pas été vérifiés contre du contenu réel, et auraient de toute façon une durée de vie courte (les sites changent leur structure sans préavis, avec anti-bot).

## Avant d'activer une source réelle

1. **CGU + robots.txt d'abord.** `fetchRobotsRules`/`isPathAllowed` (`robots.ts`) sont fournis pour vérifier automatiquement qu'un chemin est autorisé — mais un `robots.txt` permissif ne veut pas dire que les CGU du site autorisent le scraping commercial. Lis-les.
2. **Cherche une API officielle d'abord.** SeLoger, Bien'ici, LeBonCoin et d'autres proposent des accès partenaires/API à des professionnels (souvent payants). C'est plus robuste et sans zone grise juridique qu'un scraping HTML.
3. **Reste discret.** User-Agent identifiable avec contact, un seul thread, délai de plusieurs secondes entre requêtes (`rateLimiter.ts`), pas de re-scraping agressif des mêmes pages.
4. **Prévois la casse.** Chaque site peut changer sa structure HTML ou bloquer l'IP à tout moment. Le pipeline doit logguer et sauter une page en échec, jamais planter tout l'import.
5. **Ne republie pas le contenu protégé** (photos, descriptions) au-delà de ce qui est strictement nécessaire à ton usage interne (identifier/scorer les annonces) — évite de recréer un site miroir public.

## Ajouter une nouvelle source

1. Copie `adapters/siteAdapter.template.ts`.
2. Implémente `parseListingsFromHtml` (ou remplace par un appel à un endpoint JSON si le site en expose un).
3. Ajoute l'adaptateur à la liste utilisée par `scripts/ingest.ts`.
4. Teste sur un petit volume avant d'industrialiser.
