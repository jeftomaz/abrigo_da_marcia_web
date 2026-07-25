export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      caes: {
        Row: {
          adoption_form_url: string | null
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
          adoption_form_url?: string | null
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
          adoption_form_url?: string | null
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
      event_deletion_audit: {
        Row: {
          deleted_at: string
          deleted_by: string | null
          event_id: string
          event_name: string
          export_email: string
          export_sent_at: string
          id: string
        }
        Insert: {
          deleted_at?: string
          deleted_by?: string | null
          event_id: string
          event_name: string
          export_email: string
          export_sent_at: string
          id?: string
        }
        Update: {
          deleted_at?: string
          deleted_by?: string | null
          event_id?: string
          event_name?: string
          export_email?: string
          export_sent_at?: string
          id?: string
        }
        Relationships: []
      }
      event_settings: {
        Row: {
          default_max_product_units: number
          default_max_raffle_numbers: number
          default_post_payment_instructions: string | null
          default_reservation_ttl: string
          event_export_email: string | null
          singleton: boolean
          updated_at: string
        }
        Insert: {
          default_max_product_units?: number
          default_max_raffle_numbers?: number
          default_post_payment_instructions?: string | null
          default_reservation_ttl?: string
          event_export_email?: string | null
          singleton?: boolean
          updated_at?: string
        }
        Update: {
          default_max_product_units?: number
          default_max_raffle_numbers?: number
          default_post_payment_instructions?: string | null
          default_reservation_ttl?: string
          event_export_email?: string | null
          singleton?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      eventos: {
        Row: {
          activated_at: string | null
          archived_at: string | null
          created_at: string
          data_verified_at: string | null
          description: string | null
          draft_payload: Json | null
          end_date: string | null
          ended_at: string | null
          fundraising_goal_cents: number | null
          id: string
          max_items_per_reservation: number | null
          name: string | null
          photos: string[]
          pix_city: string | null
          pix_key: string | null
          pix_receiver: string | null
          post_payment_instructions: string | null
          receipt_folder_url: string | null
          reservation_ttl: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["evento_status"]
          type: Database["public"]["Enums"]["evento_tipo"]
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          archived_at?: string | null
          created_at?: string
          data_verified_at?: string | null
          description?: string | null
          draft_payload?: Json | null
          end_date?: string | null
          ended_at?: string | null
          fundraising_goal_cents?: number | null
          id?: string
          max_items_per_reservation?: number | null
          name?: string | null
          photos?: string[]
          pix_city?: string | null
          pix_key?: string | null
          pix_receiver?: string | null
          post_payment_instructions?: string | null
          receipt_folder_url?: string | null
          reservation_ttl?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["evento_status"]
          type: Database["public"]["Enums"]["evento_tipo"]
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          archived_at?: string | null
          created_at?: string
          data_verified_at?: string | null
          description?: string | null
          draft_payload?: Json | null
          end_date?: string | null
          ended_at?: string | null
          fundraising_goal_cents?: number | null
          id?: string
          max_items_per_reservation?: number | null
          name?: string | null
          photos?: string[]
          pix_city?: string | null
          pix_key?: string | null
          pix_receiver?: string | null
          post_payment_instructions?: string | null
          receipt_folder_url?: string | null
          reservation_ttl?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["evento_status"]
          type?: Database["public"]["Enums"]["evento_tipo"]
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
      produto_variacao_opcoes: {
        Row: {
          display_order: number
          id: string
          name: string
          variation_id: string
        }
        Insert: {
          display_order: number
          id?: string
          name: string
          variation_id: string
        }
        Update: {
          display_order?: number
          id?: string
          name?: string
          variation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "produto_variacao_opcoes_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "produto_variacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produto_variacao_opcoes_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "produto_variacoes_public"
            referencedColumns: ["id"]
          },
        ]
      }
      produto_variacoes: {
        Row: {
          display_order: number
          id: string
          name: string
          product_id: string
        }
        Insert: {
          display_order: number
          id?: string
          name: string
          product_id: string
        }
        Update: {
          display_order?: number
          id?: string
          name?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "produto_variacoes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produto_variacoes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "produtos_public"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          description: string
          discount_min_quantity: number | null
          discount_unit_price_cents: number | null
          display_order: number
          event_id: string
          id: string
          measurement_image: string | null
          measurement_table: Json | null
          name: string
          photos: string[]
          unit_price_cents: number
        }
        Insert: {
          description: string
          discount_min_quantity?: number | null
          discount_unit_price_cents?: number | null
          display_order: number
          event_id: string
          id?: string
          measurement_image?: string | null
          measurement_table?: Json | null
          name: string
          photos?: string[]
          unit_price_cents: number
        }
        Update: {
          description?: string
          discount_min_quantity?: number | null
          discount_unit_price_cents?: number | null
          display_order?: number
          event_id?: string
          id?: string
          measurement_image?: string | null
          measurement_table?: Json | null
          name?: string
          photos?: string[]
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "produtos_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "eventos_public"
            referencedColumns: ["id"]
          },
        ]
      }
      reserva_ip_sal: {
        Row: {
          sal: string
          singleton: boolean
        }
        Insert: {
          sal?: string
          singleton?: boolean
        }
        Update: {
          sal?: string
          singleton?: boolean
        }
        Relationships: []
      }
      reserva_ip_tentativas: {
        Row: {
          created_at: string
          id: number
          ip_hash: string
          kind: Database["public"]["Enums"]["reserva_tentativa_tipo"]
        }
        Insert: {
          created_at?: string
          id?: never
          ip_hash: string
          kind: Database["public"]["Enums"]["reserva_tentativa_tipo"]
        }
        Update: {
          created_at?: string
          id?: never
          ip_hash?: string
          kind?: Database["public"]["Enums"]["reserva_tentativa_tipo"]
        }
        Relationships: []
      }
      reserva_numeros: {
        Row: {
          id: string
          number: number
          price_cents: number
          raffle_id: string
          released_at: string | null
          reservation_id: string
        }
        Insert: {
          id?: string
          number: number
          price_cents: number
          raffle_id: string
          released_at?: string | null
          reservation_id: string
        }
        Update: {
          id?: string
          number?: number
          price_cents?: number
          raffle_id?: string
          released_at?: string | null
          reservation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reserva_numeros_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "rifa_numeros_public"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "reserva_numeros_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "rifas"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "reserva_numeros_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "rifas_public"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "reserva_numeros_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservas"
            referencedColumns: ["id"]
          },
        ]
      }
      reserva_produto_opcoes: {
        Row: {
          option_id: string | null
          option_name: string
          reservation_product_id: string
          variation_id: string | null
          variation_name: string
        }
        Insert: {
          option_id?: string | null
          option_name: string
          reservation_product_id: string
          variation_id?: string | null
          variation_name: string
        }
        Update: {
          option_id?: string | null
          option_name?: string
          reservation_product_id?: string
          variation_id?: string | null
          variation_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "reserva_produto_opcoes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "produto_variacao_opcoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reserva_produto_opcoes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "produto_variacao_opcoes_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reserva_produto_opcoes_reservation_product_id_fkey"
            columns: ["reservation_product_id"]
            isOneToOne: false
            referencedRelation: "reserva_produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reserva_produto_opcoes_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "produto_variacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reserva_produto_opcoes_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "produto_variacoes_public"
            referencedColumns: ["id"]
          },
        ]
      }
      reserva_produtos: {
        Row: {
          id: string
          product_id: string | null
          product_name: string
          reservation_id: string
          unit_price_cents: number
        }
        Insert: {
          id?: string
          product_id?: string | null
          product_name: string
          reservation_id: string
          unit_price_cents: number
        }
        Update: {
          id?: string
          product_id?: string | null
          product_name?: string
          reservation_id?: string
          unit_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "reserva_produtos_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reserva_produtos_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "produtos_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reserva_produtos_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservas"
            referencedColumns: ["id"]
          },
        ]
      }
      reservas: {
        Row: {
          canceled_at: string | null
          created_at: string
          customer_contact: string | null
          customer_name: string | null
          delivered_at: string | null
          event_id: string
          expires_at: string
          id: string
          paid_at: string | null
          personal_data_deleted_at: string | null
          receipt_saved: boolean
          session_id: string
          status: Database["public"]["Enums"]["reserva_status"]
          total_cents: number
          updated_at: string
        }
        Insert: {
          canceled_at?: string | null
          created_at?: string
          customer_contact?: string | null
          customer_name?: string | null
          delivered_at?: string | null
          event_id: string
          expires_at: string
          id?: string
          paid_at?: string | null
          personal_data_deleted_at?: string | null
          receipt_saved?: boolean
          session_id: string
          status?: Database["public"]["Enums"]["reserva_status"]
          total_cents: number
          updated_at?: string
        }
        Update: {
          canceled_at?: string | null
          created_at?: string
          customer_contact?: string | null
          customer_name?: string | null
          delivered_at?: string | null
          event_id?: string
          expires_at?: string
          id?: string
          paid_at?: string | null
          personal_data_deleted_at?: string | null
          receipt_saved?: boolean
          session_id?: string
          status?: Database["public"]["Enums"]["reserva_status"]
          total_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservas_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservas_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "eventos_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservas_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessoes_reserva"
            referencedColumns: ["id"]
          },
        ]
      }
      rifa_premios: {
        Row: {
          display_order: number
          drawn_at: string | null
          event_id: string
          id: string
          name: string
          photo: string
          winner_name: string | null
          winning_number: number | null
        }
        Insert: {
          display_order: number
          drawn_at?: string | null
          event_id: string
          id?: string
          name: string
          photo: string
          winner_name?: string | null
          winning_number?: number | null
        }
        Update: {
          display_order?: number
          drawn_at?: string | null
          event_id?: string
          id?: string
          name?: string
          photo?: string
          winner_name?: string | null
          winning_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rifa_premios_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "rifa_numeros_public"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "rifa_premios_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "rifas"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "rifa_premios_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "rifas_public"
            referencedColumns: ["event_id"]
          },
        ]
      }
      rifas: {
        Row: {
          event_id: string
          number_price_cents: number
          total_numbers: number
        }
        Insert: {
          event_id: string
          number_price_cents: number
          total_numbers: number
        }
        Update: {
          event_id?: string
          number_price_cents?: number
          total_numbers?: number
        }
        Relationships: [
          {
            foreignKeyName: "rifas_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rifas_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "eventos_public"
            referencedColumns: ["id"]
          },
        ]
      }
      sessoes_reserva: {
        Row: {
          created_at: string
          id: string
          last_attempt_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_attempt_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_attempt_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          adoption_form_url: string
          pix_city: string | null
          pix_key: string | null
          pix_receiver: string | null
          recurring_donation_urls: Json
          singleton: boolean
          updated_at: string
          volunteer_form_url: string | null
        }
        Insert: {
          adoption_form_url: string
          pix_city?: string | null
          pix_key?: string | null
          pix_receiver?: string | null
          recurring_donation_urls?: Json
          singleton?: boolean
          updated_at?: string
          volunteer_form_url?: string | null
        }
        Update: {
          adoption_form_url?: string
          pix_city?: string | null
          pix_key?: string | null
          pix_receiver?: string | null
          recurring_donation_urls?: Json
          singleton?: boolean
          updated_at?: string
          volunteer_form_url?: string | null
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
      eventos_public: {
        Row: {
          created_at: string | null
          description: string | null
          end_date: string | null
          fundraising_goal_cents: number | null
          id: string | null
          max_items_per_reservation: number | null
          name: string | null
          photos: string[] | null
          pix_city: string | null
          pix_key: string | null
          pix_receiver: string | null
          post_payment_instructions: string | null
          reservation_ttl_seconds: number | null
          start_date: string | null
          status: Database["public"]["Enums"]["evento_status"] | null
          type: Database["public"]["Enums"]["evento_tipo"] | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          fundraising_goal_cents?: number | null
          id?: string | null
          max_items_per_reservation?: number | null
          name?: string | null
          photos?: string[] | null
          pix_city?: string | null
          pix_key?: string | null
          pix_receiver?: string | null
          post_payment_instructions?: string | null
          reservation_ttl_seconds?: never
          start_date?: string | null
          status?: Database["public"]["Enums"]["evento_status"] | null
          type?: Database["public"]["Enums"]["evento_tipo"] | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          fundraising_goal_cents?: number | null
          id?: string | null
          max_items_per_reservation?: number | null
          name?: string | null
          photos?: string[] | null
          pix_city?: string | null
          pix_key?: string | null
          pix_receiver?: string | null
          post_payment_instructions?: string | null
          reservation_ttl_seconds?: never
          start_date?: string | null
          status?: Database["public"]["Enums"]["evento_status"] | null
          type?: Database["public"]["Enums"]["evento_tipo"] | null
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
      produto_variacao_opcoes_public: {
        Row: {
          display_order: number | null
          id: string | null
          name: string | null
          variation_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produto_variacao_opcoes_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "produto_variacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produto_variacao_opcoes_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "produto_variacoes_public"
            referencedColumns: ["id"]
          },
        ]
      }
      produto_variacoes_public: {
        Row: {
          display_order: number | null
          id: string | null
          name: string | null
          product_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produto_variacoes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produto_variacoes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "produtos_public"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos_public: {
        Row: {
          description: string | null
          discount_min_quantity: number | null
          discount_unit_price_cents: number | null
          display_order: number | null
          event_id: string | null
          id: string | null
          measurement_image: string | null
          measurement_table: Json | null
          name: string | null
          photos: string[] | null
          unit_price_cents: number | null
        }
        Relationships: [
          {
            foreignKeyName: "produtos_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "eventos_public"
            referencedColumns: ["id"]
          },
        ]
      }
      rifa_numeros_public: {
        Row: {
          available: boolean | null
          event_id: string | null
          number: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rifas_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rifas_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "eventos_public"
            referencedColumns: ["id"]
          },
        ]
      }
      rifa_premios_public: {
        Row: {
          display_order: number | null
          drawn_at: string | null
          event_id: string | null
          id: string | null
          name: string | null
          photo: string | null
          winner_name: string | null
          winning_number: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rifa_premios_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "rifa_numeros_public"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "rifa_premios_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "rifas"
            referencedColumns: ["event_id"]
          },
          {
            foreignKeyName: "rifa_premios_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "rifas_public"
            referencedColumns: ["event_id"]
          },
        ]
      }
      rifas_public: {
        Row: {
          event_id: string | null
          number_price_cents: number | null
          total_numbers: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rifas_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rifas_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "eventos_public"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings_public: {
        Row: {
          adoption_form_url: string | null
          pix_city: string | null
          pix_key: string | null
          pix_receiver: string | null
          recurring_donation_urls: Json | null
          volunteer_form_url: string | null
        }
        Insert: {
          adoption_form_url?: string | null
          pix_city?: string | null
          pix_key?: string | null
          pix_receiver?: string | null
          recurring_donation_urls?: Json | null
          volunteer_form_url?: string | null
        }
        Update: {
          adoption_form_url?: string | null
          pix_city?: string | null
          pix_key?: string | null
          pix_receiver?: string | null
          recurring_donation_urls?: Json | null
          volunteer_form_url?: string | null
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
      activate_event: {
        Args: {
          p_deleted_by?: string | null
          p_event_id: string
          p_export_email?: string | null
          p_export_sent_at?: string | null
          p_exported_event_id?: string | null
        }
        Returns: string | null
      }
      clean_expired_event_personal_data: { Args: never; Returns: number }
      create_reservation_session: { Args: never; Returns: string }
      current_request_ip_hash: { Args: never; Returns: string }
      delete_archived_event: {
        Args: { p_event_id: string; p_export_sent_at: string }
        Returns: undefined
      }
      draw_raffle_prize: {
        Args: { p_prize_id: string }
        Returns: {
          drawn_at: string
          prize_id: string
          winner_name: string
          winning_number: number
        }[]
      }
      enforce_reservation_ip_limit: {
        Args: {
          p_kind: Database["public"]["Enums"]["reserva_tentativa_tipo"]
          p_limit: number
          p_message: string
        }
        Returns: undefined
      }
      expire_event_reservations: { Args: never; Returns: number }
      is_admin: { Args: never; Returns: boolean }
      is_valid_measurement_table: { Args: { value: Json }; Returns: boolean }
      is_valid_reservation_contact: {
        Args: { value: string }
        Returns: boolean
      }
      normalize_reservation_contact: {
        Args: { value: string }
        Returns: string
      }
      reserve_product_items: {
        Args: {
          p_customer_contact: string
          p_customer_name: string
          p_event_id: string
          p_items: Json
          p_session_id: string
        }
        Returns: {
          expires_at: string
          pix_city: string
          pix_key: string
          pix_receiver: string
          post_payment_instructions: string
          reservation_id: string
          total_cents: number
        }[]
      }
      reserve_raffle_numbers: {
        Args: {
          p_customer_contact: string
          p_customer_name: string
          p_event_id: string
          p_numbers: number[]
          p_session_id: string
        }
        Returns: {
          expires_at: string
          pix_city: string
          pix_key: string
          pix_receiver: string
          post_payment_instructions: string
          reservation_id: string
          total_cents: number
        }[]
      }
      update_event_reservation: {
        Args: {
          p_customer_contact: string
          p_customer_name: string
          p_items: Json
          p_numbers: number[]
          p_receipt_saved: boolean
          p_reservation_id: string
          p_status: Database["public"]["Enums"]["reserva_status"]
        }
        Returns: undefined
      }
      valid_recurring_donation_urls: { Args: { urls: Json }; Returns: boolean }
    }
    Enums: {
      cae_genero: "macho" | "femea"
      cae_porte: "pequeno" | "medio" | "grande"
      cae_status: "disponivel" | "adotado" | "falecido"
      evento_status: "rascunho" | "ativo" | "encerrado" | "arquivado"
      evento_tipo: "rifa" | "produtos"
      reserva_status: "pendente" | "paga" | "cancelada" | "entregue"
      reserva_tentativa_tipo: "sessao" | "reserva"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      cae_genero: ["macho", "femea"],
      cae_porte: ["pequeno", "medio", "grande"],
      cae_status: ["disponivel", "adotado", "falecido"],
      evento_status: ["rascunho", "ativo", "encerrado", "arquivado"],
      evento_tipo: ["rifa", "produtos"],
      reserva_status: ["pendente", "paga", "cancelada", "entregue"],
      reserva_tentativa_tipo: ["sessao", "reserva"],
    },
  },
} as const
