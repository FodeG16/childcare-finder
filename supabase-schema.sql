-- Chicago Childcare Finder Database Schema
-- Run this in Supabase SQL Editor (supabase.com > your project > SQL Editor)

-- ============================================
-- STEP 1: Enable PostGIS (if not already enabled)
-- ============================================
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================
-- STEP 2: Create facilities table
-- ============================================
CREATE TABLE IF NOT EXISTS facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic info
  name TEXT NOT NULL,
  facility_types TEXT[] NOT NULL DEFAULT '{}',
  
  -- Location
  address TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Chicago',
  state TEXT NOT NULL DEFAULT 'IL',
  zip TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  neighborhood TEXT,
  
  -- PostGIS point for geo queries (auto-populated by trigger)
  location GEOGRAPHY(POINT, 4326),
  
  -- Contact
  phone TEXT,
  email TEXT,
  website TEXT,
  
  -- Operating hours (when building is open)
  operating_hours_open TEXT,  -- "7:00 AM"
  operating_hours_close TEXT, -- "6:00 PM"  
  operating_hours_days TEXT DEFAULT 'Mon-Fri',
  
  -- Licensing
  license_number TEXT,
  license_status TEXT DEFAULT 'unknown',
  
  -- Features
  has_transportation BOOLEAN DEFAULT false,
  meals_provided BOOLEAN DEFAULT false,
  languages TEXT[] DEFAULT '{"English"}',
  special_programs TEXT[] DEFAULT '{}',
  
  -- Ratings (from external sources)
  rating DECIMAL(2, 1),
  review_count INTEGER DEFAULT 0,
  
  -- Academic calendar (JSON for flexibility)
  academic_calendar JSONB DEFAULT '{}',
  
  -- Data source tracking
  source_url TEXT,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STEP 3: Create programs table
-- ============================================
CREATE TABLE IF NOT EXISTS programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  
  -- Program info
  name TEXT NOT NULL,  -- "Pre-K 3s Half Day", "Toddler Room", etc.
  program_type TEXT NOT NULL,  -- "daycare", "preschool", "pre-k", etc.
  
  -- Age requirements (in months)
  age_min_months INTEGER NOT NULL DEFAULT 0,
  age_max_months INTEGER NOT NULL DEFAULT 144,
  
  -- Schedule
  days_per_week INTEGER NOT NULL DEFAULT 5,
  days_offered TEXT[] DEFAULT '{"Mon","Tue","Wed","Thu","Fri"}',
  hours_per_day DECIMAL(4, 2) NOT NULL DEFAULT 8,
  start_time TEXT NOT NULL DEFAULT '8:00 AM',
  end_time TEXT NOT NULL DEFAULT '4:00 PM',
  
  -- Cost
  cost_amount DECIMAL(10, 2),
  cost_period TEXT DEFAULT 'monthly',  -- "monthly", "yearly", "weekly"
  cost_notes TEXT,
  
  -- Enrollment
  enrollment_status TEXT DEFAULT 'unknown',  -- "open", "waitlist", "closed"
  enrollment_opens TEXT,      -- "January 15, 2026"
  enrollment_deadline TEXT,   -- "March 1, 2026"
  enrollment_notes TEXT,
  
  -- School year
  school_year_start TEXT,     -- "August 25, 2026"
  school_year_end TEXT,       -- "June 5, 2027"
  
  -- Capacity
  spots_total INTEGER,
  spots_available INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STEP 4: Create indexes
-- ============================================
CREATE INDEX IF NOT EXISTS facilities_location_idx ON facilities USING GIST (location);
CREATE INDEX IF NOT EXISTS facilities_zip_idx ON facilities (zip);
CREATE INDEX IF NOT EXISTS facilities_types_idx ON facilities USING GIN (facility_types);
CREATE INDEX IF NOT EXISTS programs_facility_idx ON programs (facility_id);
CREATE INDEX IF NOT EXISTS programs_type_idx ON programs (program_type);
CREATE INDEX IF NOT EXISTS programs_enrollment_idx ON programs (enrollment_status);

-- ============================================
-- STEP 5: Create trigger to auto-populate location
-- ============================================
CREATE OR REPLACE FUNCTION update_facility_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS facility_location_trigger ON facilities;
CREATE TRIGGER facility_location_trigger
BEFORE INSERT OR UPDATE ON facilities
FOR EACH ROW EXECUTE FUNCTION update_facility_location();

-- ============================================
-- STEP 6: Create search function
-- ============================================
CREATE OR REPLACE FUNCTION search_facilities_nearby(
  search_lat DECIMAL,
  search_lng DECIMAL,
  radius_miles DECIMAL DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  facility_types TEXT[],
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  neighborhood TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  operating_hours_open TEXT,
  operating_hours_close TEXT,
  operating_hours_days TEXT,
  license_number TEXT,
  license_status TEXT,
  has_transportation BOOLEAN,
  meals_provided BOOLEAN,
  languages TEXT[],
  special_programs TEXT[],
  rating DECIMAL,
  review_count INTEGER,
  academic_calendar JSONB,
  source_url TEXT,
  last_updated TIMESTAMPTZ,
  distance_miles DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id,
    f.name,
    f.facility_types,
    f.address,
    f.city,
    f.state,
    f.zip,
    f.latitude,
    f.longitude,
    f.neighborhood,
    f.phone,
    f.email,
    f.website,
    f.operating_hours_open,
    f.operating_hours_close,
    f.operating_hours_days,
    f.license_number,
    f.license_status,
    f.has_transportation,
    f.meals_provided,
    f.languages,
    f.special_programs,
    f.rating,
    f.review_count,
    f.academic_calendar,
    f.source_url,
    f.last_updated,
    (ST_Distance(
      f.location,
      ST_SetSRID(ST_MakePoint(search_lng, search_lat), 4326)::geography
    ) / 1609.344)::DECIMAL AS distance_miles
  FROM facilities f
  WHERE ST_DWithin(
    f.location,
    ST_SetSRID(ST_MakePoint(search_lng, search_lat), 4326)::geography,
    radius_miles * 1609.344
  )
  ORDER BY distance_miles ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 7: Enable Row Level Security
-- ============================================
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read facilities" ON facilities FOR SELECT USING (true);
CREATE POLICY "Allow public read programs" ON programs FOR SELECT USING (true);

-- Allow authenticated users to insert/update (for admin later)
CREATE POLICY "Allow authenticated insert facilities" ON facilities 
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');
CREATE POLICY "Allow authenticated insert programs" ON programs 
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- ============================================
-- DONE! Now run the seed script to add sample data
-- ============================================
