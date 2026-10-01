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
      admissions: {
        Row: {
          address: string | null
          course_id: string | null
          created_at: string
          date_of_birth: string | null
          document_keys: Json
          education_level: string | null
          email: string
          full_name: string
          gender: string | null
          id: string
          institution: string | null
          motivation: string | null
          phone: string
          review_note: string | null
          reviewed_at: string | null
          status: Database["public"]["Enums"]["admission_status"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          course_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          document_keys?: Json
          education_level?: string | null
          email: string
          full_name: string
          gender?: string | null
          id?: string
          institution?: string | null
          motivation?: string | null
          phone: string
          review_note?: string | null
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["admission_status"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          course_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          document_keys?: Json
          education_level?: string | null
          email?: string
          full_name?: string
          gender?: string | null
          id?: string
          institution?: string | null
          motivation?: string | null
          phone?: string
          review_note?: string | null
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["admission_status"]
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
          completed_at: string | null
          course_id: string
          created_at: string
          id: string
          student_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          created_at?: string
          id?: string
          student_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          created_at?: string
          id?: string
          student_id?: string
        }
        Relationships: [
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      verify_certificate: {
        Args: { _serial: string }
        Returns: {
          course_title: string
          is_revoked: boolean
          issued_at: string
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
