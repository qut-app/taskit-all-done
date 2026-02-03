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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ads: {
        Row: {
          ad_type: string | null
          created_at: string
          end_date: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          link_url: string | null
          start_date: string | null
          title: string
        }
        Insert: {
          ad_type?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          link_url?: string | null
          start_date?: string | null
          title: string
        }
        Update: {
          ad_type?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          link_url?: string | null
          start_date?: string | null
          title?: string
        }
        Relationships: []
      }
      job_applications: {
        Row: {
          created_at: string
          id: string
          job_id: string
          message: string | null
          provider_id: string
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          message?: string | null
          provider_id: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          message?: string | null
          provider_id?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          assigned_provider_count: number | null
          budget: number | null
          category: string
          created_at: string
          description: string | null
          expected_delivery_time: string
          id: string
          latitude: number | null
          location: string | null
          longitude: number | null
          max_providers: number | null
          requester_id: string
          service_mode: Database["public"]["Enums"]["service_mode"]
          status: Database["public"]["Enums"]["job_status"] | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_provider_count?: number | null
          budget?: number | null
          category: string
          created_at?: string
          description?: string | null
          expected_delivery_time: string
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          max_providers?: number | null
          requester_id: string
          service_mode: Database["public"]["Enums"]["service_mode"]
          status?: Database["public"]["Enums"]["job_status"] | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_provider_count?: number | null
          budget?: number | null
          category?: string
          created_at?: string
          description?: string | null
          expected_delivery_time?: string
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          max_providers?: number | null
          requester_id?: string
          service_mode?: Database["public"]["Enums"]["service_mode"]
          status?: Database["public"]["Enums"]["job_status"] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active_role: string | null
          avatar_url: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          face_verification_url: string | null
          full_name: string
          id: string
          latitude: number | null
          location: string | null
          longitude: number | null
          national_id_number: string | null
          phone: string | null
          updated_at: string
          user_id: string
          verification_status: Database["public"]["Enums"]["verification_status"]
        }
        Insert: {
          active_role?: string | null
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          face_verification_url?: string | null
          full_name: string
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          national_id_number?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Update: {
          active_role?: string | null
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          face_verification_url?: string | null
          full_name?: string
          id?: string
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          national_id_number?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Relationships: []
      }
      provider_profiles: {
        Row: {
          active_job_slots: number | null
          created_at: string
          delivery_time: string | null
          id: string
          is_premium: boolean | null
          is_recommended: boolean | null
          max_job_slots: number | null
          on_time_delivery_score: number | null
          rating: number | null
          review_count: number | null
          service_categories: string[] | null
          service_description: string | null
          service_mode: Database["public"]["Enums"]["service_mode"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active_job_slots?: number | null
          created_at?: string
          delivery_time?: string | null
          id?: string
          is_premium?: boolean | null
          is_recommended?: boolean | null
          max_job_slots?: number | null
          on_time_delivery_score?: number | null
          rating?: number | null
          review_count?: number | null
          service_categories?: string[] | null
          service_description?: string | null
          service_mode?: Database["public"]["Enums"]["service_mode"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active_job_slots?: number | null
          created_at?: string
          delivery_time?: string | null
          id?: string
          is_premium?: boolean | null
          is_recommended?: boolean | null
          max_job_slots?: number | null
          on_time_delivery_score?: number | null
          rating?: number | null
          review_count?: number | null
          service_categories?: string[] | null
          service_description?: string | null
          service_mode?: Database["public"]["Enums"]["service_mode"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          communication_rating: number | null
          created_at: string
          delivery_rating: number | null
          id: string
          is_late_delivery: boolean | null
          job_id: string
          overall_rating: number | null
          quality_rating: number | null
          reviewee_id: string
          reviewer_id: string
        }
        Insert: {
          comment?: string | null
          communication_rating?: number | null
          created_at?: string
          delivery_rating?: number | null
          id?: string
          is_late_delivery?: boolean | null
          job_id: string
          overall_rating?: number | null
          quality_rating?: number | null
          reviewee_id: string
          reviewer_id: string
        }
        Update: {
          comment?: string | null
          communication_rating?: number | null
          created_at?: string
          delivery_rating?: number | null
          id?: string
          is_late_delivery?: boolean | null
          job_id?: string
          overall_rating?: number | null
          quality_rating?: number | null
          reviewee_id?: string
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      service_categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount: number
          created_at: string
          expires_at: string
          id: string
          started_at: string
          status: string | null
          subscription_type: Database["public"]["Enums"]["subscription_type"]
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          expires_at: string
          id?: string
          started_at?: string
          status?: string | null
          subscription_type: Database["public"]["Enums"]["subscription_type"]
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          expires_at?: string
          id?: string
          started_at?: string
          status?: string | null
          subscription_type?: Database["public"]["Enums"]["subscription_type"]
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      work_showcases: {
        Row: {
          caption: string | null
          created_at: string
          display_order: number | null
          id: string
          is_approved: boolean | null
          media_type: string
          media_url: string
          provider_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          is_approved?: boolean | null
          media_type: string
          media_url: string
          provider_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          is_approved?: boolean | null
          media_type?: string
          media_url?: string
          provider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_showcases_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_user_verified: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
      job_status:
        | "open"
        | "assigned"
        | "in_progress"
        | "completed"
        | "cancelled"
      service_mode: "online" | "offline" | "both"
      subscription_type: "requester_unlimited" | "provider_slot_boost"
      verification_status: "unverified" | "pending" | "verified"
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
      app_role: ["admin", "user"],
      job_status: ["open", "assigned", "in_progress", "completed", "cancelled"],
      service_mode: ["online", "offline", "both"],
      subscription_type: ["requester_unlimited", "provider_slot_boost"],
      verification_status: ["unverified", "pending", "verified"],
    },
  },
} as const
