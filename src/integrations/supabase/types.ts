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
      admission_activity: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          admission_id: string
          created_at: string
          detail: Json
          id: string
          note: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          admission_id: string
          created_at?: string
          detail?: Json
          id?: string
          note?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          admission_id?: string
          created_at?: string
          detail?: Json
          id?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admission_activity_admission_id_fkey"
            columns: ["admission_id"]
            isOneToOne: false
            referencedRelation: "admissions"
            referencedColumns: ["id"]
          },
        ]
      }
      admissions: {
        Row: {
          access_token: string
          address: string | null
          address_line: string | null
          course_id: string | null
          created_at: string
          date_of_birth: string | null
          district: string | null
          division: string | null
          document_keys: Json
          education_board: string | null
          education_group: string | null
          education_level: string | null
          education_result: string | null
          email: string
          full_name: string
          gender: string | null
          id: string
          institution: string | null
          motivation: string | null
          passing_year: string | null
          phone: string
          phone_normalized: string | null
          post_office: string | null
          postal_code: string | null
          review_note: string | null
          reviewed_at: string | null
          session: string | null
          status: Database["public"]["Enums"]["admission_status"]
          upazila: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string
          address?: string | null
          address_line?: string | null
          course_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          district?: string | null
          division?: string | null
          document_keys?: Json
          education_board?: string | null
          education_group?: string | null
          education_level?: string | null
          education_result?: string | null
          email: string
          full_name: string
          gender?: string | null
          id?: string
          institution?: string | null
          motivation?: string | null
          passing_year?: string | null
          phone: string
          phone_normalized?: string | null
          post_office?: string | null
          postal_code?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          session?: string | null
          status?: Database["public"]["Enums"]["admission_status"]
          upazila?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          address?: string | null
          address_line?: string | null
          course_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          district?: string | null
          division?: string | null
          document_keys?: Json
          education_board?: string | null
          education_group?: string | null
          education_level?: string | null
          education_result?: string | null
          email?: string
          full_name?: string
          gender?: string | null
          id?: string
          institution?: string | null
          motivation?: string | null
          passing_year?: string | null
          phone?: string
          phone_normalized?: string | null
          post_office?: string | null
          postal_code?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          session?: string | null
          status?: Database["public"]["Enums"]["admission_status"]
          upazila?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admissions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          enrollment_id: string
          id: string
          marked_at: string
          marked_by: string | null
          reminded_at: string | null
          session_id: string
          status: string
        }
        Insert: {
          enrollment_id: string
          id?: string
          marked_at?: string
          marked_by?: string | null
          reminded_at?: string | null
          session_id: string
          status: string
        }
        Update: {
          enrollment_id?: string
          id?: string
          marked_at?: string
          marked_by?: string | null
          reminded_at?: string | null
          session_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "class_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      batches: {
        Row: {
          class_days: string[]
          class_time: string | null
          course_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          start_date: string | null
        }
        Insert: {
          class_days?: string[]
          class_time?: string | null
          course_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          start_date?: string | null
        }
        Update: {
          class_days?: string[]
          class_time?: string | null
          course_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batches_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          course_id: string | null
          created_at: string
          enrollment_id: string | null
          id: string
          is_revoked: boolean
          issued_at: string
          pdf_key: string | null
          serial: string
          student_id: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          enrollment_id?: string | null
          id?: string
          is_revoked?: boolean
          issued_at?: string
          pdf_key?: string | null
          serial?: string
          student_id: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          enrollment_id?: string | null
          id?: string
          is_revoked?: boolean
          issued_at?: string
          pdf_key?: string | null
          serial?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: true
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      class_sessions: {
        Row: {
          batch_id: string
          created_at: string
          id: string
          session_date: string
          topic: string | null
        }
        Insert: {
          batch_id: string
          created_at?: string
          id?: string
          session_date: string
          topic?: string | null
        }
        Update: {
          batch_id?: string
          created_at?: string
          id?: string
          session_date?: string
          topic?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_sessions_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          is_read: boolean
          message: string
          name: string
          phone: string | null
          subject: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_read?: boolean
          message: string
          name: string
          phone?: string | null
          subject?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_read?: boolean
          message?: string
          name?: string
          phone?: string | null
          subject?: string | null
        }
        Relationships: []
      }
      courses: {
        Row: {
          category: string | null
          cover_image_key: string | null
          created_at: string
          description: string | null
          duration: string | null
          id: string
          is_published: boolean
          level: string | null
          slug: string
          sort_order: number
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          cover_image_key?: string | null
          created_at?: string
          description?: string | null
          duration?: string | null
          id?: string
          is_published?: boolean
          level?: string | null
          slug: string
          sort_order?: number
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          cover_image_key?: string | null
          created_at?: string
          description?: string | null
          duration?: string | null
          id?: string
          is_published?: boolean
          level?: string | null
          slug?: string
          sort_order?: number
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          absence_reminders: boolean
          batch_id: string | null
          completed_at: string | null
          course_id: string
          created_at: string
          id: string
          learning_status: string
          progress: number
          student_id: string
        }
        Insert: {
          absence_reminders?: boolean
          batch_id?: string | null
          completed_at?: string | null
          course_id: string
          created_at?: string
          id?: string
          learning_status?: string
          progress?: number
          student_id: string
        }
        Update: {
          absence_reminders?: boolean
          batch_id?: string | null
          completed_at?: string | null
          course_id?: string
          created_at?: string
          id?: string
          learning_status?: string
          progress?: number
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_items: {
        Row: {
          category: string | null
          created_at: string
          id: string
          image_key: string
          title: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          image_key: string
          title?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          image_key?: string
          title?: string | null
        }
        Relationships: []
      }
      notices: {
        Row: {
          body: string | null
          created_at: string
          event_date: string | null
          id: string
          is_published: boolean
          slug: string
          title: string
          type: Database["public"]["Enums"]["notice_type"]
          updated_at: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          event_date?: string | null
          id?: string
          is_published?: boolean
          slug: string
          title: string
          type?: Database["public"]["Enums"]["notice_type"]
          updated_at?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          event_date?: string | null
          id?: string
          is_published?: boolean
          slug?: string
          title?: string
          type?: Database["public"]["Enums"]["notice_type"]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          avatar_key: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          avatar_key?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          avatar_key?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      student_activity: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          created_at: string
          detail: Json
          id: string
          student_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          detail?: Json
          id?: string
          student_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          detail?: Json
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_activity_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          admission_id: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          student_code: string
        }
        Insert: {
          admission_id?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          phone?: string | null
          student_code?: string
        }
        Update: {
          admission_id?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          student_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_admission_id_fkey"
            columns: ["admission_id"]
            isOneToOne: true
            referencedRelation: "admissions"
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
      _actor_name: { Args: { _uid: string }; Returns: string }
      approve_admission: { Args: { _admission_id: string }; Returns: string }
      get_application_by_token: { Args: { _token: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      issue_certificate: {
        Args: { _enrollment_id: string }
        Returns: {
          certificate_id: string
          serial: string
        }[]
      }
      log_admission_activity: {
        Args: { _action: string; _admission_id: string; _detail?: Json }
        Returns: undefined
      }
      log_student_activity: {
        Args: { _action: string; _detail?: Json; _student_id: string }
        Returns: undefined
      }
      update_admission_with_log: {
        Args: { _admission_id: string; _note?: string; _patch: Json }
        Returns: number
      }
      verify_certificate: {
        Args: { _serial: string }
        Returns: {
          course_title: string
          is_revoked: boolean
          issued_at: string
          pdf_key: string
          serial: string
          student_code: string
          student_name: string
        }[]
      }
    }
    Enums: {
      admission_status: "pending" | "approved" | "rejected"
      app_role: "admin" | "moderator" | "user"
      notice_type: "notice" | "event"
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
      admission_status: ["pending", "approved", "rejected"],
      app_role: ["admin", "moderator", "user"],
      notice_type: ["notice", "event"],
    },
  },
} as const
