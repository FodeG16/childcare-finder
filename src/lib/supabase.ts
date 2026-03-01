import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface DbFacility {
  id: string;
  name: string;
  facility_types: string[];
  address: string;
  city: string;
  state: string;
  zip: string;
  latitude: number;
  longitude: number;
  neighborhood: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  operating_hours_open: string | null;
  operating_hours_close: string | null;
  operating_hours_days: string | null;
  license_number: string | null;
  license_status: string | null;
  has_transportation: boolean;
  meals_provided: boolean;
  languages: string[] | null;
  special_programs: string[] | null;
  rating: number | null;
  review_count: number | null;
  academic_calendar: {
    schoolYearStart?: string;
    schoolYearEnd?: string;
    enrollmentOpens?: string;
    enrollmentDeadline?: string;
    summerProgramAvailable?: boolean;
    notes?: string;
  } | null;
  source_url: string | null;
  last_updated: string;
  created_at: string;
}

export interface DbProgram {
  id: string;
  facility_id: string;
  name: string;
  program_type: string;
  age_min_months: number;
  age_max_months: number;
  days_per_week: number;
  days_offered: string[];
  hours_per_day: number;
  start_time: string;
  end_time: string;
  cost_amount: number | null;
  cost_period: string;
  cost_notes: string | null;
  enrollment_status: string;
  enrollment_opens: string | null;
  enrollment_deadline: string | null;
  enrollment_notes: string | null;
  school_year_start: string | null;
  school_year_end: string | null;
  spots_total: number | null;
  spots_available: number | null;
  created_at: string;
}
