export interface OutreachMessageRecord {
  id: string;
  listingId: string;
  listingTitle: string;
  toEmail: string;
  subject: string;
  body: string;
  status: "draft" | "queued" | "sent" | "failed" | "replied";
  sentAt: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface AvailabilitySlotRecord {
  id: string;
  startsAt: string;
  endsAt: string;
  isBooked: boolean;
}
