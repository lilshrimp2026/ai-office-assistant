export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          role: 'user' | 'admin' | 'premium'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'user' | 'admin' | 'premium'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'user' | 'admin' | 'premium'
          created_at?: string
          updated_at?: string
        }
      }
      subscription_plans: {
        Row: {
          id: string
          name: string
          description: string | null
          price_monthly: number
          price_yearly: number
          features: Json
          ai_quota_daily: number
          storage_quota_mb: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          price_monthly?: number
          price_yearly?: number
          features?: Json
          ai_quota_daily?: number
          storage_quota_mb?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          price_monthly?: number
          price_yearly?: number
          features?: Json
          ai_quota_daily?: number
          storage_quota_mb?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          plan_id: string
          status: 'active' | 'cancelled' | 'expired' | 'trial'
          stripe_subscription_id: string | null
          current_period_start: string | null
          current_period_end: string | null
          cancel_at_period_end: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plan_id: string
          status?: 'active' | 'cancelled' | 'expired' | 'trial'
          stripe_subscription_id?: string | null
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          plan_id?: string
          status?: 'active' | 'cancelled' | 'expired' | 'trial'
          stripe_subscription_id?: string | null
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      usage_quotas: {
        Row: {
          id: string
          user_id: string
          date: string
          ai_requests: number
          storage_used_mb: number
        }
        Insert: {
          id?: string
          user_id: string
          date?: string
          ai_requests?: number
          storage_used_mb?: number
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          ai_requests?: number
          storage_used_mb?: number
        }
      }
      conversations: {
        Row: {
          id: string
          user_id: string
          title: string
          model_used: string
          token_count: number
          is_archived: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          model_used?: string
          token_count?: number
          is_archived?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          model_used?: string
          token_count?: number
          is_archived?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          token_count: number
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          token_count?: number
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          role?: 'user' | 'assistant' | 'system'
          content?: string
          token_count?: number
          metadata?: Json
          created_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          user_id: string
          title: string
          content: string | null
          file_path: string | null
          file_size: number
          file_type: string | null
          word_count: number
          is_public: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          content?: string | null
          file_path?: string | null
          file_size?: number
          file_type?: string | null
          word_count?: number
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          content?: string | null
          file_path?: string | null
          file_size?: number
          file_type?: string | null
          word_count?: number
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      document_tags: {
        Row: {
          id: string
          document_id: string
          tag: string
          created_at: string
        }
        Insert: {
          id?: string
          document_id: string
          tag: string
          created_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          tag?: string
          created_at?: string
        }
      }
      ai_templates: {
        Row: {
          id: string
          name: string
          description: string | null
          category: string
          prompt_template: string
          model_preference: string
          is_public: boolean
          created_by: string | null
          usage_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          category?: string
          prompt_template: string
          model_preference?: string
          is_public?: boolean
          created_by?: string | null
          usage_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          category?: string
          prompt_template?: string
          model_preference?: string
          is_public?: boolean
          created_by?: string | null
          usage_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      ai_tasks: {
        Row: {
          id: string
          user_id: string
          template_id: string | null
          task_type: string
          input: string | null
          output: string | null
          model_used: string
          token_input: number
          token_output: number
          status: 'pending' | 'processing' | 'completed' | 'failed'
          error_message: string | null
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          template_id?: string | null
          task_type: string
          input?: string | null
          output?: string | null
          model_used: string
          token_input?: number
          token_output?: number
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          error_message?: string | null
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          template_id?: string | null
          task_type?: string
          input?: string | null
          output?: string | null
          model_used?: string
          token_input?: number
          token_output?: number
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          error_message?: string | null
          created_at?: string
          completed_at?: string | null
        }
      }
      api_keys: {
        Row: {
          id: string
          user_id: string
          name: string
          key_hash: string
          key_prefix: string
          permissions: Json
          expires_at: string | null
          last_used_at: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          key_hash: string
          key_prefix: string
          permissions?: Json
          expires_at?: string | null
          last_used_at?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          key_hash?: string
          key_prefix?: string
          permissions?: Json
          expires_at?: string | null
          last_used_at?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
    }
    Views: {}
    Functions: {
      get_user_subscription: {
        Args: { user_uuid: string }
        Returns: {
          plan_name: string
          status: string
          ai_quota_daily: number
          storage_quota_mb: number
          current_period_end: string
        }[]
      }
      check_user_quota: {
        Args: { user_uuid: string; quota_type: string }
        Returns: boolean
      }
    }
  }
}
