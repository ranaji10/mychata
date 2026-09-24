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
      accounts: {
        Row: {
          created_at: string
          id: string
          name: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          type?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          created_at: string
          end_date: string
          guests: number
          id: string
          note: string | null
          property_id: string
          requester_member_id: string | null
          requester_name: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date: string
          guests?: number
          id?: string
          note?: string | null
          property_id: string
          requester_member_id?: string | null
          requester_name: string
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          guests?: number
          id?: string
          note?: string | null
          property_id?: string
          requester_member_id?: string | null
          requester_name?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_requester_member_id_fkey"
            columns: ["requester_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category: string
          created_at: string
          expiry_date: string | null
          file_url: string | null
          id: string
          issue_date: string | null
          linked_task_id: string | null
          notes: string | null
          property_id: string
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          category?: string
          created_at?: string
          expiry_date?: string | null
          file_url?: string | null
          id?: string
          issue_date?: string | null
          linked_task_id?: string | null
          notes?: string | null
          property_id: string
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          category?: string
          created_at?: string
          expiry_date?: string | null
          file_url?: string | null
          id?: string
          issue_date?: string | null
          linked_task_id?: string | null
          notes?: string | null
          property_id?: string
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_linked_task_id_fkey"
            columns: ["linked_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_splits: {
        Row: {
          amount_owed: number
          expense_id: string
          id: string
          member_id: string
          paid_back: boolean
          paid_back_confirmed_by: string | null
        }
        Insert: {
          amount_owed: number
          expense_id: string
          id?: string
          member_id: string
          paid_back?: boolean
          paid_back_confirmed_by?: string | null
        }
        Update: {
          amount_owed?: number
          expense_id?: string
          id?: string
          member_id?: string
          paid_back?: boolean
          paid_back_confirmed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_splits_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_splits_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_splits_paid_back_confirmed_by_fkey"
            columns: ["paid_back_confirmed_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          date: string | null
          description: string | null
          id: string
          paid_by_member_id: string | null
          property_id: string
          receipt_photo_url: string | null
          split_method: string
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string
          date?: string | null
          description?: string | null
          id?: string
          paid_by_member_id?: string | null
          property_id: string
          receipt_photo_url?: string | null
          split_method?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          date?: string | null
          description?: string | null
          id?: string
          paid_by_member_id?: string | null
          property_id?: string
          receipt_photo_url?: string | null
          split_method?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_paid_by_member_id_fkey"
            columns: ["paid_by_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      handover_issues: {
        Row: {
          acknowledged_at: string | null
          created_at: string
          handover_id: string | null
          id: string
          property_id: string
          task_id: string | null
          title: string
        }
        Insert: {
          acknowledged_at?: string | null
          created_at?: string
          handover_id?: string | null
          id?: string
          property_id: string
          task_id?: string | null
          title: string
        }
        Update: {
          acknowledged_at?: string | null
          created_at?: string
          handover_id?: string | null
          id?: string
          property_id?: string
          task_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "handover_issues_handover_id_fkey"
            columns: ["handover_id"]
            isOneToOne: false
            referencedRelation: "handovers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "handover_issues_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "handover_issues_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      handovers: {
        Row: {
          booking_id: string | null
          checklist_state: Json
          id: string
          member_id: string | null
          note: string | null
          photo_url: string | null
          property_id: string
          submitted_at: string
          updated_at: string
        }
        Insert: {
          booking_id?: string | null
          checklist_state?: Json
          id?: string
          member_id?: string | null
          note?: string | null
          photo_url?: string | null
          property_id: string
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          booking_id?: string | null
          checklist_state?: Json
          id?: string
          member_id?: string | null
          note?: string | null
          photo_url?: string | null
          property_id?: string
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "handovers_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "handovers_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "handovers_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      institutional_requests: {
        Row: {
          affiliation: string | null
          conflict_note: string | null
          created_at: string
          decline_reason: string | null
          end_date: string
          guests: number
          has_conflict: boolean
          id: string
          note: string | null
          property_id: string
          requester_email: string
          requester_name: string
          requester_phone: string | null
          start_date: string
          status: string
        }
        Insert: {
          affiliation?: string | null
          conflict_note?: string | null
          created_at?: string
          decline_reason?: string | null
          end_date: string
          guests?: number
          has_conflict?: boolean
          id?: string
          note?: string | null
          property_id: string
          requester_email: string
          requester_name: string
          requester_phone?: string | null
          start_date: string
          status?: string
        }
        Update: {
          affiliation?: string | null
          conflict_note?: string | null
          created_at?: string
          decline_reason?: string | null
          end_date?: string
          guests?: number
          has_conflict?: boolean
          id?: string
          note?: string | null
          property_id?: string
          requester_email?: string
          requester_name?: string
          requester_phone?: string | null
          start_date?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "institutional_requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_feedback: {
        Row: {
          created_at: string
          id: string
          note: string | null
          resolved_at: string | null
          section_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          resolved_at?: string | null
          section_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          resolved_at?: string | null
          section_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_feedback_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "manual_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_sections: {
        Row: {
          category: string
          content_cs: string
          content_en: string
          created_at: string
          display_order: number
          id: string
          photo_url: string | null
          property_id: string
          title_cs: string
          title_en: string
          updated_at: string
          visibility: string
        }
        Insert: {
          category?: string
          content_cs?: string
          content_en?: string
          created_at?: string
          display_order?: number
          id?: string
          photo_url?: string | null
          property_id: string
          title_cs: string
          title_en: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          category?: string
          content_cs?: string
          content_en?: string
          created_at?: string
          display_order?: number
          id?: string
          photo_url?: string | null
          property_id?: string
          title_cs?: string
          title_en?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_sections_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          account_id: string
          branch: string
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
          role: string
        }
        Insert: {
          account_id: string
          branch?: string
          created_at?: string
          email?: string
          id?: string
          name: string
          phone?: string | null
          role?: string
        }
        Update: {
          account_id?: string
          branch?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "members_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          account_id: string
          address: string
          auto_confirm: boolean
          created_at: string
          handover_items: Json
          house_rules_text: string | null
          id: string
          name: string
          photo_url: string | null
        }
        Insert: {
          account_id: string
          address?: string
          auto_confirm?: boolean
          created_at?: string
          handover_items?: Json
          house_rules_text?: string | null
          id?: string
          name: string
          photo_url?: string | null
        }
        Update: {
          account_id?: string
          address?: string
          auto_confirm?: boolean
          created_at?: string
          handover_items?: Json
          house_rules_text?: string | null
          id?: string
          name?: string
          photo_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_member_id: string | null
          category: string
          created_at: string
          created_by: string
          description_cs: string | null
          description_en: string | null
          done_note: string | null
          due_date: string | null
          id: string
          photo_url: string | null
          property_id: string
          source_language: string
          status: string
          title: string
          title_cs: string | null
          title_en: string | null
          updated_at: string
          urgency: string
        }
        Insert: {
          assignee_member_id?: string | null
          category?: string
          created_at?: string
          created_by?: string
          description_cs?: string | null
          description_en?: string | null
          done_note?: string | null
          due_date?: string | null
          id?: string
          photo_url?: string | null
          property_id: string
          source_language?: string
          status?: string
          title: string
          title_cs?: string | null
          title_en?: string | null
          updated_at?: string
          urgency?: string
        }
        Update: {
          assignee_member_id?: string | null
          category?: string
          created_at?: string
          created_by?: string
          description_cs?: string | null
          description_en?: string | null
          done_note?: string | null
          due_date?: string | null
          id?: string
          photo_url?: string | null
          property_id?: string
          source_language?: string
          status?: string
          title?: string
          title_cs?: string | null
          title_en?: string | null
          updated_at?: string
          urgency?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_member_id_fkey"
            columns: ["assignee_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
