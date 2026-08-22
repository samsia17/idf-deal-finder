interface RobotsRule {
  path: string;
  allow: boolean;
}

/** Parse un fichier robots.txt pour un user-agent donné (règles génériques `*` incluses en repli). */
export function parseRobotsTxt(content: string, userAgent: string): RobotsRule[] {
  const lines = content.split("\n").map((l) => l.trim());
  const rules: RobotsRule[] = [];
  let currentAgents: string[] = [];
  let previousLineWasAgent = false;

  for (const rawLine of lines) {
    const line = rawLine.split("#")[0].trim();
    if (!line) continue;
    const [rawKey, ...rest] = line.split(":");
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(":").trim();

    if (key === "user-agent") {
      // Une ligne User-agent qui suit une règle (Allow/Disallow) démarre un nouveau groupe.
      if (!previousLineWasAgent) currentAgents = [];
      currentAgents.push(value.toLowerCase());
      previousLineWasAgent = true;
      continue;
    }

    previousLineWasAgent = false;
    const matchesTargetGroup =
      currentAgents.includes("*") || currentAgents.includes(userAgent.toLowerCase());

    if ((key === "allow" || key === "disallow") && matchesTargetGroup && value !== "") {
      rules.push({ path: value, allow: key === "allow" });
    }
  }

  return rules;
}

/** La règle la plus spécifique (chemin le plus long) l'emporte, comme dans la RFC robots.txt. */
export function isPathAllowed(rules: RobotsRule[], path: string): boolean {
  let best: RobotsRule | null = null;
  for (const rule of rules) {
    if (path.startsWith(rule.path)) {
      if (!best || rule.path.length > best.path.length) {
        best = rule;
      }
    }
  }
  return best ? best.allow : true;
}

export async function fetchRobotsRules(baseUrl: string, userAgent: string): Promise<RobotsRule[]> {
  const robotsUrl = new URL("/robots.txt", baseUrl).toString();
  const response = await fetch(robotsUrl);
  if (!response.ok) return [];
  const content = await response.text();
  return parseRobotsTxt(content, userAgent);
}
