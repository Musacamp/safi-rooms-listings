export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      listing_events: {
        Row: {
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["event_kind"]
          listing_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["event_kind"]
          listing_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["event_kind"]
          listing_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_events_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          amenities: string[]
          calls_count: number
          created_at: string
          deposit_ugx: number
          description: string
          distance_from_town: string | null
          id: string
          is_archived: boolean
          is_available: boolean
          is_featured: boolean
          is_self_contained: boolean
          is_verified: boolean
          location: string
          photos: string[]
          posted_at: string
          rent_ugx: number
          room_number: string | null
          room_type: Database["public"]["Enums"]["room_type"]
          title: string
          updated_at: string
          vacancies: number
          views_count: number
          whatsapp_count: number
        }
        Insert: {
          amenities?: string[]
          calls_count?: number
          created_at?: string
          deposit_ugx?: number
          description?: string
          distance_from_town?: string | null
          id?: string
          is_archived?: boolean
          is_available?: boolean
          is_featured?: boolean
          is_self_contained?: boolean
          is_verified?: boolean
          location: string
          photos?: string[]
          posted_at?: string
          rent_ugx: number
          room_number?: string | null
          room_type: Database["public"]["Enums"]["room_type"]
          title: string
          updated_at?: string
          vacancies?: number
          views_count?: number
          whatsapp_count?: number
        }
        Update: {
          amenities?: string[]
          calls_count?: number
          created_at?: string
          deposit_ugx?: number
          description?: string
          distance_from_town?: string | null
          id?: string
          is_archived?: boolean
          is_available?: boolean
          is_featured?: boolean
          is_self_contained?: boolean
          is_verified?: boolean
          location?: string
          photos?: string[]
          posted_at?: string
          rent_ugx?: number
          room_number?: string | null
          room_type?: Database["public"]["Enums"]["room_type"]
          title?: string
          updated_at?: string
          vacancies?: number
          views_count?: number
          whatsapp_count?: number
        }
        Relationships: []
      }
      revenue_entries: {
        Row: {
          amount_ugx: number
          created_at: string
          created_by: string | null
          entry_date: string
          id: string
          notes: string | null
          source: Database["public"]["Enums"]["revenue_source"]
          source_label: string | null
          transactions: number
          updated_at: string
        }
        Insert: {
          amount_ugx?: number
          created_at?: string
          created_by?: string | null
          entry_date?: string
          id?: string
          notes?: string | null
          source?: Database["public"]["Enums"]["revenue_source"]
          source_label?: string | null
          transactions?: number
          updated_at?: string
        }
        Update: {
          amount_ugx?: number
          created_at?: string
          created_by?: string | null
          entry_date?: string
          id?: string
          notes?: string | null
          source?: Database["public"]["Enums"]["revenue_source"]
          source_label?: string | null
          transactions?: number
          updated_at?: string
        }
        Relationships: []
      }
      site_visits: {
        Row: {
          created_at: string
          id: string
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          session_id?: string
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          name: string
          phone: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          name: string
          phone: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          name?: string
          phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      event_kind: "view" | "call" | "whatsapp"
      revenue_source:
        | "client_payment"
        | "landlord_payment"
        | "listing_fee"
        | "brokerage_fee"
        | "property_management"
        | "advertising"
        | "premium_listing"
        | "other"
      room_type:
        | "single"
        | "double"
        | "self_contained"
        | "apartment"
        | "business"
        | "shop"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      event_kind: ["view", "call", "whatsapp"],
      revenue_source: [
        "client_payment",
        "landlord_payment",
        "listing_fee",
        "brokerage_fee",
        "property_management",
        "advertising",
        "premium_listing",
        "other",
      ],
      room_type: [
        "single",
        "double",
        "self_contained",
        "apartment",
        "business",
        "shop",
      ],
    },
  },
} as const
