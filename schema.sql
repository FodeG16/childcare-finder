-- Chicago Childcare Finder Database Schema
-- Use with Supabase (PostgreSQL + PostGIS)

-- Enable PostGIS extension for geographic queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Facility types enum
CREATE TYPE facility_type AS ENUM (
  'daycare',
  'home-daycare',
  'preschool',
  'montessori',
  'pre-k',
  'kindergarten',
  'elementary'
);

CREATE TYPE license_status AS ENUM (
  'active',
  'provisional',
  'expired',
  'unknown'
);

CREATE TYPE cost_period AS ENUM (
  'hourly',
  'daily',
  'weekly',
  'monthly',
  'yearly'
);

-- Main facilities table
CREATE TABLE facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic info
  name TEXT NOT NULL,
  types facility_type[] NOT NULL DEFAULT '{}',
  
  -- Location
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'IL',
  zip TEXT NOT NULL,
  neighborhood TEXT,
  location GEOGRAPHY(POINT, 4326), -- PostGIS point for geo queries
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Contact
  phone TEXT,
  email TEXT,
  website TEXT,
  
  -- Ages served (in months)
  age_min_months INTEGER NOT NULL DEFAULT 0,
  age_max_months INTEGER NOT NULL DEFAULT 144,
  
  -- Hours
  hours_open TIME,
  hours_close TIME,
  hours_days TEXT DEFAULT 'Mon-Fri',
  
  -- Cost
  cost_amount DECIMAL(10, 2),
  cost_period cost_period,
  cost_notes TEXT,
  
  -- Enrollment
  enrollment_open BOOLEAN DEFAULT false,
  enrollment_open_date DATE,
  enrollment_deadline DATE,
  waitlist_available BOOLEAN DEFAULT false,
  enrollment_notes TEXT,
  
  -- Licensing
  license_number TEXT,
  license_status license_status DEFAULT 'unknown',
  
  -- Capacity
  capacity INTEGER,
  
  -- Features
  has_transportation BOOLEAN DEFAULT false,
  meals_provided BOOLEAN DEFAULT false,
  languages TEXT[] DEFAULT '{"English"}',
  special_programs TEXT[] DEFAULT '{}',
  
  -- Ratings (from external sources)
  rating DECIMAL(2, 1),
  review_count INTEGER DEFAULT 0,
  
  -- Data source tracking
  source_url TEXT,
  source_name TEXT, -- 'illinois-dcfs', 'cps', 'google-places', etc.
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_scraped_at TIMESTAMPTZ
);

-- Create index on location for fast geo queries
CREATE INDEX facilities_location_idx ON facilities USING GIST (location);

-- Create index on zip for fast filtering
CREATE INDEX facilities_zip_idx ON facilities (zip);

-- Create index on types for filtering
CREATE INDEX facilities_types_idx ON facilities USING GIN (types);

-- Create index on license number for deduplication
CREATE INDEX facilities_license_idx ON facilities (license_number) WHERE license_number IS NOT NULL;

-- Function to automatically update location from lat/lng
CREATE OR REPLACE FUNCTION update_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER facilities_location_trigger
BEFORE INSERT OR UPDATE ON facilities
FOR EACH ROW EXECUTE FUNCTION update_location();

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER facilities_updated_at_trigger
BEFORE UPDATE ON facilities
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Scrape runs tracking table
CREATE TABLE scrape_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'running', -- 'running', 'completed', 'failed'
  facilities_found INTEGER DEFAULT 0,
  facilities_new INTEGER DEFAULT 0,
  facilities_updated INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Search function using PostGIS
-- Usage: SELECT * FROM search_facilities(41.8781, -87.6298, 5, '{"daycare", "preschool"}')
CREATE OR REPLACE FUNCTION search_facilities(
  search_lat DECIMAL,
  search_lng DECIMAL,
  radius_miles DECIMAL DEFAULT 5,
  filter_types facility_type[] DEFAULT NULL,
  filter_age_months INTEGER DEFAULT NULL,
  filter_max_cost DECIMAL DEFAULT NULL,
  filter_enrollment_open BOOLEAN DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  types facility_type[],
  address TEXT,
  city TEXT,
  zip TEXT,
  neighborhood TEXT,
  phone TEXT,
  website TEXT,
  age_min_months INTEGER,
  age_max_months INTEGER,
  hours_open TIME,
  hours_close TIME,
  hours_days TEXT,
  cost_amount DECIMAL,
  cost_period cost_period,
  cost_notes TEXT,
  enrollment_open BOOLEAN,
  enrollment_deadline DATE,
  waitlist_available BOOLEAN,
  enrollment_notes TEXT,
  license_status license_status,
  capacity INTEGER,
  has_transportation BOOLEAN,
  meals_provided BOOLEAN,
  languages TEXT[],
  special_programs TEXT[],
  rating DECIMAL,
  review_count INTEGER,
  distance_miles DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id,
    f.name,
    f.types,
    f.address,
    f.city,
    f.zip,
    f.neighborhood,
    f.phone,
    f.website,
    f.age_min_months,
    f.age_max_months,
    f.hours_open,
    f.hours_close,
    f.hours_days,
    f.cost_amount,
    f.cost_period,
    f.cost_notes,
    f.enrollment_open,
    f.enrollment_deadline,
    f.waitlist_available,
    f.enrollment_notes,
    f.license_status,
    f.capacity,
    f.has_transportation,
    f.meals_provided,
    f.languages,
    f.special_programs,
    f.rating,
    f.review_count,
    (ST_Distance(
      f.location,
      ST_SetSRID(ST_MakePoint(search_lng, search_lat), 4326)::geography
    ) / 1609.344)::DECIMAL AS distance_miles
  FROM facilities f
  WHERE 
    -- Distance filter
    ST_DWithin(
      f.location,
      ST_SetSRID(ST_MakePoint(search_lng, search_lat), 4326)::geography,
      radius_miles * 1609.344 -- Convert miles to meters
    )
    -- Type filter
    AND (filter_types IS NULL OR f.types && filter_types)
    -- Age filter
    AND (filter_age_months IS NULL OR (
      f.age_min_months <= filter_age_months 
      AND f.age_max_months >= filter_age_months
    ))
    -- Cost filter (normalized to monthly)
    AND (filter_max_cost IS NULL OR (
      CASE f.cost_period
        WHEN 'yearly' THEN f.cost_amount / 12
        WHEN 'weekly' THEN f.cost_amount * 4.33
        WHEN 'daily' THEN f.cost_amount * 21.67
        ELSE f.cost_amount
      END <= filter_max_cost
    ))
    -- Enrollment filter
    AND (filter_enrollment_open IS NULL OR f.enrollment_open = filter_enrollment_open)
  ORDER BY distance_miles ASC;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security policies (for Supabase)
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read" ON facilities
  FOR SELECT USING (true);

-- Only allow service role to insert/update (from scrapers)
CREATE POLICY "Allow service role insert" ON facilities
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Allow service role update" ON facilities
  FOR UPDATE USING (auth.role() = 'service_role');
