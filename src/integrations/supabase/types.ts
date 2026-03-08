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
      academic_calendar: {
        Row: {
          academic_year: string | null
          created_at: string
          created_by: string
          description: string | null
          end_date: string | null
          event_type: string
          id: string
          semester: number | null
          start_date: string
          title: string
          updated_at: string
        }
        Insert: {
          academic_year?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          end_date?: string | null
          event_type?: string
          id?: string
          semester?: number | null
          start_date: string
          title: string
          updated_at?: string
        }
        Update: {
          academic_year?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string | null
          event_type?: string
          id?: string
          semester?: number | null
          start_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      alumni: {
        Row: {
          bio: string | null
          contact_email: string | null
          contact_phone: string | null
          course_completed: string
          created_at: string
          current_employer: string | null
          degree_classification: string | null
          final_gpa: number | null
          graduation_date: string
          id: string
          job_title: string | null
          linkedin_url: string | null
          student_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          course_completed: string
          created_at?: string
          current_employer?: string | null
          degree_classification?: string | null
          final_gpa?: number | null
          graduation_date: string
          id?: string
          job_title?: string | null
          linkedin_url?: string | null
          student_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          course_completed?: string
          created_at?: string
          current_employer?: string | null
          degree_classification?: string | null
          final_gpa?: number | null
          graduation_date?: string
          id?: string
          job_title?: string | null
          linkedin_url?: string | null
          student_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alumni_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          author_id: string
          created_at: string
          id: string
          message: string
          priority: string
          target_course_id: string | null
          target_group: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          created_at?: string
          id?: string
          message: string
          priority?: string
          target_course_id?: string | null
          target_group?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          created_at?: string
          id?: string
          message?: string
          priority?: string
          target_course_id?: string | null
          target_group?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_target_course_id_fkey"
            columns: ["target_course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          course_id: string
          created_at: string
          deadline: string
          file_url: string | null
          id: string
          instructions: string | null
          lecturer_id: string
          max_grade: number
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          deadline: string
          file_url?: string | null
          id?: string
          instructions?: string | null
          lecturer_id: string
          max_grade?: number
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          deadline?: string
          file_url?: string | null
          id?: string
          instructions?: string | null
          lecturer_id?: string
          max_grade?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          created_at: string
          id: string
          session_id: string
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          time_joined: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          session_id: string
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          time_joined?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          session_id?: string
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id?: string
          time_joined?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "class_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          description: string | null
          id: string
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      class_sessions: {
        Row: {
          course_id: string
          created_at: string
          end_time: string
          id: string
          lecturer_id: string | null
          meeting_link: string | null
          schedule_id: string | null
          session_date: string
          start_time: string
          status: Database["public"]["Enums"]["session_status"]
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          end_time: string
          id?: string
          lecturer_id?: string | null
          meeting_link?: string | null
          schedule_id?: string | null
          session_date: string
          start_time: string
          status?: Database["public"]["Enums"]["session_status"]
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          end_time?: string
          id?: string
          lecturer_id?: string | null
          meeting_link?: string | null
          schedule_id?: string | null
          session_date?: string
          start_time?: string
          status?: Database["public"]["Enums"]["session_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_sessions_lecturer_id_fkey"
            columns: ["lecturer_id"]
            isOneToOne: false
            referencedRelation: "lecturers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_sessions_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "course_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      clearance_requests: {
        Row: {
          academic_year: string
          clearance_type: string
          created_at: string
          id: string
          semester: number
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          academic_year: string
          clearance_type?: string
          created_at?: string
          id?: string
          semester?: number
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          academic_year?: string
          clearance_type?: string
          created_at?: string
          id?: string
          semester?: number
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clearance_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      clearance_steps: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          clearance_id: string
          created_at: string
          id: string
          notes: string | null
          status: string
          step_name: string
          step_order: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          clearance_id: string
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          step_name: string
          step_order?: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          clearance_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          step_name?: string
          step_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "clearance_steps_clearance_id_fkey"
            columns: ["clearance_id"]
            isOneToOne: false
            referencedRelation: "clearance_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      course_lessons: {
        Row: {
          content: string | null
          created_at: string
          id: string
          module_id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          module_id: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          module_id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      course_materials: {
        Row: {
          course_id: string
          created_at: string
          file_type: string | null
          file_url: string
          id: string
          title: string
          uploaded_by: string | null
        }
        Insert: {
          course_id: string
          created_at?: string
          file_type?: string | null
          file_url: string
          id?: string
          title: string
          uploaded_by?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string
          file_type?: string | null
          file_url?: string
          id?: string
          title?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_materials_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_modules: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_schedules: {
        Row: {
          course_id: string
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          lecturer_id: string | null
          meeting_link_or_room: string | null
          start_time: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          lecturer_id?: string | null
          meeting_link_or_room?: string | null
          start_time: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          lecturer_id?: string | null
          meeting_link_or_room?: string | null
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_schedules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_schedules_lecturer_id_fkey"
            columns: ["lecturer_id"]
            isOneToOne: false
            referencedRelation: "lecturers"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          course_code: string
          course_name: string
          created_at: string
          department_id: string | null
          duration_years: number
          entry_requirement: string | null
          id: string
          is_published: boolean
          lecturer_id: string | null
          max_capacity: number | null
          program_level: string
          tuition_day: number | null
          tuition_evening: number | null
          tuition_weekend: number | null
          updated_at: string
        }
        Insert: {
          course_code: string
          course_name: string
          created_at?: string
          department_id?: string | null
          duration_years?: number
          entry_requirement?: string | null
          id?: string
          is_published?: boolean
          lecturer_id?: string | null
          max_capacity?: number | null
          program_level?: string
          tuition_day?: number | null
          tuition_evening?: number | null
          tuition_weekend?: number | null
          updated_at?: string
        }
        Update: {
          course_code?: string
          course_name?: string
          created_at?: string
          department_id?: string | null
          duration_years?: number
          entry_requirement?: string | null
          id?: string
          is_published?: boolean
          lecturer_id?: string | null
          max_capacity?: number | null
          program_level?: string
          tuition_day?: number | null
          tuition_evening?: number | null
          tuition_weekend?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          academic_year: string
          course_id: string
          created_at: string
          id: string
          semester: number
          status: string
          student_id: string
          study_mode: string
        }
        Insert: {
          academic_year: string
          course_id: string
          created_at?: string
          id?: string
          semester?: number
          status?: string
          student_id: string
          study_mode?: string
        }
        Update: {
          academic_year?: string
          course_id?: string
          created_at?: string
          id?: string
          semester?: number
          status?: string
          student_id?: string
          study_mode?: string
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
      exam_results: {
        Row: {
          created_at: string
          entered_by: string
          exam_id: string
          grade: string | null
          grade_points: number | null
          id: string
          marks_obtained: number | null
          remarks: string | null
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          entered_by: string
          exam_id: string
          grade?: string | null
          grade_points?: number | null
          id?: string
          marks_obtained?: number | null
          remarks?: string | null
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          entered_by?: string
          exam_id?: string
          grade?: string | null
          grade_points?: number | null
          id?: string
          marks_obtained?: number | null
          remarks?: string | null
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_results_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          academic_year: string
          course_id: string
          created_at: string
          created_by: string
          end_time: string
          exam_date: string
          exam_type: string
          id: string
          max_marks: number
          semester: number
          start_time: string
          status: string
          title: string
          updated_at: string
          venue: string | null
        }
        Insert: {
          academic_year: string
          course_id: string
          created_at?: string
          created_by: string
          end_time: string
          exam_date: string
          exam_type?: string
          id?: string
          max_marks?: number
          semester?: number
          start_time: string
          status?: string
          title: string
          updated_at?: string
          venue?: string | null
        }
        Update: {
          academic_year?: string
          course_id?: string
          created_at?: string
          created_by?: string
          end_time?: string
          exam_date?: string
          exam_type?: string
          id?: string
          max_marks?: number
          semester?: number
          start_time?: string
          status?: string
          title?: string
          updated_at?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exams_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_items: {
        Row: {
          amount: number
          applies_to: string
          category: string
          created_at: string
          frequency: string
          id: string
          is_optional: boolean
          name: string
          updated_at: string
        }
        Insert: {
          amount?: number
          applies_to?: string
          category?: string
          created_at?: string
          frequency?: string
          id?: string
          is_optional?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          amount?: number
          applies_to?: string
          category?: string
          created_at?: string
          frequency?: string
          id?: string
          is_optional?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      lecturers: {
        Row: {
          created_at: string
          department_id: string | null
          id: string
          specialization: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          id?: string
          specialization?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          id?: string
          specialization?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lecturers_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          course_id: string | null
          created_at: string
          id: string
          receipt_id: string | null
          student_id: string
          transaction_id: string
        }
        Insert: {
          amount: number
          course_id?: string | null
          created_at?: string
          id?: string
          receipt_id?: string | null
          student_id: string
          transaction_id: string
        }
        Update: {
          amount?: number
          course_id?: string | null
          created_at?: string
          id?: string
          receipt_id?: string | null
          student_id?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipt_uploads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          academic_year: string | null
          amount: number
          approved_by: string | null
          created_at: string
          id: string
          notes: string | null
          payment_date: string
          payment_status: string
          receipt_url: string | null
          semester: string | null
          student_id: string
          updated_at: string
        }
        Insert: {
          academic_year?: string | null
          amount: number
          approved_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_status?: string
          receipt_url?: string | null
          semester?: string | null
          student_id: string
          updated_at?: string
        }
        Update: {
          academic_year?: string | null
          amount?: number
          approved_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_status?: string
          receipt_url?: string | null
          semester?: string | null
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      receipt_extractions: {
        Row: {
          amount: number | null
          amount_in_words: string | null
          channel_depositor: string | null
          channel_memo: string | null
          confidence_score: number | null
          created_at: string
          description: string | null
          id: string
          institution_name: string | null
          payment_date: string | null
          payment_provider: string | null
          raw_text: string | null
          receipt_id: string
          sender_name: string | null
          student_class: string | null
          trans_type: string | null
          transaction_id: string | null
          validation_flags: Json | null
        }
        Insert: {
          amount?: number | null
          amount_in_words?: string | null
          channel_depositor?: string | null
          channel_memo?: string | null
          confidence_score?: number | null
          created_at?: string
          description?: string | null
          id?: string
          institution_name?: string | null
          payment_date?: string | null
          payment_provider?: string | null
          raw_text?: string | null
          receipt_id: string
          sender_name?: string | null
          student_class?: string | null
          trans_type?: string | null
          transaction_id?: string | null
          validation_flags?: Json | null
        }
        Update: {
          amount?: number | null
          amount_in_words?: string | null
          channel_depositor?: string | null
          channel_memo?: string | null
          confidence_score?: number | null
          created_at?: string
          description?: string | null
          id?: string
          institution_name?: string | null
          payment_date?: string | null
          payment_provider?: string | null
          raw_text?: string | null
          receipt_id?: string
          sender_name?: string | null
          student_class?: string | null
          trans_type?: string | null
          transaction_id?: string | null
          validation_flags?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "receipt_extractions_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipt_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt_uploads: {
        Row: {
          course_id: string | null
          created_at: string
          file_hash: string | null
          file_url: string
          id: string
          review_notes: string | null
          reviewed_by: string | null
          status: string
          student_id: string
          updated_at: string
          uploaded_at: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          file_hash?: string | null
          file_url: string
          id?: string
          review_notes?: string | null
          reviewed_by?: string | null
          status?: string
          student_id: string
          updated_at?: string
          uploaded_at?: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          file_hash?: string | null
          file_url?: string
          id?: string
          review_notes?: string | null
          reviewed_by?: string | null
          status?: string
          student_id?: string
          updated_at?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipt_uploads_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_uploads_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_fee_selections: {
        Row: {
          created_at: string
          fee_item_id: string
          id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          fee_item_id: string
          id?: string
          student_id: string
        }
        Update: {
          created_at?: string
          fee_item_id?: string
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_fee_selections_fee_item_id_fkey"
            columns: ["fee_item_id"]
            isOneToOne: false
            referencedRelation: "fee_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_fee_selections_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          admission_date: string | null
          course_id: string | null
          created_at: string
          fee_balance: number
          id: string
          registration_number: string | null
          semester: number
          status: string
          study_mode: string
          updated_at: string
          user_id: string
          year_of_study: number
        }
        Insert: {
          admission_date?: string | null
          course_id?: string | null
          created_at?: string
          fee_balance?: number
          id?: string
          registration_number?: string | null
          semester?: number
          status?: string
          study_mode?: string
          updated_at?: string
          user_id: string
          year_of_study?: number
        }
        Update: {
          admission_date?: string | null
          course_id?: string | null
          created_at?: string
          fee_balance?: number
          id?: string
          registration_number?: string | null
          semester?: number
          status?: string
          study_mode?: string
          updated_at?: string
          user_id?: string
          year_of_study?: number
        }
        Relationships: [
          {
            foreignKeyName: "students_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          assignment_id: string
          created_at: string
          feedback: string | null
          file_url: string | null
          grade: number | null
          id: string
          status: string
          student_id: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          assignment_id: string
          created_at?: string
          feedback?: string | null
          file_url?: string | null
          grade?: number | null
          id?: string
          status?: string
          student_id: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          assignment_id?: string
          created_at?: string
          feedback?: string | null
          file_url?: string | null
          grade?: number | null
          id?: string
          status?: string
          student_id?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          category: string
          created_at: string
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      timetable_entries: {
        Row: {
          course_id: string
          created_at: string
          created_by: string
          day_of_week: number
          end_time: string
          id: string
          lecturer_id: string | null
          module_id: string | null
          room_location: string | null
          start_time: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          created_by: string
          day_of_week: number
          end_time: string
          id?: string
          lecturer_id?: string | null
          module_id?: string | null
          room_location?: string | null
          start_time: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          created_by?: string
          day_of_week?: number
          end_time?: string
          id?: string
          lecturer_id?: string | null
          module_id?: string | null
          room_location?: string | null
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "timetable_entries_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_entries_lecturer_id_fkey"
            columns: ["lecturer_id"]
            isOneToOne: false
            referencedRelation: "lecturers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_entries_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
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
      check_schedule_conflicts: {
        Args: {
          p_course_id: string
          p_day_of_week: number
          p_end_time: string
          p_exclude_id?: string
          p_lecturer_id?: string
          p_meeting_room?: string
          p_start_time: string
        }
        Returns: {
          conflict_details: string
          conflict_type: string
        }[]
      }
      generate_class_sessions: {
        Args: { p_course_id: string; p_start_date: string; p_weeks?: number }
        Returns: number
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      recalculate_fee_balance: {
        Args: { p_student_id: string }
        Returns: undefined
      }
      submit_clearance_request: {
        Args: {
          p_academic_year: string
          p_clearance_type: string
          p_semester: number
          p_student_id: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "lecturer" | "student"
      attendance_status: "present" | "absent" | "late"
      session_status: "scheduled" | "live" | "completed" | "cancelled"
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
      app_role: ["admin", "lecturer", "student"],
      attendance_status: ["present", "absent", "late"],
      session_status: ["scheduled", "live", "completed", "cancelled"],
    },
  },
} as const
