export interface Database {
  public: {
    Tables: {
      leads: {
        // Hand-maintained -- there is no codegen step in package.json. It
        // declared twelve columns the schema never created, so TypeScript
        // approved inserts that Postgres then rejected. Keep it in step with
        // supabase/migrations by hand, and prefer removing a field here over
        // leaving one that does not exist.
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
          neural_score: number | null;
          is_duplicate: boolean | null;
          description: string | null;
          /**
           * @deprecated Superseded by custom_fields.
           *
           * The schema created this; eleven files write custom_fields. The two
           * are merged in 20260812000000_lead_columns_reconcile.sql and this
           * one is kept only so existing rows can still be read until it is
           * dropped.
           */
          custom_data: Record<string, any> | null;
        };
        Insert: Omit<Database['public']['Tables']['leads']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['leads']['Row']>;
      };
      /**
       * Checked against information_schema, not against the previous version
       * of this file. It declared team_name, field_labels, custom_fields,
       * allow_qr, allow_code and gemini_keys -- six columns the table does not
       * have -- and omitted leads_statuses, default_stage, assignment_mode and
       * field_aliases, which it does. TypeScript approved inserts Postgres
       * would have rejected, and blocked reads of columns that exist.
       */
      team_settings: {
        Row: {
          company_id: string;
          require_approval: boolean | null;
          assignment_mode: string | null;
          rotting_threshold: number;
          hide_phone_numbers: boolean;
          device_limit: number | null;
          /**
           * Both shown on the Team page and neither enforced anywhere: no join
           * path consults them, so turning QR joining off does not stop a QR
           * join. Added to the live table by 20260821000100 because the UI was
           * reading and writing columns that did not exist.
           */
          allow_qr: boolean;
          allow_code: boolean;
          /** The company's own pipeline stages, in order. */
          leads_statuses: string[] | null;
          default_stage: string | null;
          field_aliases: Record<string, string> | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: Database['public']['Tables']['team_settings']['Row'];
        Update: Partial<Database['public']['Tables']['team_settings']['Row']>;
      };
      post_call_form_options: {
        Row: {
          id: string;
          company_id: string;
          kind: 'outcome' | 'interest' | 'followup';
          /** Written to calls.outcome / calls.interest. Immutable in Postgres. */
          value: string;
          /** Shown to the telecaller. Free to change, in any language. */
          label: string;
          color: string | null;
          sort_order: number;
          is_active: boolean;
          /** kind='interest' only: which of the company's stages to move to. */
          maps_to_stage: string | null;
          /** kind='followup' only: minutes from the end of the call. */
          offset_minutes: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['post_call_form_options']['Row'],
          'id' | 'created_at' | 'updated_at'
        > & { id?: string };
        // value and kind are absent: Postgres refuses to change either, so
        // offering them here would be a type that approves a failing write.
        Update: Partial<Omit<
          Database['public']['Tables']['post_call_form_options']['Row'],
          'id' | 'company_id' | 'value' | 'kind' | 'created_at'
        >>;
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
          // Checked against information_schema on the live database. This
          // block declared eighteen columns where the table had twelve, so
          // TypeScript approved writes Postgres would reject -- the exact
          // failure AGENTS.md describes for `leads`.
          //
          // Removed as never-written and non-existent: photo_url, last_seen,
          // managed_by_admin_id, sub_admin_quota. assigned_leads and
          // calls_today are gone from here too and counted in useTeamMembers,
          // which returns TeamMember rather than UserRow.
          id: string;
          company_id: string;
          /** Added by 20260815000000. */
          display_name: string | null;
          name: string | null;
          email: string;
          phone: string | null;
          role: string;
          status: string;
          designation: string | null;
          onboarding_status: string | null;
          plan_status: string | null;
          created_at: string | null;
          updated_at: string | null;
          /** Added by 20260815000000. */
          seat_active: boolean | null;
          /** Added by 20260815000000. */
          joined_via: string | null;
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
          /** @deprecated Nothing writes this column. Left until migration drops it. */
          recording_url: string | null;
          created_at: string | null;
          updated_at: string | null;
          outcome: string | null;
          timestamp: string | null;
          notes: string | null;
          agent_id: string | null;
          branch_id: string | null;
          idempotency_key: string | null;
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
          from_status: string | null;
          to_status: string | null;
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
          updated_at: string;
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
          /** The user id. useAgentMonitor matches it against calls.created_by. */
          id: string;
          company_id: string;
          user_name: string;
          /** 'active' | 'on_call' | 'offline'. Anything else renders as offline. */
          status: string;
          last_seen: string;
          updated_at: string;
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
          domain: string | null;
          enable_branch_management: boolean | null;
          storage_used_bytes: number | null;
          ai_enabled: boolean | null;
          updated_at: string | null;
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
          latitude: number | null;
          longitude: number | null;
          accuracy: number | null;
          location_address: string | null;
          is_within_geofence: boolean | null;
          is_remote_override: boolean | null;
          distance_from_office_meters: number | null;
          idempotency_key: string | null;
        };
        Insert: Database['public']['Tables']['attendance_logs']['Row'];
        Update: Partial<Database['public']['Tables']['attendance_logs']['Row']>;
      };
      announcements: {
        Row: {
          id: string;
          company_id: string;
          title: string;
          content: string;
          category: string;
          target_role: string;
          is_pinned: boolean;
          is_published: boolean;
          scheduled_at: string | null;
          published_at: string | null;
          author_id: string | null;
          created_at: string;
          updated_at: string | null;
          is_archived: boolean | null;
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
      notifications: {
        Row: {
          id: string;
          company_id: string;
          user_id: string;
          title: string;
          message: string;
          type: string | null;
          read: boolean;
          link: string | null;
          created_at: string;
        };
        Insert: Database['public']['Tables']['notifications']['Row'];
        Update: Partial<Database['public']['Tables']['notifications']['Row']>;
      };
      whatsapp_messages: {
        Row: {
          id: string;
          company_id: string;
          lead_id: string | null;
          phone: string;
          direction: 'incoming' | 'outgoing';
          content: string;
          media_url: string | null;
          status: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: Database['public']['Tables']['whatsapp_messages']['Row'];
        Update: Partial<Database['public']['Tables']['whatsapp_messages']['Row']>;
      };
      whatsapp_conversations: {
        Row: {
          id: string;
          company_id: string;
          lead_id: string | null;
          phone: string;
          unread_count: number;
          last_message: string | null;
          last_message_at: string | null;
          updated_at: string;
        };
        Insert: Database['public']['Tables']['whatsapp_conversations']['Row'];
        Update: Partial<Database['public']['Tables']['whatsapp_conversations']['Row']>;
      };
      documents: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          file_path: string | null;
          storage_path: string | null;
          file_size: number | null;
          mime_type: string | null;
          uploaded_by: string | null;
          category: string | null;
          status: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: Database['public']['Tables']['documents']['Row'];
        Update: Partial<Database['public']['Tables']['documents']['Row']>;
      };
      plan_limits: {
        Row: {
          id: string;
          plan_id: string;
          max_users: number;
          max_leads: number;
          max_calls: number;
          max_storage_bytes: number;
          created_at: string | null;
        };
        Insert: Database['public']['Tables']['plan_limits']['Row'];
        Update: Partial<Database['public']['Tables']['plan_limits']['Row']>;
      };
      lead_sources: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          active: boolean;
          created_at: string | null;
        };
        Insert: Database['public']['Tables']['lead_sources']['Row'];
      };
      invoices: {
        Row: {
          id: string;
          company_id: string;
          amount: number;
          status: string;
          pdf_url: string | null;
          invoice_number: string | null;
          billing_period_start: string | null;
          billing_period_end: string | null;
          created_at: string;
        };
        Insert: Database['public']['Tables']['invoices']['Row'];
        Update: Partial<Database['public']['Tables']['invoices']['Row']>;
      };
      role_permissions: {
        Row: {
          id: string;
          company_id: string;
          role: string;
          permissions: Record<string, any>;
          updated_at: string | null;
        };
        Insert: Database['public']['Tables']['role_permissions']['Row'];
        Update: Partial<Database['public']['Tables']['role_permissions']['Row']>;
      };
    };
  };
}
