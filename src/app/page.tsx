'use client';

import { useState, useCallback } from 'react';
import SearchForm from '@/components/SearchForm';
import ResultsTable from '@/components/ResultsTable';
import CompareModal from '@/components/CompareModal';
import MapView from '@/components/MapView';
import { Facility, Program, SearchFilters, ProgramRow } from '@/lib/types';
import { Map, Table, Database, AlertCircle } from 'lucide-react';

// Transform API response to our Facility type
function transformFacility(dbFacility: any, dbPrograms: any[]): Facility {
  const programs: Program[] = dbPrograms
    .filter(p => p.facility_id === dbFacility.id)
    .map(p => ({
      id: p.id,
      name: p.name,
      type: p.program_type,
      ageMinMonths: p.age_min_months,
      ageMaxMonths: p.age_max_months,
      daysPerWeek: p.days_per_week,
      daysOffered: p.days_offered || [],
      hoursPerDay: p.hours_per_day,
      startTime: p.start_time,
      endTime: p.end_time,
      costAmount: p.cost_amount,
      costPeriod: p.cost_period,
      costNotes: p.cost_notes,
      enrollmentStatus: p.enrollment_status,
      enrollmentOpens: p.enrollment_opens,
      enrollmentDeadline: p.enrollment_deadline,
      enrollmentNotes: p.enrollment_notes,
      schoolYearStart: p.school_year_start,
      schoolYearEnd: p.school_year_end,
      spotsTotal: p.spots_total,
      spotsAvailable: p.spots_available,
    }));

  return {
    id: dbFacility.id,
    name: dbFacility.name,
    facilityTypes: dbFacility.facility_types || [],
    address: dbFacility.address,
    city: dbFacility.city,
    state: dbFacility.state,
    zip: dbFacility.zip,
    latitude: parseFloat(dbFacility.latitude),
    longitude: parseFloat(dbFacility.longitude),
    neighborhood: dbFacility.neighborhood,
    phone: dbFacility.phone,
    email: dbFacility.email,
    website: dbFacility.website,
    operatingHours: dbFacility.operating_hours_open ? {
      open: dbFacility.operating_hours_open,
      close: dbFacility.operating_hours_close,
      days: dbFacility.operating_hours_days,
    } : undefined,
    programs,
    academicCalendar: dbFacility.academic_calendar,
    licenseNumber: dbFacility.license_number,
    licenseStatus: dbFacility.license_status,
    hasTransportation: dbFacility.has_transportation,
    mealsProvided: dbFacility.meals_provided,
    languages: dbFacility.languages,
    specialPrograms: dbFacility.special_programs,
    rating: dbFacility.rating ? parseFloat(dbFacility.rating) : undefined,
    reviewCount: dbFacility.review_count,
    distanceMiles: dbFacility.distance_miles ? parseFloat(dbFacility.distance_miles) : undefined,
    sourceUrl: dbFacility.source_url,
    lastUpdated: dbFacility.last_updated,
  };
}

// Simple geocoding using a free service (in production, use Google Maps API)
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  // For demo, use Chicago center if geocoding fails
  const chicagoCenter = { lat: 41.8781, lng: -87.6298 };
  
  // Try to extract zip code and use approximate coordinates
  const zipMatch = address.match(/\b(606\d{2})\b/);
  if (zipMatch) {
    // Rough Chicago zip code coordinates (simplified)
    const zipCoords: Record<string, { lat: number; lng: number }> = {
      '60601': { lat: 41.8867, lng: -87.6186 },
      '60602': { lat: 41.8833, lng: -87.6281 },
      '60606': { lat: 41.8789, lng: -87.6359 },
      '60607': { lat: 41.8724, lng: -87.6503 },
      '60608': { lat: 41.8519, lng: -87.6697 },
      '60610': { lat: 41.9032, lng: -87.6351 },
      '60611': { lat: 41.8929, lng: -87.6120 },
      '60613': { lat: 41.9528, lng: -87.6602 },
      '60614': { lat: 41.9219, lng: -87.6516 },
      '60618': { lat: 41.9465, lng: -87.7042 },
      '60622': { lat: 41.9016, lng: -87.6773 },
      '60625': { lat: 41.9720, lng: -87.7051 },
      '60647': { lat: 41.9203, lng: -87.7026 },
      '60654': { lat: 41.8925, lng: -87.6376 },
      '60657': { lat: 41.9400, lng: -87.6536 },
    };
    return zipCoords[zipMatch[1]] || chicagoCenter;
  }
  
  return chicagoCenter;
}

