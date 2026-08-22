const eurFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const eurPerM2Formatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat("fr-FR", {
  style: "percent",
  maximumFractionDigits: 0,
  signDisplay: "always",
});

export const formatEur = (value: number): string => eurFormatter.format(value);
export const formatEurPerM2 = (value: number): string => `${eurPerM2Formatter.format(value)}/m²`;
export const formatPercent = (value: number): string => percentFormatter.format(value);

export const CONDITION_LABELS: Record<string, string> = {
  neuf: "Neuf",
  bon_etat: "Bon état",
  travaux_a_prevoir: "Travaux à prévoir",
  a_renover: "À rénover",
  inconnu: "État inconnu",
};

export const CONFIDENCE_LABELS: Record<string, string> = {
  faible: "Confiance faible",
  moyenne: "Confiance moyenne",
  haute: "Confiance haute",
};
