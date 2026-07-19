export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      caes: {
        Row: {
          adoption_form_url: string
          birth_year: number
          created_at: string
          description: string
          featured: boolean
          gender: Database["public"]["Enums"]["cae_genero"]
          id: string
          name: string
          photos: string[]
          size: Database["public"]["Enums"]["cae_porte"]
          status: Database["public"]["Enums"]["cae_status"]
          updated_at: string
        }
        Insert: {
          adoption_form_url?: string
          birth_year: number
          created_at?: string
          description: string
          featured?: boolean
          gender: Database["public"]["Enums"]["cae_genero"]
          id?: string
          name: string
          photos?: string[]
          size: Database["public"]["Enums"]["cae_porte"]
          status?: Database["public"]["Enums"]["cae_status"]
          updated_at?: string
        }
        Update: {
          adoption_form_url?: string
          birth_year?: number
          created_at?: string
          description?: string
          featured?: boolean
          gender?: Database["public"]["Enums"]["cae_genero"]
          id?: string
          name?: string
          photos?: string[]
          size?: Database["public"]["Enums"]["cae_porte"]
          status?: Database["public"]["Enums"]["cae_status"]
          updated_at?: string
        }
        Relationships: []
      }
      historias: {
        Row: {
          created_at: string
          description: string
          id: string
          name: string
          photos: string[]
          published: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          name: string
          photos?: string[]
          published?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          name?: string
          photos?: string[]
          published?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      social_links: {
        Row: {
          display_order: number
          network: string
          updated_at: string
          url: string | null
        }
        Insert: {
          display_order: number
          network: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          display_order?: number
          network?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      caes_public: {
        Row: {
          adoption_form_url: string | null
          birth_year: number | null
          description: string | null
          featured: boolean | null
          gender: Database["public"]["Enums"]["cae_genero"] | null
          id: string | null
          name: string | null
          photos: string[] | null
          size: Database["public"]["Enums"]["cae_porte"] | null
        }
        Insert: {
          adoption_form_url?: string | null
          birth_year?: number | null
          description?: string | null
          featured?: boolean | null
          gender?: Database["public"]["Enums"]["cae_genero"] | null
          id?: string | null
          name?: string | null
          photos?: string[] | null
          size?: Database["public"]["Enums"]["cae_porte"] | null
        }
        Update: {
          adoption_form_url?: string | null
          birth_year?: number | null
          description?: string | null
          featured?: boolean | null
          gender?: Database["public"]["Enums"]["cae_genero"] | null
          id?: string | null
          name?: string | null
          photos?: string[] | null
          size?: Database["public"]["Enums"]["cae_porte"] | null
        }
        Relationships: []
      }
      historias_public: {
        Row: {
          description: string | null
          id: string | null
          name: string | null
          photos: string[] | null
        }
        Insert: {
          description?: string | null
          id?: string | null
          name?: string | null
          photos?: string[] | null
        }
        Update: {
          description?: string | null
          id?: string | null
          name?: string | null
          photos?: string[] | null
        }
        Relationships: []
      }
      social_links_public: {
        Row: {
          display_order: number | null
          network: string | null
          url: string | null
        }
        Insert: {
          display_order?: number | null
          network?: string | null
          url?: string | null
        }
        Update: {
          display_order?: number | null
          network?: string | null
          url?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      cae_genero: "macho" | "femea"
      cae_porte: "pequeno" | "medio" | "grande"
      cae_status: "disponivel" | "adotado" | "falecido"
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
      cae_genero: ["macho", "femea"],
      cae_porte: ["pequeno", "medio", "grande"],
      cae_status: ["disponivel", "adotado", "falecido"],
    },
  },
} as const
