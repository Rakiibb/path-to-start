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
      activity_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          created_at: string
          details: Json
          entity: string | null
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          details?: Json
          entity?: string | null
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          details?: Json
          entity?: string | null
          entity_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          class_name: string
          demo_mode: boolean
          feedback_enabled: boolean
          id: boolean
          min_password_length: number
          require_password_number: boolean
          require_password_symbol: boolean
          school_name: string
          sos_enabled: boolean
          updated_at: string
        }
        Insert: {
          class_name?: string
          demo_mode?: boolean
          feedback_enabled?: boolean
          id?: boolean
          min_password_length?: number
          require_password_number?: boolean
          require_password_symbol?: boolean
          school_name?: string
          sos_enabled?: boolean
          updated_at?: string
        }
        Update: {
          class_name?: string
          demo_mode?: boolean
          feedback_enabled?: boolean
          id?: boolean
          min_password_length?: number
          require_password_number?: boolean
          require_password_symbol?: boolean
          school_name?: string
          sos_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          amount: number | null
          category: string | null
          created_at: string
          created_by: string
          description: string | null
          feedback_type: string
          id: string
          status: Database["public"]["Enums"]["feedback_status"]
          target_captain_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          category?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          feedback_type?: string
          id?: string
          status?: Database["public"]["Enums"]["feedback_status"]
          target_captain_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          category?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          feedback_type?: string
          id?: string
          status?: Database["public"]["Enums"]["feedback_status"]
          target_captain_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_target_captain_id_fkey"
            columns: ["target_captain_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_votes: {
        Row: {
          created_at: string
          feedback_id: string
          id: string
          user_id: string
          vote: boolean
        }
        Insert: {
          created_at?: string
          feedback_id: string
          id?: string
          user_id: string
          vote: boolean
        }
        Update: {
          created_at?: string
          feedback_id?: string
          id?: string
          user_id?: string
          vote?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "feedback_votes_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "feedback"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          category: string
          created_at: string
          id: string
          is_demo: boolean
          is_read: boolean
          message: string | null
          title: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          is_demo?: boolean
          is_read?: boolean
          message?: string | null
          title: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_demo?: boolean
          is_read?: boolean
          message?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      school_rules: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_demo: boolean
          keywords: string[] | null
          rule_number: number | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_demo?: boolean
          keywords?: string[] | null
          rule_number?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_demo?: boolean
          keywords?: string[] | null
          rule_number?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      seat_students: {
        Row: {
          created_at: string
          created_by: string | null
          height_cm: number | null
          id: string
          name: string
          roll_number: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          height_cm?: number | null
          id?: string
          name: string
          roll_number?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          height_cm?: number | null
          id?: string
          name?: string
          roll_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seat_students_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sos_requests: {
        Row: {
          created_at: string
          id: string
          location: string | null
          message: string | null
          status: Database["public"]["Enums"]["sos_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          location?: string | null
          message?: string | null
          status?: Database["public"]["Enums"]["sos_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          location?: string | null
          message?: string | null
          status?: Database["public"]["Enums"]["sos_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sos_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_user_id: string | null
          created_at: string
          full_name: string
          height_cm: number | null
          id: string
          is_demo: boolean
          password_hash: string | null
          role: Database["public"]["Enums"]["app_role"]
          roll_number: string | null
          secret_code: string | null
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          full_name: string
          height_cm?: number | null
          id?: string
          is_demo?: boolean
          password_hash?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          roll_number?: string | null
          secret_code?: string | null
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          full_name?: string
          height_cm?: number | null
          id?: string
          is_demo?: boolean
          password_hash?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          roll_number?: string | null
          secret_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      captain_complaint_counts: {
        Args: never
        Returns: {
          captain_id: string
          complaint_count: number
        }[]
      }
      current_app_user_id: { Args: never; Returns: string }
      disable_demo_mode: { Args: never; Returns: undefined }
      enable_demo_mode: { Args: never; Returns: undefined }
      get_user_identities: {
        Args: { _ids: string[] }
        Returns: {
          id: string
          secret_code: string
        }[]
      }
      has_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      list_captains_safe: {
        Args: never
        Returns: {
          full_name: string
          id: string
        }[]
      }
      list_seat_roster: {
        Args: never
        Returns: {
          full_name: string
          height_cm: number
          id: string
          role: Database["public"]["Enums"]["app_role"]
          roll_number: string
          secret_code: string
        }[]
      }
      log_activity: {
        Args: {
          _action: string
          _details: Json
          _entity: string
          _entity_id: string
        }
        Returns: undefined
      }
      recompute_feedback_status: {
        Args: { _feedback_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "student" | "captain"
      feedback_status: "Pending" | "Verified" | "Rejected"
      sos_status: "Active" | "Resolved"
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
      app_role: ["student", "captain"],
      feedback_status: ["Pending", "Verified", "Rejected"],
      sos_status: ["Active", "Resolved"],
    },
  },
} as const
