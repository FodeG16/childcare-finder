import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Chicago center coordinates (fallback)
const CHICAGO_CENTER = { lat: 41.8781, lng: -87.6298 };

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  // Get search parameters
  const lat = parseFloat(searchParams.get('lat') || String(CHICAGO_CENTER.lat));
  const lng = parseFloat(searchParams.get('lng') || String(CHICAGO_CENTER.lng));
  const radius = parseFloat(searchParams.get('radius') || '5');
  const facilityTypes = searchParams.get('types')?.split(',').filter(Boolean) || [];
  const childAge = searchParams.get('childAge') ? parseInt(searchParams.get('childAge')!) : undefined;
  const maxCost = searchParams.get('maxCost') ? parseFloat(searchParams.get('maxCost')!) : undefined;
  const enrollmentOpen = searchParams.get('enrollmentOpen') === 'true';

  try {
    // Use the PostGIS function to find nearby facilities
    const { data: facilities, error: facilityError } = await supabase
      .rpc('search_facilities_nearby', {
        search_lat: lat,
        search_lng: lng,
        radius_miles: radius,
      });

    if (facilityError) {
      console.error('Facility search error:', facilityError);
      return NextResponse.json({ error: facilityError.message }, { status: 500 });
    }

    if (!facilities || facilities.length === 0) {
      return NextResponse.json({ facilities: [], programs: [] });
    }

    // Get facility IDs for program lookup
    const facilityIds = facilities.map((f: any) => f.id);

    // Fetch programs for these facilities
    let programQuery = supabase
      .from('programs')
      .select('*')
      .in('facility_id', facilityIds);

    // Filter by child age if specified
    if (childAge !== undefined) {
      programQuery = programQuery
        .lte('age_min_months', childAge)
        .gte('age_max_months', childAge);
    }

    // Filter by enrollment status
    if (enrollmentOpen) {
      programQuery = programQuery.eq('enrollment_status', 'open');
    }

    const { data: programs, error: programError } = await programQuery;

    if (programError) {
      console.error('Program search error:', programError);
      return NextResponse.json({ error: programError.message }, { status: 500 });
    }

    // Filter facilities by type if specified - check BOTH facility_types AND program types
    let filteredFacilities = facilities;
    let filteredPrograms = programs || [];
    
    if (facilityTypes.length > 0) {
      // First filter programs by program_type
      filteredPrograms = filteredPrograms.filter((p: any) =>
        facilityTypes.includes(p.program_type)
      );
      
      // Then only keep facilities that have matching programs
      const facilityIdsWithMatchingPrograms = new Set(filteredPrograms.map((p: any) => p.facility_id));
      filteredFacilities = facilities.filter((f: any) =>
        facilityIdsWithMatchingPrograms.has(f.id)
      );
    }

    // Filter programs by max cost if specified
    if (maxCost !== undefined) {
      filteredPrograms = filteredPrograms.filter((p: any) => {
        if (p.cost_amount === null) return true; // Include "contact for pricing"
        let monthlyCost = p.cost_amount;
        if (p.cost_period === 'yearly') monthlyCost = p.cost_amount / 12;
        else if (p.cost_period === 'weekly') monthlyCost = p.cost_amount * 4.33;
        return monthlyCost <= maxCost;
      });
    }

    // Only include facilities that have matching programs
    const facilityIdsWithPrograms = new Set(filteredPrograms.map((p: any) => p.facility_id));
    if (childAge !== undefined || maxCost !== undefined || enrollmentOpen) {
      filteredFacilities = filteredFacilities.filter((f: any) => 
        facilityIdsWithPrograms.has(f.id)
      );
    }

    // Deduplicate facilities by ID (in case of multiple seed runs)
    const seenIds = new Set<string>();
    const uniqueFacilities = filteredFacilities.filter((f: any) => {
      if (seenIds.has(f.id)) return false;
      seenIds.add(f.id);
      return true;
    });

    return NextResponse.json({
      facilities: uniqueFacilities,
      programs: filteredPrograms,
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
