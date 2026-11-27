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
      court_aliases: {
        Row: { alias: string; court_id: string; created_at: string; key: string }
        Insert: { alias: string; court_id: string; created_at?: string; key: string }
        Update: { alias?: string; court_id?: string; created_at?: string; key?: string }
        Relationships: [
          {
            foreignKeyName: "court_aliases_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
        ]
      }
      courts: {
        Row: { created_at: string; created_by: string | null; id: string; name: string }
        Insert: { created_at?: string; created_by?: string | null; id?: string; name: string }
        Update: { created_at?: string; created_by?: string | null; id?: string; name?: string }
        Relationships: [
          {
            foreignKeyName: "courts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      game_edits: {
        Row: {
          action: string
          actor_id: string | null
          after: Json | null
          before: Json
          court_name: string | null
          court_no: string | null
          created_at: string
          game_id: string
          id: string
          match_id: string | null
          match_type: string
          member_ids: string[]
          played_at: string
          played_time: string | null
        }
        Insert: { [_ in never]: never }
        Update: { [_ in never]: never }
        Relationships: []
      }
      game_players: {        Row: {
          game_id: string
          gender: string | null
          hand: string | null
          name: string
          ntrp: number | null
          slot: number
          team: number
          user_id: string | null
        }
        Insert: {
          game_id: string
          gender?: string | null
          hand?: string | null
          name: string
          ntrp?: number | null
          slot: number
          team: number
          user_id?: string | null
        }
        Update: {
          game_id?: string
          gender?: string | null
          hand?: string | null
          name?: string
          ntrp?: number | null
          slot?: number
          team?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_players_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_players_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          court_name: string | null
          court_no: string | null
          created_at: string
          created_by: string
          duration_minutes: number | null
          id: string
          locked_at: string | null
          match_id: string | null
          match_type: string
          notes: string | null
          played_at: string
          played_time: string | null
          sets: Json
          surface: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          court_name?: string | null
          court_no?: string | null
          created_at?: string
          created_by: string
          duration_minutes?: number | null
          id?: string
          locked_at?: string | null
          match_id?: string | null
          match_type: string
          notes?: string | null
          played_at: string
          played_time?: string | null
          sets: Json
          surface?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          court_name?: string | null
          court_no?: string | null
          created_at?: string
          created_by?: string
          duration_minutes?: number | null
          id?: string
          locked_at?: string | null
          match_id?: string | null
          match_type?: string
          notes?: string | null
          played_at?: string
          played_time?: string | null
          sets?: Json
          surface?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "games_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      match_applications: {
        Row: {
          created_at: string
          match_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          match_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          match_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_applications_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      match_guests: {
        Row: {
          added_by: string | null
          created_at: string
          gender: string | null
          hand: string | null
          id: string
          match_id: string
          name: string
          ntrp: number
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          gender?: string | null
          hand?: string | null
          id?: string
          match_id: string
          name: string
          ntrp: number
        }
        Update: {
          added_by?: string | null
          created_at?: string
          gender?: string | null
          hand?: string | null
          id?: string
          match_id?: string
          name?: string
          ntrp?: number
        }
        Relationships: [
          {
            foreignKeyName: "match_guests_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_guests_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      match_members: {
        Row: {
          joined_at: string
          match_id: string
          role: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          match_id: string
          role?: string
          user_id: string
        }
        Update: {
          joined_at?: string
          match_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_members_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      match_secrets: {
        Row: {
          invite_token: string
          match_id: string
          password_hash: string | null
        }
        Insert: {
          invite_token?: string
          match_id: string
          password_hash?: string | null
        }
        Update: {
          invite_token?: string
          match_id?: string
          password_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_secrets_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          closed_at: string | null
          confirmed_at: string | null
          court_name: string | null
          court_fee: number | null
          capacity: number
          court_no: string | null
          created_at: string
          duration_minutes: number
          host_id: string
          id: string
          is_listed: boolean
          match_type: string
          notes: string | null
          played_at: string
          played_time: string | null
          surface: string | null
          title: string | null
        }
        Insert: {
          closed_at?: string | null
          confirmed_at?: string | null
          court_name?: string | null
          court_fee?: number | null
          capacity?: number
          court_no?: string | null
          created_at?: string
          duration_minutes?: number
          host_id: string
          id?: string
          is_listed?: boolean
          match_type: string
          notes?: string | null
          played_at: string
          played_time?: string | null
          surface?: string | null
          title?: string | null
        }
        Update: {
          closed_at?: string | null
          confirmed_at?: string | null
          court_name?: string | null
          court_fee?: number | null
          capacity?: number
          court_no?: string | null
          created_at?: string
          duration_minutes?: number
          host_id?: string
          id?: string
          is_listed?: boolean
          match_type?: string
          notes?: string | null
          played_at?: string
          played_time?: string | null
          surface?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_user_id: string | null
          created_at: string
          dedupe_key: string | null
          game_id: string | null
          id: string
          match_id: string | null
          payload: Json
          read_at: string | null
          type: string
          user_id: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          dedupe_key?: string | null
          game_id?: string | null
          id?: string
          match_id?: string | null
          payload?: Json
          read_at?: string | null
          type: string
          user_id: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          dedupe_key?: string | null
          game_id?: string | null
          id?: string
          match_id?: string | null
          payload?: Json
          read_at?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      rpc_rate_limits: {
        Row: {
          bucket: string
          hits: number
          subject: string
          window_start: string
        }
        Insert: {
          bucket: string
          hits?: number
          subject: string
          window_start?: string
        }
        Update: {
          bucket?: string
          hits?: number
          subject?: string
          window_start?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          deleted_at: string | null
          dominant_hand: string | null
          email: string
          gender: string | null
          id: string
          is_guest: boolean
          login_id: string | null
          name: string
          nickname: string
          ntrp: number | null
          personal_ntrp: number | null
          phone: string | null
          profile_image: string | null
          racket_brand: string | null
          racket_model: string | null
          role: string
          stats_hidden: boolean
          tennis_start_date: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          dominant_hand?: string | null
          email: string
          gender?: string | null
          id: string
          is_guest?: boolean
          login_id?: string | null
          name: string
          nickname: string
          ntrp?: number | null
          personal_ntrp?: number | null
          phone?: string | null
          profile_image?: string | null
          racket_brand?: string | null
          racket_model?: string | null
          role?: string
          stats_hidden?: boolean
          tennis_start_date?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          dominant_hand?: string | null
          email?: string
          gender?: string | null
          id?: string
          is_guest?: boolean
          login_id?: string | null
          name?: string
          nickname?: string
          ntrp?: number | null
          personal_ntrp?: number | null
          phone?: string | null
          profile_image?: string | null
          racket_brand?: string | null
          racket_model?: string | null
          role?: string
          stats_hidden?: boolean
          tennis_start_date?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      find_login_id: {
        Args: { p_email: string; p_name: string }
        Returns: Json
      }
      is_active_member: { Args: { p_user_id: string }; Returns: boolean }
      is_email_taken: { Args: { p_email: string }; Returns: boolean }
      is_login_id_taken: { Args: { p_login_id: string }; Returns: boolean }
      is_nickname_taken: {
        Args: { p_exclude_user_id?: string; p_nickname: string }
        Returns: boolean
      }
      add_match_guest: {
        Args: { p_match_id: string; p_name: string; p_ntrp: number; p_gender?: string | null; p_hand?: string | null }
        Returns: string
      }
      remove_match_guest: { Args: { p_guest_id: string }; Returns: undefined }
      join_match_as_guest: {
        Args: { p_token: string; p_name: string; p_ntrp: number; p_gender?: string | null; p_hand?: string | null }
        Returns: Json
      }
      get_my_account: {
        Args: never
        Returns: { email: string; phone: string | null; login_id: string | null }[]
      }
      get_invited_match: { Args: { p_token: string; p_guest_id?: string }; Returns: Json }
      leave_match_as_guest: { Args: { p_token: string; p_guest_id: string }; Returns: undefined }
      add_match_members: { Args: { p_match_id: string; p_user_ids: string[] }; Returns: number }
      admin_court_overview: { Args: never; Returns: Json }
      merge_court_names: { Args: { p_official: string; p_names: string[] }; Returns: Json }
      rename_court: { Args: { p_court_id: string; p_name: string }; Returns: Json }
      remove_court_alias: { Args: { p_key: string }; Returns: undefined }
      apply_match: { Args: { p_match_id: string }; Returns: undefined }
      can_see_game: { Args: { p_game_id: string }; Returns: boolean }
      can_see_match: { Args: { p_match_id: string }; Returns: boolean }
      cancel_application: { Args: { p_match_id: string }; Returns: undefined }
      create_match: {
        Args: {
          p_court_name: string
          p_court_no?: string | null
          p_court_fee?: number | null
          p_capacity?: number | null
          p_duration_minutes: number | null
          p_invitee_ids?: string[]
          p_listed: boolean
          p_match_type: string
          p_notes: string | null
          p_password?: string | null
          p_played_at: string
          p_played_time: string | null
          p_surface: string | null
          p_title: string
        }
        Returns: string
      }
      decide_application: { Args: { p_approve: boolean; p_match_id: string; p_user_id: string }; Returns: undefined }
      delete_game: { Args: { p_game_id: string }; Returns: string[] }
      delete_match: { Args: { p_match_id: string }; Returns: undefined }
      get_match_invite_token: { Args: { p_match_id: string }; Returns: string }
      get_member_rankings: {
        Args: { p_kind?: string; p_limit?: number; p_min_games?: number }
        Returns: {
          games: number
          name: string
          nickname: string
          profile_image: string | null
          rating: number | null
          user_id: string
          wins: number
        }[]
      }
      get_user_games: { Args: { p_user_id: string }; Returns: Json }
      is_match_member: { Args: { p_match_id: string }; Returns: boolean }
      join_match: { Args: { p_match_id?: string; p_password?: string; p_token?: string }; Returns: Json }
      leave_match: { Args: { p_match_id: string }; Returns: undefined }
      remove_match_member: { Args: { p_match_id: string; p_user_id: string }; Returns: undefined }
      record_game: {
        Args: {
          p_court_name: string | null
          p_court_no: string | null
          p_duration_minutes: number | null
          p_games: Json
          p_match_type: string
          p_notes: string | null
          p_played_at: string | null
          p_played_time: string | null
          p_surface: string | null
        }
        Returns: Json
      }
      save_match_games: { Args: { p_match_id: string; p_upserts: Json; p_deletes?: string[] }; Returns: Json }
      search_court_names: {
        Args: { p_query?: string; p_limit?: number }
        Returns: { name: string; uses: number; official: boolean; via: string | null }[]
      }
      set_match_password: { Args: { p_match_id: string; p_password: string }; Returns: undefined }
      set_game_locked: { Args: { p_game_id: string; p_locked: boolean }; Returns: undefined }
      set_match_closed: { Args: { p_closed: boolean; p_match_id: string }; Returns: undefined }
      set_match_confirmed: { Args: { p_confirmed: boolean; p_match_id: string }; Returns: undefined }
      update_game: {
        Args: {
          p_court_name?: string | null
          p_court_no?: string | null
          p_duration_minutes?: number | null
          p_game_id: string
          p_notes: string | null
          p_played_at?: string | null
          p_played_time?: string | null
          p_sets: Json
          p_surface?: string | null
        }
        Returns: string[]
      }
      update_match: {
        Args: {
          p_court_name: string
          p_court_no?: string | null
          p_court_fee?: number | null
          p_capacity?: number | null
          p_duration_minutes: number | null
          p_listed: boolean
          p_match_id: string
          p_match_type: string
          p_notes: string | null
          p_password?: string | null
          p_played_at: string
          p_played_time: string | null
          p_surface: string | null
          p_title: string
        }
        Returns: undefined
      }
      mark_notifications_read: { Args: { p_ids?: string[] }; Returns: number }
      resolve_login_email: { Args: { p_login_id: string }; Returns: string }
      throttle_hit: {
        Args: { p_bucket: string; p_limit: number; p_window: string }
        Returns: undefined
      }
      throttle_subject: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
