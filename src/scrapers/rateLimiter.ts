export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Exécute `task` pour chaque item de `items`, en espaçant chaque appel d'au
 * moins `delayMs`. Volontairement séquentiel (pas de parallélisme) : un
 * scraper doit rester discret et ne pas marteler le serveur cible.
 */
export async function runWithDelay<T, R>(
  items: T[],
  delayMs: number,
  task: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i++) {
    if (i > 0) await sleep(delayMs);
    results.push(await task(items[i], i));
  }
  return results;
}
