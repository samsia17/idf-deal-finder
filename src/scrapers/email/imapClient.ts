import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

export interface ImapCredentials {
  host: string;
  port: number;
  user: string;
  /** Mot de passe d'application (jamais le mot de passe principal du compte). */
  appPassword: string;
}

export interface FetchedEmail {
  subject: string;
  html: string | null;
  text: string | null;
  receivedAt: Date | null;
  messageId: string | null;
}

export interface FetchEmailsOptions {
  /** Ne récupère que les emails dont l'expéditeur contient cette chaîne (ex: "jinka.fr"). */
  fromContains?: string;
  /** Ne récupère que les emails reçus dans les N derniers jours. */
  sinceDays?: number;
  mailbox?: string;
}

/**
 * Récupère les emails correspondant aux critères depuis une boîte IMAP.
 * Lecture seule (les messages ne sont pas marqués comme lus ni supprimés).
 */
export async function fetchEmails(
  credentials: ImapCredentials,
  options: FetchEmailsOptions = {},
): Promise<FetchedEmail[]> {
  const client = new ImapFlow({
    host: credentials.host,
    port: credentials.port,
    secure: true,
    auth: { user: credentials.user, pass: credentials.appPassword },
    logger: false,
  });

  const results: FetchedEmail[] = [];

  await client.connect();
  try {
    const lock = await client.getMailboxLock(options.mailbox ?? "INBOX");
    try {
      const since = options.sinceDays
        ? new Date(Date.now() - options.sinceDays * 24 * 60 * 60 * 1000)
        : undefined;

      const searchCriteria: Record<string, unknown> = {};
      if (since) searchCriteria.since = since;
      if (options.fromContains) searchCriteria.from = options.fromContains;

      const searchResult = await client.search(
        Object.keys(searchCriteria).length ? searchCriteria : { all: true },
      );
      const uids = searchResult || [];

      for (const uid of uids) {
        const message = await client.fetchOne(uid, { source: true });
        if (!message || !message.source) continue;

        const parsed = await simpleParser(message.source);
        results.push({
          subject: parsed.subject ?? "",
          html: typeof parsed.html === "string" ? parsed.html : null,
          text: parsed.text ?? null,
          receivedAt: parsed.date ?? null,
          messageId: parsed.messageId ?? null,
        });
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }

  return results;
}
