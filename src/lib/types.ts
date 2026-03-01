// Core facility and program types

export type FacilityType = 
  | 'daycare'
  | 'preschool'
  | 'pre-k'
  | 'kindergarten'
  | 'elementary'
  | 'montessori'
  | 'home-daycare';

export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

// Individual program within a facility
export interface Program {
  id: string;
  name: string;                    // "Toddler Room", "Pre-K Half Day", etc.
  type: FacilityType;
  
  // Age requirements
  ageMinMonths: number;
  ageMaxMonths: number;
  
  // Schedule
  daysPerWeek: number;             // 2, 3, 5, etc.
  daysOffered: DayOfWeek[];        // Which specific days
  hoursPerDay: number;             // 3, 6, 8, etc.
  startTime: string;               // "9:00 AM"
  endTime: string;                 // "12:00 PM"
  
  // Cost
  costAmount: number | null;
  costPeriod: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  costNotes?: string;
  
  // Enrollment
  enrollmentStatus: 'open' | 'waitlist' | 'closed';
  enrollmentOpens?: string;        // Date enrollment opens
  enrollmentDeadline?: string;     // Application deadline
  schoolYearStart?: string;        // When program begins
  schoolYearEnd?: string;          // When program ends
  enrollmentNotes?: string;
  
  // Capacity
  spotsTotal?: number;
  spotsAvailable?: number;
}

// Academic calendar for the facility
export interface AcademicCalendar {
  schoolYearStart?: string;        // "August 26, 2024"
  schoolYearEnd?: string;          // "June 6, 2025"
  enrollmentOpens?: string;        // "February 1, 2024"
  enrollmentDeadline?: string;     // "April 15, 2024"
  summerProgramAvailable: boolean;
  notes?: string;
}

export interface OperatingHours {
  open: string;   // "7:00 AM"
  close: string;  // "6:00 PM"
  days: string;   // "Mon-Fri"
}

export interface Facility {
  id: string;
  name: string;
  facilityTypes: FacilityType[];   // Overall types offered
  
  // Location
  address: string;
  city: string;
  state: string;
  zip: string;
  latitude: number;
  longitude: number;
  neighborhood?: string;
  
  // Contact
  phone?: string;
  email?: string;
  website?: string;
  
  // Facility-level hours (when the building is open)
  operatingHours?: OperatingHours;
  
  // Programs offered
  programs: Program[];
  
  // Academic calendar
  academicCalendar?: AcademicCalendar;
  
  // Licensing
  licenseNumber?: string;
  licenseStatus?: 'active' | 'provisional' | 'expired' | 'unknown';
  
  // Features
  hasTransportation: boolean;
  mealsProvided: boolean;
  languages?: string[];
  specialPrograms?: string[];
  
  // Ratings
  rating?: number;
  reviewCount?: number;
  
  // Computed
  distanceMiles?: number;
  
  // Meta
  sourceUrl?: string;
  lastUpdated: string;
}

// Search/filter parameters
export interface SearchFilters {
  address: string;
  radiusMiles: number;
  facilityTypes: FacilityType[];
  childAgeMonths?: number;
  maxCostMonthly?: number;
  minDaysPerWeek?: number;
  maxDaysPerWeek?: number;
  minHoursPerDay?: number;
  minRating?: number;
  enrollmentOpen?: boolean;
}

// Flattened row for table display (one row per program)
export interface ProgramRow {
  facilityId: string;
  programId: string;
  facility: Facility;
  program: Program;
}

// Column configuration for the table
export type ColumnKey = 
  | 'name'
  | 'programName'
  | 'type'
  | 'distance'
  | 'neighborhood'
  | 'ages'
  | 'programSchedule'
  | 'programHours'
  | 'facilityHours'
  | 'programCost'
  | 'enrollmentStatus'
  | 'enrollmentDeadline'
  | 'schoolYear'
  | 'rating'
  | 'transportation'
  | 'meals'
  | 'languages';

export interface ColumnConfig {
  key: ColumnKey;
  label: string;
  defaultVisible: boolean;
  sortable: boolean;
  category: 'basic' | 'program' | 'enrollment' | 'features';
}

export const ALL_COLUMNS: ColumnConfig[] = [
  // Basic info
  { key: 'name', label: 'Facility', defaultVisible: true, sortable: true, category: 'basic' },
  { key: 'programName', label: 'Program', defaultVisible: true, sortable: true, category: 'basic' },
  { key: 'type', label: 'Type', defaultVisible: true, sortable: false, category: 'basic' },
  { key: 'distance', label: 'Distance', defaultVisible: true, sortable: true, category: 'basic' },
  { key: 'neighborhood', label: 'Neighborhood', defaultVisible: false, sortable: true, category: 'basic' },
  { key: 'rating', label: 'Rating', defaultVisible: true, sortable: true, category: 'basic' },
  
  // Program details
  { key: 'ages', label: 'Ages', defaultVisible: true, sortable: false, category: 'program' },
  { key: 'programSchedule', label: 'Schedule', defaultVisible: true, sortable: true, category: 'program' },
  { key: 'programHours', label: 'Program Hours', defaultVisible: true, sortable: false, category: 'program' },
  { key: 'facilityHours', label: 'Facility Hours', defaultVisible: false, sortable: false, category: 'program' },
  { key: 'programCost', label: 'Cost', defaultVisible: true, sortable: true, category: 'program' },
  
  // Enrollment
  { key: 'enrollmentStatus', label: 'Enrollment', defaultVisible: true, sortable: true, category: 'enrollment' },
  { key: 'enrollmentDeadline', label: 'Deadline', defaultVisible: true, sortable: false, category: 'enrollment' },
  { key: 'schoolYear', label: 'School Year', defaultVisible: false, sortable: false, category: 'enrollment' },
  
  // Features
  { key: 'transportation', label: 'Transportation', defaultVisible: false, sortable: false, category: 'features' },
  { key: 'meals', label: 'Meals', defaultVisible: false, sortable: false, category: 'features' },
  { key: 'languages', label: 'Languages', defaultVisible: false, sortable: false, category: 'features' },
];
