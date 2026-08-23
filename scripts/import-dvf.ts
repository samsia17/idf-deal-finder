/**
 * Importe les données ouvertes DVF (Demandes de Valeurs Foncières, DGFiP/Etalab)
 * pour les départements d'Île-de-France et met à jour la table
 * `reference_prices` avec le prix médian €/m² par commune et type de bien.
 *
 * Source : https://files.data.gouv.fr/geo-dvf/latest/csv/ (open data public,
 * pas de clé API requise, republication autorisée sous Licence Ouverte).
 *
 * Usage :
 *   npm run import:dvf -- --year 2024
 *   npm run import:dvf -- --year 2024 --departements 75,92,93
 */
import "dotenv/config";
import { parse } from "csv-parse";
import { Readable } from "node:stream";
import { createGunzip } from "node:zlib";
import { aggregateReferencePrices, type DvfTransaction } from "../src/lib/dvf/aggregate";
import { IDF_DEPARTEMENTS } from "../src/lib/idf";
import { createAdminClient } from "./supabaseAdmin";

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const idx = args.indexOf(flag);
    return idx >= 0 ? args[idx + 1] : undefined;
  };
  const year = get("--year") ?? String(new Date().getFullYear() - 1);
  const departements = (get("--departements") ?? IDF_DEPARTEMENTS.join(",")).split(",");
  return { year, departements };
}

async function fetchDepartementTransactions(year: string, departement: string): Promise<DvfTransaction[]> {
  const url = `https://files.data.gouv.fr/geo-dvf/latest/csv/${year}/departements/${departement}.csv.gz`;
  console.log(`Téléchargement ${url}`);
  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Échec du téléchargement pour le département ${departement} (${response.status})`);
  }

  const gunzip = createGunzip();
  const nodeStream = Readable.fromWeb(response.body as never).pipe(gunzip);
  const parser = nodeStream.pipe(parse({ columns: true, delimiter: ",", relax_column_count: true }));

  const transactions: DvfTransaction[] = [];
  for await (const row of parser as AsyncIterable<Record<string, string>>) {
    transactions.push({
      codeCommune: row.code_commune,
      commune: row.nom_commune,
      codePostal: row.code_postal,
      typeLocal: row.type_local,
      valeurFonciere: Number(row.valeur_fonciere),
      surfaceReelleBati: Number(row.surface_reelle_bati),
      natureMutation: row.nature_mutation,
      nombreLots: Number(row.nombre_lots || "0"),
    });
  }
  return transactions;
}

async function main() {
  const { year, departements } = parseArgs();
  const periodStart = `${year}-01-01`;
  const periodEnd = `${Number(year) + 1}-01-01`;

  const admin = createAdminClient();
  let totalCommunes = 0;

  for (const departement of departements) {
    const transactions = await fetchDepartementTransactions(year, departement.trim());
    console.log(`  ${transactions.length} transactions brutes pour le département ${departement}`);

    const aggregates = aggregateReferencePrices(transactions, { periodStart, periodEnd });
    console.log(`  ${aggregates.length} couples commune/type de bien agrégés`);

    const rows = aggregates.map((a) => ({ ...a, source: "dvf" as const }));
    const { error } = await admin
      .from("reference_prices")
      .upsert(rows, { onConflict: "insee_code,property_type,period_start,period_end" });

    if (error) {
      throw new Error(`Échec de l'upsert pour le département ${departement}: ${error.message}`);
    }
    totalCommunes += aggregates.length;
  }

  console.log(`Import terminé : ${totalCommunes} références commune/type de bien mises à jour.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
