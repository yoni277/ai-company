/**
 * Hand-maintained mirror of the Supabase schema.
 *
 * In a later phase, replace this file with the output of
 *   `supabase gen types typescript --project-id <id> > generated-types.ts`
 * The shape here is compatible with the generated form.
 */
export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string;
          status: 'healthy' | 'at_risk' | 'critical' | 'paused' | 'archived';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string;
          status?: 'healthy' | 'at_risk' | 'critical' | 'paused' | 'archived';
        };
        Update: Partial<Database['public']['Tables']['projects']['Insert']>;
      };
      data_sources: {
        Row: {
          id: string;
          project_id: string;
          source_type: string;
          status: 'ok' | 'degraded' | 'error' | 'unknown';
          last_sync: string | null;
          last_error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          source_type: string;
          status?: 'ok' | 'degraded' | 'error' | 'unknown';
          last_sync?: string | null;
          last_error?: string | null;
        };
        Update: Partial<Database['public']['Tables']['data_sources']['Insert']>;
      };
      project_metrics: {
        Row: {
          id: string;
          project_id: string;
          metric_name: string;
          metric_value: number;
          unit: string | null;
          timestamp: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          metric_name: string;
          metric_value: number;
          unit?: string | null;
          timestamp?: string;
        };
        Update: Partial<Database['public']['Tables']['project_metrics']['Insert']>;
      };
      risks: {
        Row: {
          id: string;
          project_id: string;
          severity: 'low' | 'medium' | 'high' | 'critical';
          description: string;
          source: string;
          status: 'open' | 'monitoring' | 'mitigated' | 'accepted';
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          severity: 'low' | 'medium' | 'high' | 'critical';
          description: string;
          source: string;
          status?: 'open' | 'monitoring' | 'mitigated' | 'accepted';
        };
        Update: Partial<Database['public']['Tables']['risks']['Insert']>;
      };
      opportunities: {
        Row: {
          id: string;
          project_id: string;
          priority: 'low' | 'medium' | 'high';
          description: string;
          source: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          priority: 'low' | 'medium' | 'high';
          description: string;
          source: string;
        };
        Update: Partial<Database['public']['Tables']['opportunities']['Insert']>;
      };
      executive_reports: {
        Row: {
          id: string;
          executive_id: string;
          report_type: 'daily_briefing' | 'weekly_report' | 'ad_hoc';
          summary: string;
          body: unknown;
          created_at: string;
        };
        Insert: {
          id?: string;
          executive_id: string;
          report_type: 'daily_briefing' | 'weekly_report' | 'ad_hoc';
          summary: string;
          body: unknown;
        };
        Update: Partial<Database['public']['Tables']['executive_reports']['Insert']>;
      };
      report_links: {
        Row: {
          report_id: string;
          entity_type: 'risk' | 'opportunity' | 'metric';
          entity_id: string;
        };
        Insert: Database['public']['Tables']['report_links']['Row'];
        Update: Partial<Database['public']['Tables']['report_links']['Row']>;
      };
    };
  };
}
