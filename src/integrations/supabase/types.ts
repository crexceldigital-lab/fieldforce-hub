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
      brands: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brands_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          primary_locale: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          primary_locale?: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          primary_locale?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          barcode: string | null
          brand_id: string | null
          category_id: string | null
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          is_competitor: boolean
          name: string
          organization_id: string
          package_size: string | null
          sku: string | null
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          brand_id?: string | null
          category_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_competitor?: boolean
          name: string
          organization_id: string
          package_size?: string | null
          sku?: string | null
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          brand_id?: string | null
          category_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_competitor?: boolean
          name?: string
          organization_id?: string
          package_size?: string | null
          sku?: string | null
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active_organization_id: string | null
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          active_organization_id?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          active_organization_id?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_active_organization_id_fkey"
            columns: ["active_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          permission: Database["public"]["Enums"]["app_permission"]
          role_id: string
        }
        Insert: {
          permission: Database["public"]["Enums"]["app_permission"]
          role_id: string
        }
        Update: {
          permission?: Database["public"]["Enums"]["app_permission"]
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name: string
          organization_id: string | null
          scope: Database["public"]["Enums"]["role_scope"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
          organization_id?: string | null
          scope?: Database["public"]["Enums"]["role_scope"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          organization_id?: string | null
          scope?: Database["public"]["Enums"]["role_scope"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      store_timeline_events: {
        Row: {
          actor_id: string | null
          created_at: string
          description: string | null
          event_type: string
          id: string
          metadata: Json
          organization_id: string
          store_id: string
          title: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          description?: string | null
          event_type: string
          id?: string
          metadata?: Json
          organization_id: string
          store_id: string
          title: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          metadata?: Json
          organization_id?: string
          store_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_timeline_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_timeline_events_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          channel: Database["public"]["Enums"]["store_channel"]
          created_at: string
          created_by: string | null
          credit_status: string | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          notes: string | null
          organization_id: string
          owner_name: string | null
          phone: string | null
          photo_url: string | null
          route_id: string | null
          tier: Database["public"]["Enums"]["store_tier"]
          updated_at: string
        }
        Insert: {
          channel?: Database["public"]["Enums"]["store_channel"]
          created_at?: string
          created_by?: string | null
          credit_status?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          notes?: string | null
          organization_id: string
          owner_name?: string | null
          phone?: string | null
          photo_url?: string | null
          route_id?: string | null
          tier?: Database["public"]["Enums"]["store_tier"]
          updated_at?: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["store_channel"]
          created_at?: string
          created_by?: string | null
          credit_status?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          notes?: string | null
          organization_id?: string
          owner_name?: string | null
          phone?: string | null
          photo_url?: string | null
          route_id?: string | null
          tier?: Database["public"]["Enums"]["store_tier"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stores_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stores_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      territories: {
        Row: {
          created_at: string
          id: string
          level: Database["public"]["Enums"]["territory_level"]
          name: string
          organization_id: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          level: Database["public"]["Enums"]["territory_level"]
          name: string
          organization_id: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: Database["public"]["Enums"]["territory_level"]
          name?: string
          organization_id?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "territories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "territories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      territory_assignments: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          territory_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          territory_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          territory_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "territory_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "territory_assignments_territory_id_fkey"
            columns: ["territory_id"]
            isOneToOne: false
            referencedRelation: "territories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          organization_id: string | null
          role_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id?: string | null
          role_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string | null
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_permission: {
        Args: {
          _org_id: string
          _perm: Database["public"]["Enums"]["app_permission"]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_platform_admin: { Args: { _user_id: string }; Returns: boolean }
      provision_organization: {
        Args: { _name: string; _slug: string }
        Returns: string
      }
    }
    Enums: {
      app_permission:
        | "org.manage"
        | "users.manage"
        | "roles.manage"
        | "territories.manage"
        | "stores.manage"
        | "stores.delete"
        | "products.manage"
        | "campaigns.manage"
        | "forms.manage"
        | "visits.assign"
        | "visits.execute"
        | "audits.execute"
        | "orders.approve"
        | "reports.export"
        | "finance.view"
        | "client_dashboards.view"
        | "issues.resolve"
        | "kpis.configure"
        | "automations.manage"
        | "api.access"
      role_scope: "platform" | "organization"
      store_channel:
        | "modern_trade"
        | "traditional_trade"
        | "wholesale"
        | "kiosk"
      store_tier: "gold" | "silver" | "bronze" | "unclassified"
      territory_level: "country" | "region" | "district" | "ward" | "route"
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
      app_permission: [
        "org.manage",
        "users.manage",
        "roles.manage",
        "territories.manage",
        "stores.manage",
        "stores.delete",
        "products.manage",
        "campaigns.manage",
        "forms.manage",
        "visits.assign",
        "visits.execute",
        "audits.execute",
        "orders.approve",
        "reports.export",
        "finance.view",
        "client_dashboards.view",
        "issues.resolve",
        "kpis.configure",
        "automations.manage",
        "api.access",
      ],
      role_scope: ["platform", "organization"],
      store_channel: [
        "modern_trade",
        "traditional_trade",
        "wholesale",
        "kiosk",
      ],
      store_tier: ["gold", "silver", "bronze", "unclassified"],
      territory_level: ["country", "region", "district", "ward", "route"],
    },
  },
} as const
