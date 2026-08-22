import { supabase } from "@/lib/supabase/client";
import type { AvailabilitySlotRecord, OutreachMessageRecord } from "./types";

const DEMO_MESSAGES_KEY = "idf-deal-finder:demo-outreach-messages";
const DEMO_SLOTS_KEY = "idf-deal-finder:demo-availability-slots";

function readDemoStore<T>(key: string): T[] {
  const raw = localStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T[]) : [];
}

function writeDemoStore<T>(key: string, items: T[]): void {
  localStorage.setItem(key, JSON.stringify(items));
}

export async function listOutreachMessages(): Promise<OutreachMessageRecord[]> {
  if (supabase) {
    const { data: rows, error } = await supabase
      .from("outreach_messages")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;

    const listingIds = [...new Set((rows ?? []).map((r) => r.listing_id))];
    const { data: listingRows } = listingIds.length
      ? await supabase.from("listings").select("id,title").in("id", listingIds)
      : { data: [] };
    const titleById = new Map((listingRows ?? []).map((l) => [l.id, l.title]));

    return (rows ?? []).map((row) => ({
      id: row.id,
      listingId: row.listing_id,
      listingTitle: titleById.get(row.listing_id) ?? "Annonce",
      toEmail: row.to_email,
      subject: row.subject,
      body: row.body,
      status: row.status,
      sentAt: row.sent_at,
      errorMessage: row.error_message,
      createdAt: row.created_at,
    }));
  }
  return readDemoStore<OutreachMessageRecord>(DEMO_MESSAGES_KEY).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export async function createOutreachMessage(input: {
  listingId: string;
  listingTitle: string;
  toEmail: string;
  subject: string;
  body: string;
}): Promise<OutreachMessageRecord> {
  if (supabase) {
    const { data: userRes } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("outreach_messages")
      .insert({
        user_id: userRes.user?.id ?? "",
        listing_id: input.listingId,
        channel: "email",
        status: "draft",
        to_email: input.toEmail,
        subject: input.subject,
        body: input.body,
        proposed_slot_ids: [],
      })
      .select("*")
      .single();
    if (error || !data) throw error ?? new Error("Échec de création du message");
    return {
      id: data.id,
      listingId: data.listing_id,
      listingTitle: input.listingTitle,
      toEmail: data.to_email,
      subject: data.subject,
      body: data.body,
      status: data.status,
      sentAt: data.sent_at,
      errorMessage: data.error_message,
      createdAt: data.created_at,
    };
  }

  const record: OutreachMessageRecord = {
    id: crypto.randomUUID(),
    listingId: input.listingId,
    listingTitle: input.listingTitle,
    toEmail: input.toEmail,
    subject: input.subject,
    body: input.body,
    status: "draft",
    sentAt: null,
    errorMessage: null,
    createdAt: new Date().toISOString(),
  };
  const messages = readDemoStore<OutreachMessageRecord>(DEMO_MESSAGES_KEY);
  messages.push(record);
  writeDemoStore(DEMO_MESSAGES_KEY, messages);
  return record;
}

export async function sendOutreachMessage(id: string): Promise<void> {
  if (supabase) {
    const { error } = await supabase.functions.invoke("send-outreach-email", {
      body: { outreachMessageId: id },
    });
    if (error) throw error;
    return;
  }

  // Mode démonstration : aucun email réel n'est envoyé.
  const messages = readDemoStore<OutreachMessageRecord>(DEMO_MESSAGES_KEY);
  const updated = messages.map((m) =>
    m.id === id ? { ...m, status: "sent" as const, sentAt: new Date().toISOString() } : m,
  );
  writeDemoStore(DEMO_MESSAGES_KEY, updated);
}

export async function listAvailabilitySlots(): Promise<AvailabilitySlotRecord[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from("availability_slots")
      .select("*")
      .order("starts_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((row) => ({
      id: row.id,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      isBooked: row.is_booked,
    }));
  }
  return readDemoStore<AvailabilitySlotRecord>(DEMO_SLOTS_KEY).sort((a, b) =>
    a.startsAt.localeCompare(b.startsAt),
  );
}

export async function addAvailabilitySlot(startsAt: string, endsAt: string): Promise<void> {
  if (supabase) {
    const { data: userRes } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("availability_slots")
      .insert({ user_id: userRes.user?.id ?? "", starts_at: startsAt, ends_at: endsAt, is_booked: false });
    if (error) throw error;
    return;
  }
  const slots = readDemoStore<AvailabilitySlotRecord>(DEMO_SLOTS_KEY);
  slots.push({ id: crypto.randomUUID(), startsAt, endsAt, isBooked: false });
  writeDemoStore(DEMO_SLOTS_KEY, slots);
}

export async function removeAvailabilitySlot(id: string): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from("availability_slots").delete().eq("id", id);
    if (error) throw error;
    return;
  }
  const slots = readDemoStore<AvailabilitySlotRecord>(DEMO_SLOTS_KEY).filter((s) => s.id !== id);
  writeDemoStore(DEMO_SLOTS_KEY, slots);
}
