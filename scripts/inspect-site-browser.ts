/**
 * Version "vrai navigateur" de inspect-site.ts, pour les sites protégés par
 * un défi JavaScript (Cloudflare, etc.) qu'une simple requête HTTP ne peut
 * pas passer. Nécessite Chromium installé (une fois) :
 *
 *   npx playwright install --with-deps chromium
 *
 * Usage : npx tsx scripts/inspect-site-browser.ts "https://exemple.fr/recherche"
 */
import { chromium } from "playwright";

const SUSPICIOUS_PATTERNS = [
  "captcha",
  "datadome",
  "cloudflare",
  "checking your browser",
  "access denied",
  "just a moment",
  "enable javascript",
  "please verify you are a human",
  "attention required",
];

async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error('Usage: npx tsx scripts/inspect-site-browser.ts "https://..."');
    process.exit(1);
  }

  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    locale: "fr-FR",
  });

  console.log(`Chargement de ${url}...`);
  const response = await page.goto(url, { waitUntil: "networkidle", timeout: 30000 }).catch((err) => {
    console.error(`Échec de navigation : ${err.message}`);
    return null;
  });

  // Laisse une seconde de plus pour un éventuel défi JS qui se résout après le chargement initial.
  await page.waitForTimeout(2000);

  const title = await page.title();
  const html = await page.content();
  const status = response?.status();

  console.log(`Statut HTTP : ${status ?? "inconnu"}`);
  console.log(`Titre de la page : "${title}"`);
  console.log(`Taille du HTML rendu : ${html.length} caractères`);
  console.log("");

  const lowerHtml = html.toLowerCase();
  const lowerTitle = title.toLowerCase();
  const foundPatterns = SUSPICIOUS_PATTERNS.filter(
    (p) => lowerHtml.includes(p) || lowerTitle.includes(p),
  );
  if (foundPatterns.length > 0) {
    console.log(`⚠️ Indices de blocage anti-bot détectés : ${foundPatterns.join(", ")}`);
  } else {
    console.log("✅ Aucun indice évident de blocage anti-bot — la page semble s'être chargée normalement.");
  }
  console.log("");

  const classMatches = html.matchAll(/class="([^"]+)"/g);
  const classCounts = new Map<string, number>();
  for (const match of classMatches) {
    for (const cls of match[1].split(/\s+/)) {
      if (!cls) continue;
      classCounts.set(cls, (classCounts.get(cls) ?? 0) + 1);
    }
  }
  const topClasses = [...classCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25);
  console.log("Classes CSS les plus fréquentes (top 25) :");
  for (const [cls, count] of topClasses) {
    console.log(`  ${count}× .${cls}`);
  }

  await page.screenshot({ path: "/tmp/inspect-screenshot.png", fullPage: false });
  console.log("");
  console.log("Capture d'écran enregistrée : /tmp/inspect-screenshot.png");

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
