export interface Database {
  public: {
    Tables: {
      leads: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          phone: string;
          email: string | null;
          source: string;
          status: string;
          assigned_to: string | null;
          city: string | null;
          state: string | null;
          notes: string | null;
          created_at: string | null;
          updated_at: string | null;
          priority: string | null;
          address: string | null;
          comment: string | null;
          is_deleted: boolean;
          is_unseen: boolean;
          custom_fields: Record<string, any> | null;
          estimated_budget: string | null;
          facebook_ad_name: string | null;
          brand: string | null;
          engagement: string | null;
          reference: string | null;
          branch: string | null;
          neural_score: number | null;
          is_duplicate: boolean | null;
          date: string | null;
          description: string | null;
          custom_data: Record<string, any> | null;
        };
        Insert: Omit<Database['public']['Tables']['leads']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['leads']['Row']>;
      };
      team_settings: {
        Row: {
          company_id: string;
          team_name?: string | null;
          field_labels: Record<string, string> | null;
          hide_phone_numbers: boolean;
          rotting_threshold: number;
          custom_fields: any[] | null;
          created_at: string | null;
          updated_at: string | null;
          require_approval: boolean | null;
          allow_qr: boolean | null;
          allow_code: boolean | null;
          device_limit: number | null;
          gemini_keys: any[] | null;
        };
        Insert: Database['public']['Tables']['team_settings']['Row'];
        Update: Partial<Database['public']['Tables']['team_settings']['Row']>;
      };
      import_logs: {
        Row: {
          id: string;
          company_id: string;
          filename: string;
          row_count: number;
          status: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['import_logs']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['import_logs']['Row']>;
      };
      users: {
        Row: {
          id: string;
          company_id: string;
          display_name: string | null;
          name: string | null;
          email: string;
          phone: string | null;
          role: string;
          status: string;
          created_at: string | null;
          updated_at: string | null;
          seat_active: boolean | null;
          photo_url: string | null;
          joined_via: string | null;
          assigned_leads: number | null;
          calls_today: number | null;
          last_seen: string | null;
          managed_by_admin_id: string | null;
          sub_admin_quota: number | null;
        };
        Insert: Database['public']['Tables']['users']['Row'];
        Update: Partial<Database['public']['Tables']['users']['Row']>;
      };
      calls: {
        Row: {
          id: string;
          company_id: string;
          lead_id: string | null;
          lead_name: string | null;
          phone: string;
          duration: string | null;
          status: string | null;
          ai_summary: string | null;
          type: string | null;
          interest: string | null;
          created_by: string | null;
          recording_url: string | null;
          created_at: string | null;
          updated_at: string | null;
          outcome: string | null;
          timestamp: string | null;
          is_ai_call: boolean | null;
          ai_processed: boolean | null;
          ai_success: boolean | null;
        };
        Insert: Database['public']['Tables']['calls']['Row'];
        Update: Partial<Database['public']['Tables']['calls']['Row']>;
      };
      report_templates: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          columns: string[];
          created_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['report_templates']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['report_templates']['Row']>;
      };
      lead_notes: {
        Row: {
          id: string;
          company_id: string;
          lead_id: string;
          author_id: string | null;
          author_name: string | null;
          content: string;
          created_at: string;
        };
        Insert: Database['public']['Tables']['lead_notes']['Row'];
        Update: Partial<Database['public']['Tables']['lead_notes']['Row']>;
      };
      lead_activity_log: {
        Row: {
          id: string;
          company_id: string;
          lead_id: string;
          activity_type: string;
          description: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: Database['public']['Tables']['lead_activity_log']['Row'];
        Update: Partial<Database['public']['Tables']['lead_activity_log']['Row']>;
      };
      custom_field_definitions: {
        Row: {
          id: string;
          company_id: string;
          field_key: string;
          field_label: string;
          field_type: string;
          select_options: string[] | null;
          is_required: boolean;
          validation_rule: Record<string, any> | null;
          order_index: number;
          is_active: boolean;
          created_at: string | null;
        };
        Insert: Database['public']['Tables']['custom_field_definitions']['Row'];
        Update: Partial<Database['public']['Tables']['custom_field_definitions']['Row']>;
      };
      callbacks: {
        Row: {
          id: string;
          company_id: string;
          lead_id: string;
          assigned_to: string | null;
          reminder_date: string;
          notes: string | null;
          created_at: string;
          status: string;
        };
        Insert: Database['public']['Tables']['callbacks']['Row'];
        Update: Partial<Database['public']['Tables']['callbacks']['Row']>;
      };
      join_requests: {
        Row: {
          id: string;
          company_id: string;
          user_id: string | null;
          name: string;
          email: string;
          phone: string;
          city: string | null;
          language: string | null;
          requested_via: string | null;
          status: string;
          created_at: string;
          processed_at: string | null;
          processed_by: string | null;
        };
        Insert: Database['public']['Tables']['join_requests']['Row'];
        Update: Partial<Database['public']['Tables']['join_requests']['Row']>;
      };
      invites: {
        Row: {
          id: string;
          company_id: string;
          email: string | null;
          role: string;
          join_code: string | null;
          token: string | null;
          status: string;
          created_at: string;
          invited_by: string | null;
          used_count: number;
          max_uses: number | null;
          expires_at: string | null;
          type: string;
        };
        Insert: Database['public']['Tables']['invites']['Row'];
        Update: Partial<Database['public']['Tables']['invites']['Row']>;
      };
      agent_status: {
        Row: {
          id: string;
          company_id: string;
          user_name: string;
          status: string;
          last_seen: string;
          location: string | null;
        };
        Insert: Database['public']['Tables']['agent_status']['Row'];
        Update: Partial<Database['public']['Tables']['agent_status']['Row']>;
      };
      activity_stream: {
        Row: {
          id: string;
          company_id: string;
          user_name: string | null;
          description: string;
          timestamp: string;
        };
        Insert: Database['public']['Tables']['activity_stream']['Row'];
        Update: Partial<Database['public']['Tables']['activity_stream']['Row']>;
      };
      audit_logs: {
        Row: {
          id: string;
          company_id: string;
          action: string;
          category: string;
          target: string | null;
          target_id: string | null;
          details: string | null;
          user_name: string | null;
          user_email: string | null;
          timestamp: string;
          created_at: string | null;
        };
        Insert: Database['public']['Tables']['audit_logs']['Row'];
        Update: Partial<Database['public']['Tables']['audit_logs']['Row']>;
      };
      companies: {
        Row: {
          id: string;
          name: string;
          plan: string;
          plan_status: string;
          seat_limit: number;
          billing_cycle: string;
          plan_expires_at: string | null;
          trial_ends_at: string | null;
          created_at: string | null;
        };
        Insert: Database['public']['Tables']['companies']['Row'];
        Update: Partial<Database['public']['Tables']['companies']['Row']>;
      };
      attendance_logs: {
        Row: {
          id: string;
          company_id: string;
          user_id: string;
          user_name: string;
          type: string;
          timestamp: string;
          location: string | null;
          device_info: string | null;
        };
        Insert: Database['public']['Tables']['attendance_logs']['Row'];
        Update: Partial<Database['public']['Tables']['attendance_logs']['Row']>;
      };
      announcements: {
        Row: {
          id: string;
          company_id: string;
          title: string;
          body: string;
          created_at: string;
          created_by: string;
          status: string;
        };
        Insert: Database['public']['Tables']['announcements']['Row'];
        Update: Partial<Database['public']['Tables']['announcements']['Row']>;
      };
      targets: {
        Row: {
          id: string;
          company_id: string;
          label: string;
          target_value: number;
          current_value: number;
          type: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Database['public']['Tables']['targets']['Row'];
        Update: Partial<Database['public']['Tables']['targets']['Row']>;
      };
    };
  };
}
