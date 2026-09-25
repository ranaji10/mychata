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
      consent_log: {
        Row: {
          analytics: boolean
          anonymous_id: string | null
          created_at: string
          id: string
          user_id: string | null
          version: string
        }
        Insert: {
          analytics: boolean
          anonymous_id?: string | null
          created_at?: string
          id?: string
          user_id?: string | null
          version: string
        }
        Update: {
          analytics?: boolean
          anonymous_id?: string | null
          created_at?: string
          id?: string
          user_id?: string | null
          version?: string
        }
        Relationships: []
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
      guest_links: {
        Row: {
          created_at: string
          created_by_member_id: string | null
          expires_at: string | null
          id: string
          property_id: string
          revoked_at: string | null
          token: string
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          created_at?: string
          created_by_member_id?: string | null
          expires_at?: string | null
          id?: string
          property_id: string
          revoked_at?: string | null
          token?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          created_at?: string
          created_by_member_id?: string | null
          expires_at?: string | null
          id?: string
          property_id?: string
          revoked_at?: string | null
          token?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guest_links_created_by_member_id_fkey"
            columns: ["created_by_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_links_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_requests: {
        Row: {
          created_at: string
          end_date: string
          guest_email: string | null
          guest_link_id: string
          guest_name: string
          guest_phone: string | null
          guests: number
          id: string
          note: string | null
          property_id: string
          start_date: string
          status: string
        }
        Insert: {
          created_at?: string
          end_date: string
          guest_email?: string | null
          guest_link_id: string
          guest_name: string
          guest_phone?: string | null
          guests?: number
          id?: string
          note?: string | null
          property_id: string
          start_date: string
          status?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          guest_email?: string | null
          guest_link_id?: string
          guest_name?: string
          guest_phone?: string | null
          guests?: number
          id?: string
          note?: string | null
          property_id?: string
          start_date?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_requests_guest_link_id_fkey"
            columns: ["guest_link_id"]
            isOneToOne: false
            referencedRelation: "guest_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_requests_property_id_fkey"
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
      invitations: {
        Row: {
          accepted_by: string | null
          account_id: string
          created_at: string
          created_by_member_id: string | null
          email: string | null
          expires_at: string
          id: string
          property_id: string | null
          role: string
          status: string
          token: string
        }
        Insert: {
          accepted_by?: string | null
          account_id: string
          created_at?: string
          created_by_member_id?: string | null
          email?: string | null
          expires_at?: string
          id?: string
          property_id?: string | null
          role?: string
          status?: string
          token?: string
        }
        Update: {
          accepted_by?: string | null
          account_id?: string
          created_at?: string
          created_by_member_id?: string | null
          email?: string | null
          expires_at?: string
          id?: string
          property_id?: string | null
          role?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_created_by_member_id_fkey"
            columns: ["created_by_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_chunks: {
        Row: {
          content: string
          created_at: string
          embedding: string | null
          id: string
          property_id: string
          section_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          property_id: string
          section_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          property_id?: string
          section_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manual_chunks_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_chunks_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "manual_sections"
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
          user_id: string | null
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
          user_id?: string | null
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
          user_id?: string | null
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
      onboarding_answers: {
        Row: {
          answers: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      org_join_requests: {
        Row: {
          account_id: string
          created_at: string
          email: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          email: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          email?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_join_requests_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          member_id: string | null
          onboarding_completed_at: string | null
          phone: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          member_id?: string | null
          onboarding_completed_at?: string | null
          phone?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          member_id?: string | null
          onboarding_completed_at?: string | null
          phone?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          account_id: string
          address: string
          auto_confirm: boolean
          city: string | null
          created_at: string
          created_by_member_id: string | null
          handover_items: Json
          house_rules_text: string | null
          id: string
          name: string
          overlap_max_guests: number | null
          peak_seasons: string[]
          photo_url: string | null
          rooms: number | null
        }
        Insert: {
          account_id: string
          address?: string
          auto_confirm?: boolean
          city?: string | null
          created_at?: string
          created_by_member_id?: string | null
          handover_items?: Json
          house_rules_text?: string | null
          id?: string
          name: string
          overlap_max_guests?: number | null
          peak_seasons?: string[]
          photo_url?: string | null
          rooms?: number | null
        }
        Update: {
          account_id?: string
          address?: string
          auto_confirm?: boolean
          city?: string | null
          created_at?: string
          created_by_member_id?: string | null
          handover_items?: Json
          house_rules_text?: string | null
          id?: string
          name?: string
          overlap_max_guests?: number | null
          peak_seasons?: string[]
          photo_url?: string | null
          rooms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_created_by_member_id_fkey"
            columns: ["created_by_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      property_admins: {
        Row: {
          id: string
          member_id: string
          property_id: string
        }
        Insert: {
          id?: string
          member_id: string
          property_id: string
        }
        Update: {
          id?: string
          member_id?: string
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_admins_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_admins_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_photos: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean
          property_id: string
          storage_path: string
          uploaded_by_member_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          property_id: string
          storage_path: string
          uploaded_by_member_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          property_id?: string
          storage_path?: string
          uploaded_by_member_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_photos_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_photos_uploaded_by_member_id_fkey"
            columns: ["uploaded_by_member_id"]
            isOneToOne: false
            referencedRelation: "members"
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
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invitation: { Args: { _token: string }; Returns: string }
      add_property: {
        Args: {
          _address?: string
          _city?: string
          _name: string
          _rooms?: number
        }
        Returns: string
      }
      claim_initial_membership: { Args: never; Returns: string }
      create_account_onboarding: {
        Args: {
          _account_name: string
          _address?: string
          _city?: string
          _house_rules?: string
          _overlap_max_guests?: number
          _property_name: string
          _rooms?: number
          _seasons?: string[]
          _type: string
        }
        Returns: string
      }
      current_account_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_property_admin: { Args: { _property_id: string }; Returns: boolean }
      match_manual_chunks: {
        Args: { _count?: number; _embedding: string; _property_id: string }
        Returns: {
          content: string
          id: string
          section_id: string
          similarity: number
        }[]
      }
      public_booking_availability: {
        Args: { _property_id: string }
        Returns: {
          end_date: string
          id: string
          property_id: string
          start_date: string
          status: string
        }[]
      }
      public_guest_link: {
        Args: { _token: string }
        Returns: {
          id: string
          property_address: string
          property_id: string
          property_name: string
          valid_from: string
          valid_to: string
        }[]
      }
      public_institutional_property: {
        Args: never
        Returns: {
          address: string
          id: string
          name: string
        }[]
      }
      public_property_details: {
        Args: { _property_id: string }
        Returns: {
          address: string
          id: string
          name: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "member"
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
    Enums: {
      app_role: ["admin", "member"],
    },
  },
} as const
