/**
 * Types générés à la main pour correspondre à supabase/migrations/0001_init.sql.
 * À régénérer avec `supabase gen types typescript` une fois le projet Supabase
 * lié (`supabase link`), pour rester en synchronisation avec le schéma réel.
 */
export interface Database {
  public: {
    Tables: {
      reference_prices: {
        Row: {
          id: string;
          insee_code: string;
          commune: string;
          postal_code: string;
          property_type: "appartement" | "maison";
          median_price_m2: number;
          sample_size: number;
          period_start: string;
          period_end: string;
          source: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          insee_code: string;
          commune: string;
          postal_code: string;
          property_type: "appartement" | "maison";
          median_price_m2: number;
          sample_size: number;
          period_start: string;
          period_end: string;
          source?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["reference_prices"]["Insert"]>;
        Relationships: [];
      };
      listings: {
        Row: {
          id: string;
          user_id: string;
          source: string;
          source_url: string;
          title: string;
          commune: string;
          postal_code: string;
          insee_code: string | null;
          property_type: "appartement" | "maison";
          price_eur: number;
          surface_m2: number;
          rooms: number | null;
          condition: "neuf" | "bon_etat" | "travaux_a_prevoir" | "a_renover" | "inconnu";
          construction_year: number | null;
          floor: number | null;
          has_elevator: boolean | null;
          description: string;
          published_at: string | null;
          scraped_at: string;
          latitude: number | null;
          longitude: number | null;
          contact_agency_name: string | null;
          contact_agent_name: string | null;
          contact_email: string | null;
          contact_phone: string | null;
          status:
            | "new"
            | "reviewed"
            | "contacted"
            | "visit_scheduled"
            | "visited"
            | "rejected"
            | "archived";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          source: string;
          source_url: string;
          title: string;
          commune: string;
          postal_code: string;
          insee_code?: string | null;
          property_type: "appartement" | "maison";
          price_eur: number;
          surface_m2: number;
          rooms?: number | null;
          condition?: "neuf" | "bon_etat" | "travaux_a_prevoir" | "a_renover" | "inconnu";
          construction_year?: number | null;
          floor?: number | null;
          has_elevator?: boolean | null;
          description?: string;
          published_at?: string | null;
          scraped_at?: string;
          latitude?: number | null;
          longitude?: number | null;
          contact_agency_name?: string | null;
          contact_agent_name?: string | null;
          contact_email?: string | null;
          contact_phone?: string | null;
          status?:
            | "new"
            | "reviewed"
            | "contacted"
            | "visit_scheduled"
            | "visited"
            | "rejected"
            | "archived";
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["listings"]["Insert"]>;
        Relationships: [];
      };
      deal_scores: {
        Row: {
          id: string;
          listing_id: string;
          price_per_m2: number;
          reference_price_per_m2: number;
          discount_ratio: number;
          renovation_cost_estimate: number;
          estimated_resale_value: number;
          total_project_cost: number;
          projected_margin: number;
          margin_ratio: number;
          confidence: "faible" | "moyenne" | "haute";
          score: number;
          computed_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          price_per_m2: number;
          reference_price_per_m2: number;
          discount_ratio: number;
          renovation_cost_estimate: number;
          estimated_resale_value: number;
          total_project_cost: number;
          projected_margin: number;
          margin_ratio: number;
          confidence: "faible" | "moyenne" | "haute";
          score: number;
          computed_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["deal_scores"]["Insert"]>;
        Relationships: [];
      };
      availability_slots: {
        Row: {
          id: string;
          user_id: string;
          starts_at: string;
          ends_at: string;
          is_booked: boolean;
          listing_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          starts_at: string;
          ends_at: string;
          is_booked?: boolean;
          listing_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["availability_slots"]["Insert"]>;
        Relationships: [];
      };
      outreach_messages: {
        Row: {
          id: string;
          user_id: string;
          listing_id: string;
          channel: "email";
          status: "draft" | "queued" | "sent" | "failed" | "replied";
          to_email: string;
          subject: string;
          body: string;
          proposed_slot_ids: string[];
          sent_at: string | null;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          listing_id: string;
          channel?: "email";
          status?: "draft" | "queued" | "sent" | "failed" | "replied";
          to_email: string;
          subject: string;
          body: string;
          proposed_slot_ids?: string[];
          sent_at?: string | null;
          error_message?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["outreach_messages"]["Insert"]>;
        Relationships: [];
      };
      appointments: {
        Row: {
          id: string;
          user_id: string;
          listing_id: string;
          slot_id: string | null;
          scheduled_at: string;
          status: "proposed" | "confirmed" | "cancelled" | "completed";
          notes: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          listing_id: string;
          slot_id?: string | null;
          scheduled_at: string;
          status?: "proposed" | "confirmed" | "cancelled" | "completed";
          notes?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["appointments"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
