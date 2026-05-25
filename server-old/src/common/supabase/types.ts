export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          password_hash: string | null;
          email_verified: boolean;
          mfa_enabled: boolean;
          mfa_secret: string | null;
          personalized: boolean;
          preferences: Json;
          enr_kurs: string | null;
          wpu_kurs_1: string | null;
          wpu_kurs_2: string | null;
          theater: number;
          done_setup: boolean;
          last_login_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          password_hash?: string | null;
          email_verified?: boolean;
          mfa_enabled?: boolean;
          mfa_secret?: string | null;
          personalized?: boolean;
          preferences?: Json;
          enr_kurs?: string | null;
          wpu_kurs_1?: string | null;
          wpu_kurs_2?: string | null;
          theater?: number;
          done_setup?: boolean;
          last_login_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          password_hash?: string | null;
          email_verified?: boolean;
          mfa_enabled?: boolean;
          mfa_secret?: string | null;
          personalized?: boolean;
          preferences?: Json;
          enr_kurs?: string | null;
          wpu_kurs_1?: string | null;
          wpu_kurs_2?: string | null;
          theater?: number;
          done_setup?: boolean;
          last_login_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_activity: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          meta: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          meta?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          meta?: Json;
          created_at?: string;
        };
      };
      keep_checked: {
        Row: {
          user_id: string;
          item_id: string;
          checked_at: string;
        };
        Insert: {
          user_id: string;
          item_id: string;
          checked_at?: string;
        };
        Update: {
          user_id?: string;
          item_id?: string;
          checked_at?: string;
        };
      };
      pinned_items: {
        Row: {
          user_id: string;
          item_id: string;
          pinned_at: string;
        };
        Insert: {
          user_id: string;
          item_id: string;
          pinned_at?: string;
        };
        Update: {
          user_id?: string;
          item_id?: string;
          pinned_at?: string;
        };
      };
      user_item_visibility: {
        Row: {
          user_id: string;
          item_id: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          item_id: string;
          status: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          item_id?: string;
          status?: string;
          updated_at?: string;
        };
      };
      items: {
        Row: {
          id: string;
          tenant_id: string;
          type: string;
          title: string;
          subject: string;
          description: string;
          images: Json;
          due_date: string;
          created_by: string;
          editor_note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          type: string;
          title: string;
          subject: string;
          description: string;
          images?: Json;
          due_date: string;
          created_by: string;
          editor_note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          type?: string;
          title?: string;
          subject?: string;
          description?: string;
          images?: Json;
          due_date?: string;
          created_by?: string;
          editor_note?: string | null;
          created_at?: string;
        };
      };
      timetables: {
        Row: {
          id: string;
          tenant_id: string;
          day: number;
          slot: number;
          duration: number;
          room: string | null;
          course_id: string | null;
        };
        Insert: any;
        Update: any;
      };
      timetable_subs: {
        Row: {
          id: string;
          tenant_id: string;
          lesson_id: string | null;
          day: number;
          slot: number;
          duration: number;
          subject: string;
          room: string | null;
          cancelled: boolean;
          hide: boolean;
          created_at: string;
        };
        Insert: any;
        Update: any;
      };
      persons: {
        Row: {
          id: string;
          name: string;
          title: string | null;
          short: string | null;
        };
        Insert: any;
        Update: any;
      };
      subjects: {
        Row: {
          id: string;
          name: string;
        };
        Insert: any;
        Update: any;
      };
      courses: {
        Row: {
          id: string;
          name: string;
        };
        Insert: any;
        Update: any;
      };
      encrypted_todos: {
        Row: {
          id: string;
          user_id: string;
          encrypted_title: string;
          encrypted_description: string | null;
          completed: boolean;
          position: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          encrypted_title: string;
          encrypted_description?: string | null;
          completed?: boolean;
          position?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          encrypted_title?: string;
          encrypted_description?: string | null;
          completed?: boolean;
          position?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      banned_users: {
        Row: {
          id: string;
          user_id: string;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          reason?: string | null;
          created_at?: string;
        };
      };
      mfa_pending_secrets: {
        Row: {
          user_id: string;
          secret: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          secret: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          secret?: string;
          created_at?: string;
        };
      };
      user_roles: {
        Row: {
          user_id: string;
          role_id: string;
          tenant_id: string | null;
        };
        Insert: {
          user_id: string;
          role_id: string;
          tenant_id?: string | null;
        };
        Update: {
          user_id?: string;
          role_id?: string;
          tenant_id?: string | null;
        };
      };
      roles: {
        Row: {
          id: string;
          name: string;
        };
        Insert: {
          id?: string;
          name: string;
        };
        Update: {
          id?: string;
          name?: string;
        };
      };
      verifications: {
        Row: {
          id: string;
          email: string;
          token: string;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          token: string;
          expires_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          token?: string;
          expires_at?: string;
          created_at?: string;
        };
      };
      password_resets: {
        Row: {
          id: string;
          email: string;
          code: string;
          expires_at: string;
          used: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          code: string;
          expires_at: string;
          used?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          code?: string;
          expires_at?: string;
          used?: boolean;
          created_at?: string;
        };
      };
      groups: {
        Row: {
          id: string;
          name: string;
          created_at: string;
          passcode_hash: string;
          owner_id: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
          passcode_hash: string;
          owner_id: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
          passcode_hash?: string;
          owner_id?: string;
        };
      };
    };
  };
}
