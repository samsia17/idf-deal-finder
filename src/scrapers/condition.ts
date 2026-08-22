import type { Condition } from "@/types/listing";

const PATTERNS: Array<{ condition: Condition; keywords: RegExp }> = [
  // Vérifié avant les motifs "travaux" pour ne pas confondre "aucun travaux
  // à prévoir" avec un signal de travaux à prévoir.
  {
    // \b après le participe passé pour ne pas confondre "rénové" avec
    // l'infinitif "rénover" (qui, lui, signale un bien À rénover).
    condition: "bon_etat",
    keywords: /r[ée]nov[ée]e?s?\b|refait à neuf|aucun travaux|excellent [ée]tat|bon [ée]tat/i,
  },
  { condition: "neuf", keywords: /\bneuf\b|vefa|livraison \d{4}/i },
  { condition: "a_renover", keywords: /\b(à|a) r[ée]nover|gros travaux|entièrement à refaire/i },
  {
    condition: "travaux_a_prevoir",
    keywords: /travaux à pr[ée]voir|(à|a) rafra[îi]chir|quelques travaux|pr[ée]voir des travaux/i,
  },
];

/**
 * Déduit l'état probable du bien à partir du texte libre de l'annonce.
 * Best-effort : retourne "inconnu" si aucun signal textuel clair n'est trouvé,
 * auquel cas le moteur de scoring applique une estimation travaux conservatrice.
 */
export function inferConditionFromText(text: string): Condition {
  for (const { condition, keywords } of PATTERNS) {
    if (keywords.test(text)) return condition;
  }
  return "inconnu";
}
