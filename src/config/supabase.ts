import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY ||'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      purchases: {
        Row: {
          id: string;
          user_id: string;
          report_ids: string[];
          amount: number;
          stripe_payment_id: string;
          status: 'pending' | 'completed' | 'failed';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          report_ids: string[];
          amount: number;
          stripe_payment_id: string;
          status?: 'pending' | 'completed' | 'failed';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          report_ids?: string[];
          amount?: number;
          stripe_payment_id?: string;
          status?: 'pending' | 'completed' | 'failed';
          created_at?: string;
          updated_at?: string;
        };
      };
      report_submissions: {
        Row: {
          id: string;
          user_id: string;
          purchase_id: string;
          report_type_id: string;
          company_name: string;
          email: string;
          answers: any;
          status: 'pending' | 'processing' | 'completed' | 'failed';
          report_data: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          purchase_id: string;
          report_type_id: string;
          company_name: string;
          email: string;
          answers: any;
          status?: 'pending' | 'processing' | 'completed' | 'failed';
          report_data?: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          purchase_id?: string;
          report_type_id?: string;
          company_name?: string;
          email?: string;
          answers?: any;
          status?: 'pending' | 'processing' | 'completed' | 'failed';
          report_data?: any;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};