export default function Home() {
  const [results, setResults] = useState<Facility[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [compareRows, setCompareRows] = useState<ProgramRow[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'map'>('table');
  const [dataSource, setDataSource] = useState<'api' | 'sample'>('api');

  const handleSearch = useCallback(async (filters: SearchFilters) => {
    setIsLoading(true);
    setHasSearched(true);
    setError(null);

    try {
      // Geocode the address
      const coords = await geocodeAddress(filters.address);
      if (!coords) {
        setError('Could not find location. Using Chicago center.');
      }

      // Build query params
      const params = new URLSearchParams({
        lat: String(coords?.lat || 41.8781),
        lng: String(coords?.lng || -87.6298),
        radius: String(filters.radiusMiles),
      });

      if (filters.facilityTypes.length > 0) {
        params.set('types', filters.facilityTypes.join(','));
      }
      if (filters.childAgeMonths !== undefined) {
        params.set('childAge', String(filters.childAgeMonths));
      }
      if (filters.maxCostMonthly !== undefined) {
        params.set('maxCost', String(filters.maxCostMonthly));
      }
      if (filters.enrollmentOpen) {
        params.set('enrollmentOpen', 'true');
      }

      // Call API
      const response = await fetch(`/api/search?${params}`);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Transform to our types
      const facilities = data.facilities.map((f: any) => 
        transformFacility(f, data.programs)
      );

      // Apply client-side filters for days per week
      let filtered = facilities;
      if (filters.minDaysPerWeek !== undefined || filters.maxDaysPerWeek !== undefined) {
        filtered = filtered.filter((f: Facility) =>
          f.programs.some(p => {
            const meetsMin = filters.minDaysPerWeek === undefined || p.daysPerWeek >= filters.minDaysPerWeek;
            const meetsMax = filters.maxDaysPerWeek === undefined || p.daysPerWeek <= filters.maxDaysPerWeek;
            return meetsMin && meetsMax;
          })
        );
      }

      setResults(filtered);
      setDataSource('api');
    } catch (err) {
      console.error('Search error:', err);
      setError('Database search failed. Make sure you\'ve run the schema and seed scripts.');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleCompare = (rows: ProgramRow[]) => {
    setCompareRows(rows);
    setShowCompare(true);
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Chicago Childcare Finder
              </h1>
              <p className="text-gray-600 mt-1">
                Search daycares, preschools, and schools in the Chicago area
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Database className="w-4 h-4 text-green-500" />
              <span className="text-gray-500">
                {dataSource === 'api' ? 'Connected to Supabase' : 'Using sample data'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <SearchForm onSearch={handleSearch} />

        {/* Error message */}
        {error && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="text-yellow-800 font-medium">Search Notice</p>
              <p className="text-yellow-700 text-sm">{error}</p>
              <p className="text-yellow-600 text-xs mt-1">
                Run <code className="bg-yellow-100 px-1 rounded">npm run seed</code> to populate the database with sample data.
              </p>
            </div>
          </div>
        )}

        {/* View toggle */}
        {hasSearched && results.length > 0 && (
          <div className="mb-4 flex justify-end">
            <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 text-sm rounded-md flex items-center gap-1.5 transition-colors ${
                  viewMode === 'table' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Table className="w-4 h-4" />
                Table
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`px-3 py-1.5 text-sm rounded-md flex items-center gap-1.5 transition-colors ${
                  viewMode === 'map' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Map className="w-4 h-4" />
                Map
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        {hasSearched && viewMode === 'table' && (
          <ResultsTable 
            facilities={results} 
            isLoading={isLoading} 
            onCompare={handleCompare}
          />
        )}

        {hasSearched && viewMode === 'map' && (
          <MapView 
            facilities={results} 
            onSelectFacility={(id) => console.log('Selected:', id)}
          />
        )}

        {/* Welcome state */}
        {!hasSearched && (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
            <div className="max-w-md mx-auto">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Find the right childcare for your family
              </h2>
              <p className="text-gray-600 mb-4">
                Enter your address or zip code above to search for daycares, preschools, and schools in your area.
              </p>
              <div className="text-sm text-gray-500 space-y-1">
                <p>✓ Compare program schedules and costs side-by-side</p>
                <p>✓ Filter by age, days/week, and enrollment status</p>
                <p>✓ See enrollment deadlines and school year dates</p>
                <p>✓ View results on a map</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-auto py-6 text-center text-sm text-gray-500">
        <p>Data from Supabase database. Updated enrollment dates for 2026-2027 school year.</p>
      </footer>

      {/* Compare Modal */}
      {showCompare && (
        <CompareModal 
          rows={compareRows} 
          onClose={() => setShowCompare(false)} 
        />
      )}
    </main>
  );
}
