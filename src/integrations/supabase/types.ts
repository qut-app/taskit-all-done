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
          approval_status: string | null
          budget: number | null
          clicks: number | null
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          image_url: string | null
          impressions: number | null
          is_active: boolean | null
          link_url: string | null
          location_targeting: string | null
          paystack_reference: string | null
          reject_reason: string | null
          spend_amount: number | null
          start_date: string | null
          target_audience: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          ad_type?: string | null
          approval_status?: string | null
          budget?: number | null
          clicks?: number | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          impressions?: number | null
          is_active?: boolean | null
          link_url?: string | null
          location_targeting?: string | null
          paystack_reference?: string | null
          reject_reason?: string | null
          spend_amount?: number | null
          start_date?: string | null
          target_audience?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          ad_type?: string | null
          approval_status?: string | null
          budget?: number | null
          clicks?: number | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          impressions?: number | null
          is_active?: boolean | null
          link_url?: string | null
          location_targeting?: string | null
          paystack_reference?: string | null
          reject_reason?: string | null
          spend_amount?: number | null
          start_date?: string | null
          target_audience?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ai_risk_logs: {
        Row: {
          ai_fraud_score: number
          created_at: string
          id: string
          reason_flags: Json
          risk_level: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          ai_fraud_score?: number
          created_at?: string
          id?: string
          reason_flags?: Json
          risk_level?: string
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          ai_fraud_score?: number
          created_at?: string
          id?: string
          reason_flags?: Json
          risk_level?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_risk_logs_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "escrow_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          category: string | null
          created_at: string
          event_type: string
          id: string
          location: string | null
          metadata: Json | null
          target_id: string | null
          user_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          event_type: string
          id?: string
          location?: string | null
          metadata?: Json | null
          target_id?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          event_type?: string
          id?: string
          location?: string | null
          metadata?: Json | null
          target_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      custom_categories: {
        Row: {
          created_at: string
          id: string
          is_approved: boolean | null
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_approved?: boolean | null
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_approved?: boolean | null
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      escrow_transactions: {
        Row: {
          amount: number
          application_id: string
          auto_release_at: string | null
          commission_rate: number
          created_at: string
          delivered_at: string | null
          id: string
          job_id: string
          payee_id: string
          payer_id: string
          paystack_access_code: string | null
          paystack_reference: string | null
          plan_type: string
          platform_commission: number
          pricing_plan_id: string | null
          provider_earnings: number
          release_eligible_at: string | null
          released_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          application_id: string
          auto_release_at?: string | null
          commission_rate?: number
          created_at?: string
          delivered_at?: string | null
          id?: string
          job_id: string
          payee_id: string
          payer_id: string
          paystack_access_code?: string | null
          paystack_reference?: string | null
          plan_type: string
          platform_commission?: number
          pricing_plan_id?: string | null
          provider_earnings?: number
          release_eligible_at?: string | null
          released_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          application_id?: string
          auto_release_at?: string | null
          commission_rate?: number
          created_at?: string
          delivered_at?: string | null
          id?: string
          job_id?: string
          payee_id?: string
          payer_id?: string
          paystack_access_code?: string | null
          paystack_reference?: string | null
          plan_type?: string
          platform_commission?: number
          pricing_plan_id?: string | null
          provider_earnings?: number
          release_eligible_at?: string | null
          released_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "escrow_transactions_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escrow_transactions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escrow_transactions_pricing_plan_id_fkey"
            columns: ["pricing_plan_id"]
            isOneToOne: false
            referencedRelation: "pricing_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      favourites: {
        Row: {
          created_at: string
          favourite_user_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          favourite_user_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          favourite_user_id?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          admin_notes: string | null
          attachment_url: string | null
          category: string
          created_at: string
          id: string
          message: string
          priority: string | null
          role: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          attachment_url?: string | null
          category: string
          created_at?: string
          id?: string
          message: string
          priority?: string | null
          role: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          attachment_url?: string | null
          category?: string
          created_at?: string
          id?: string
          message?: string
          priority?: string | null
          role?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fraud_behavior_weights: {
        Row: {
          behavior_key: string
          description: string | null
          historical_triggers: number
          id: string
          last_updated_at: string
          weight: number
        }
        Insert: {
          behavior_key: string
          description?: string | null
          historical_triggers?: number
          id?: string
          last_updated_at?: string
          weight?: number
        }
        Update: {
          behavior_key?: string
          description?: string | null
          historical_triggers?: number
          id?: string
          last_updated_at?: string
          weight?: number
        }
        Relationships: []
      }
      hire_requests: {
        Row: {
          created_at: string
          id: string
          job_id: string
          provider_id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          provider_id: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          provider_id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hire_requests_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
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
      messages: {
        Row: {
          content: string | null
          created_at: string
          file_name: string | null
          file_type: string | null
          file_url: string | null
          id: string
          is_read: boolean
          job_id: string
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_read?: boolean
          job_id: string
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_read?: boolean
          job_id?: string
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      negotiations: {
        Row: {
          application_id: string
          created_at: string
          id: string
          initiator_id: string
          job_id: string
          message: string | null
          original_price: number
          parent_negotiation_id: string | null
          pricing_plan_id: string | null
          proposed_price: number
          responder_id: string
          round: number
          status: string
          updated_at: string
        }
        Insert: {
          application_id: string
          created_at?: string
          id?: string
          initiator_id: string
          job_id: string
          message?: string | null
          original_price: number
          parent_negotiation_id?: string | null
          pricing_plan_id?: string | null
          proposed_price: number
          responder_id: string
          round?: number
          status?: string
          updated_at?: string
        }
        Update: {
          application_id?: string
          created_at?: string
          id?: string
          initiator_id?: string
          job_id?: string
          message?: string | null
          original_price?: number
          parent_negotiation_id?: string | null
          pricing_plan_id?: string | null
          proposed_price?: number
          responder_id?: string
          round?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "negotiations_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiations_parent_negotiation_id_fkey"
            columns: ["parent_negotiation_id"]
            isOneToOne: false
            referencedRelation: "negotiations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "negotiations_pricing_plan_id_fkey"
            columns: ["pricing_plan_id"]
            isOneToOne: false
            referencedRelation: "pricing_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_revenue: {
        Row: {
          commission_amount: number
          commission_rate: number
          created_at: string
          escrow_transaction_id: string | null
          id: string
          job_id: string
          month_year: string
          provider_id: string
        }
        Insert: {
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          escrow_transaction_id?: string | null
          id?: string
          job_id: string
          month_year: string
          provider_id: string
        }
        Update: {
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          escrow_transaction_id?: string | null
          id?: string
          job_id?: string
          month_year?: string
          provider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_revenue_escrow_transaction_id_fkey"
            columns: ["escrow_transaction_id"]
            isOneToOne: false
            referencedRelation: "escrow_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_revenue_summary: {
        Row: {
          id: string
          month_year: string
          total_commission: number
          total_transactions: number
          updated_at: string
        }
        Insert: {
          id?: string
          month_year: string
          total_commission?: number
          total_transactions?: number
          updated_at?: string
        }
        Update: {
          id?: string
          month_year?: string
          total_commission?: number
          total_transactions?: number
          updated_at?: string
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          content: string | null
          created_at: string
          id: string
          image_url: string | null
          updated_at: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          updated_at?: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          updated_at?: string
          user_id?: string
          video_url?: string | null
        }
        Relationships: []
      }
      pricing_plans: {
        Row: {
          application_id: string
          created_at: string
          delivery_time: string
          description: string
          id: string
          plan_type: string
          price: number
        }
        Insert: {
          application_id: string
          created_at?: string
          delivery_time: string
          description: string
          id?: string
          plan_type: string
          price: number
        }
        Update: {
          application_id?: string
          created_at?: string
          delivery_time?: string
          description?: string
          id?: string
          plan_type?: string
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "pricing_plans_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: string | null
          account_under_review: boolean | null
          active_role: string | null
          admin_warning: string | null
          admin_warning_at: string | null
          avatar_url: string | null
          cac_document_url: string | null
          cac_number: string | null
          company_address: string | null
          company_name: string | null
          company_plan: string | null
          company_plan_started_at: string | null
          company_trial_ends_at: string | null
          company_website: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          face_verification_url: string | null
          full_name: string
          gender: string | null
          id: string
          is_online: boolean | null
          is_role_switch_restricted: boolean | null
          is_suspended: boolean | null
          last_role_switch_at: string | null
          last_seen_at: string | null
          latitude: number | null
          location: string | null
          longitude: number | null
          national_id_number: string | null
          onboarding_completed: boolean | null
          phone: string | null
          referral_code: string | null
          requester_active_slots: number | null
          requester_completed_jobs: number | null
          requester_max_slots: number | null
          requester_rating: number | null
          requester_review_count: number | null
          social_media_links: Json | null
          updated_at: string
          user_id: string
          verification_status: Database["public"]["Enums"]["verification_status"]
          wallet_balance: number | null
          wallet_frozen: boolean | null
        }
        Insert: {
          account_type?: string | null
          account_under_review?: boolean | null
          active_role?: string | null
          admin_warning?: string | null
          admin_warning_at?: string | null
          avatar_url?: string | null
          cac_document_url?: string | null
          cac_number?: string | null
          company_address?: string | null
          company_name?: string | null
          company_plan?: string | null
          company_plan_started_at?: string | null
          company_trial_ends_at?: string | null
          company_website?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          face_verification_url?: string | null
          full_name: string
          gender?: string | null
          id?: string
          is_online?: boolean | null
          is_role_switch_restricted?: boolean | null
          is_suspended?: boolean | null
          last_role_switch_at?: string | null
          last_seen_at?: string | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          national_id_number?: string | null
          onboarding_completed?: boolean | null
          phone?: string | null
          referral_code?: string | null
          requester_active_slots?: number | null
          requester_completed_jobs?: number | null
          requester_max_slots?: number | null
          requester_rating?: number | null
          requester_review_count?: number | null
          social_media_links?: Json | null
          updated_at?: string
          user_id: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          wallet_balance?: number | null
          wallet_frozen?: boolean | null
        }
        Update: {
          account_type?: string | null
          account_under_review?: boolean | null
          active_role?: string | null
          admin_warning?: string | null
          admin_warning_at?: string | null
          avatar_url?: string | null
          cac_document_url?: string | null
          cac_number?: string | null
          company_address?: string | null
          company_name?: string | null
          company_plan?: string | null
          company_plan_started_at?: string | null
          company_trial_ends_at?: string | null
          company_website?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          face_verification_url?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          is_online?: boolean | null
          is_role_switch_restricted?: boolean | null
          is_suspended?: boolean | null
          last_role_switch_at?: string | null
          last_seen_at?: string | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          national_id_number?: string | null
          onboarding_completed?: boolean | null
          phone?: string | null
          referral_code?: string | null
          requester_active_slots?: number | null
          requester_completed_jobs?: number | null
          requester_max_slots?: number | null
          requester_rating?: number | null
          requester_review_count?: number | null
          social_media_links?: Json | null
          updated_at?: string
          user_id?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
          wallet_balance?: number | null
          wallet_frozen?: boolean | null
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
      referrals: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          referral_code: string
          referred_user_id: string | null
          referrer_id: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          referral_code: string
          referred_user_id?: string | null
          referrer_id: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          referral_code?: string
          referred_user_id?: string | null
          referrer_id?: string
          status?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          admin_action: string | null
          admin_notes: string | null
          created_at: string
          id: string
          reason: string
          reported_user_id: string
          reporter_id: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_action?: string | null
          admin_notes?: string | null
          created_at?: string
          id?: string
          reason: string
          reported_user_id: string
          reporter_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          admin_action?: string | null
          admin_notes?: string | null
          created_at?: string
          id?: string
          reason?: string
          reported_user_id?: string
          reporter_id?: string
          status?: string
          updated_at?: string
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
      role_switch_logs: {
        Row: {
          created_at: string
          device_type: string | null
          id: string
          ip_address: string | null
          new_role: string
          previous_role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_type?: string | null
          id?: string
          ip_address?: string | null
          new_role: string
          previous_role: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_type?: string | null
          id?: string
          ip_address?: string | null
          new_role?: string
          previous_role?: string
          user_id?: string
        }
        Relationships: []
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
      showcase_likes: {
        Row: {
          created_at: string
          id: string
          showcase_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          showcase_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          showcase_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "showcase_likes_showcase_id_fkey"
            columns: ["showcase_id"]
            isOneToOne: false
            referencedRelation: "work_showcases"
            referencedColumns: ["id"]
          },
        ]
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
      suspicious_flags: {
        Row: {
          created_at: string
          description: string | null
          flag_type: string
          id: string
          is_resolved: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          flag_type: string
          id?: string
          is_resolved?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          flag_type?: string
          id?: string
          is_resolved?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      transaction_risk_assessments: {
        Row: {
          auto_hold: boolean
          created_at: string
          escrow_transaction_id: string | null
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          risk_factors: Json
          risk_level: string
          user_id: string
        }
        Insert: {
          auto_hold?: boolean
          created_at?: string
          escrow_transaction_id?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_factors?: Json
          risk_level?: string
          user_id: string
        }
        Update: {
          auto_hold?: boolean
          created_at?: string
          escrow_transaction_id?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_factors?: Json
          risk_level?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_risk_assessments_escrow_transaction_id_fkey"
            columns: ["escrow_transaction_id"]
            isOneToOne: false
            referencedRelation: "escrow_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      trust_scores: {
        Row: {
          account_age_factor: number
          cancellation_penalty: number
          completed_jobs_factor: number
          created_at: string
          dispute_penalty: number
          id: string
          last_calculated_at: string
          on_time_factor: number
          report_penalty: number
          review_factor: number
          role_switch_penalty: number
          score: number
          user_id: string
        }
        Insert: {
          account_age_factor?: number
          cancellation_penalty?: number
          completed_jobs_factor?: number
          created_at?: string
          dispute_penalty?: number
          id?: string
          last_calculated_at?: string
          on_time_factor?: number
          report_penalty?: number
          review_factor?: number
          role_switch_penalty?: number
          score?: number
          user_id: string
        }
        Update: {
          account_age_factor?: number
          cancellation_penalty?: number
          completed_jobs_factor?: number
          created_at?: string
          dispute_penalty?: number
          id?: string
          last_calculated_at?: string
          on_time_factor?: number
          report_penalty?: number
          review_factor?: number
          role_switch_penalty?: number
          score?: number
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
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          escrow_transaction_id: string | null
          id: string
          reference: string | null
          source: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          escrow_transaction_id?: string | null
          id?: string
          reference?: string | null
          source: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          escrow_transaction_id?: string | null
          id?: string
          reference?: string | null
          source?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_escrow_transaction_id_fkey"
            columns: ["escrow_transaction_id"]
            isOneToOne: false
            referencedRelation: "escrow_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          available_balance: number
          created_at: string
          escrow_balance: number
          id: string
          pending_withdrawal: number
          updated_at: string
          user_id: string
        }
        Insert: {
          available_balance?: number
          created_at?: string
          escrow_balance?: number
          id?: string
          pending_withdrawal?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          available_balance?: number
          created_at?: string
          escrow_balance?: number
          id?: string
          pending_withdrawal?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          account_name: string
          account_number: string
          admin_notes: string | null
          amount: number
          bank_name: string
          created_at: string
          id: string
          processed_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          account_name: string
          account_number: string
          admin_notes?: string | null
          amount: number
          bank_name: string
          created_at?: string
          id?: string
          processed_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          account_name?: string
          account_number?: string
          admin_notes?: string | null
          amount?: number
          bank_name?: string
          created_at?: string
          id?: string
          processed_at?: string | null
          status?: string
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
      assess_transaction_risk: { Args: { _escrow_id: string }; Returns: string }
      calculate_ai_fraud_score: {
        Args: { _transaction_id?: string; _user_id: string }
        Returns: Json
      }
      calculate_trust_score: { Args: { _user_id: string }; Returns: number }
      create_verification_notification: {
        Args: {
          _message: string
          _title: string
          _type?: string
          _user_id: string
        }
        Returns: undefined
      }
      deduct_slots_on_accept: {
        Args: { _job_id: string; _provider_id: string; _requester_id: string }
        Returns: undefined
      }
      get_public_profiles: {
        Args: { user_ids: string[] }
        Returns: {
          account_type: string
          active_role: string
          avatar_url: string
          company_name: string
          full_name: string
          is_online: boolean
          last_seen_at: string
          location: string
          requester_completed_jobs: number
          requester_rating: number
          requester_review_count: number
          user_id: string
          verification_status: Database["public"]["Enums"]["verification_status"]
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hold_escrow_funds: { Args: { _escrow_id: string }; Returns: Json }
      is_user_verified: { Args: { _user_id: string }; Returns: boolean }
      process_escrow_release: { Args: { _escrow_id: string }; Returns: Json }
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
