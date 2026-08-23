/**
 * Outil de diagnostic : récupère une page et affiche des indices sur sa
 * structure (bloquée par anti-bot ? rendue côté serveur ou en JS ? quelles
 * classes reviennent souvent ?), pour préparer un vrai adaptateur de
 * scraping sans deviner à l'aveugle.
 *
 * Usage : npx tsx scripts/inspect-site.ts "https://exemple.fr/recherche"
 */
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

const SUSPICIOUS_PATTERNS = [
  "captcha",
  "datadome",
  "cloudflare",
  "checking your browser",
  "access denied",
  "just a moment",
  "enable javascript",
  "please verify you are a human",
];

async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error('Usage: npx tsx scripts/inspect-site.ts "https://..."');
    process.exit(1);
  }

  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "fr-FR,fr;q=0.9",
    },
  });

  const html = await response.text();

  console.log(`Statut HTTP : ${response.status}`);
  console.log(`Taille de la réponse : ${html.length} caractères`);
  console.log(`Content-Type : ${response.headers.get("content-type")}`);
  console.log("");

  const lowerHtml = html.toLowerCase();
  const foundPatterns = SUSPICIOUS_PATTERNS.filter((p) => lowerHtml.includes(p));
  if (foundPatterns.length > 0) {
    console.log(`⚠️ Indices de protection anti-bot détectés : ${foundPatterns.join(", ")}`);
  } else {
    console.log("✅ Aucun indice évident de blocage anti-bot dans le HTML brut.");
  }
  console.log("");

  // Classes CSS les plus fréquentes (indice de cartes d'annonces répétées).
  const classMatches = html.matchAll(/class="([^"]+)"/g);
  const classCounts = new Map<string, number>();
  for (const match of classMatches) {
    for (const cls of match[1].split(/\s+/)) {
      if (!cls) continue;
      classCounts.set(cls, (classCounts.get(cls) ?? 0) + 1);
    }
  }
  const topClasses = [...classCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25);
  console.log("Classes CSS les plus fréquentes (top 25) :");
  for (const [cls, count] of topClasses) {
    console.log(`  ${count}× .${cls}`);
  }
  console.log("");

  console.log("--- Premiers 3000 caractères du HTML ---");
  console.log(html.slice(0, 3000));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
