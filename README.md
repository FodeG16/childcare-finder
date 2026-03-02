# Chicago Childcare Finder

A web application to help parents research and compare childcare options in the Chicago area.

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

## Project Structure

```
childcare-finder/
├── src/
│   ├── app/
│   │   ├── layout.tsx      # Root layout
│   │   ├── page.tsx        # Main search page
│   │   └── globals.css     # Global styles
│   ├── components/
│   │   ├── SearchForm.tsx  # Address + filter inputs
│   │   └── ResultsTable.tsx # Sortable results table
│   └── lib/
│       ├── types.ts        # TypeScript interfaces
│       └── sample-data.ts  # Mock Chicago data
├── scrapers/               # Apify actors (separate deployment)
│   └── illinois-dcfs/      # IL childcare licensing scraper
└── README.md
```

## Data Model

The `Facility` type in `src/lib/types.ts` defines all fields we collect:

| Field | Description | Source |
|-------|-------------|--------|
| name, address, phone | Basic contact info | Licensing DB |
| ageRange | Min/max age in months | Licensing DB |
| hours | Operating hours | Website scrape |
| cost | Monthly/yearly cost | Manual or website |
| enrollment | Open/closed/waitlist status | Website scrape |
| licenseNumber | State license ID | Licensing DB |
| rating, reviewCount | Aggregate reviews | Google Places API |

## Data Sources for Chicago

### Primary: Illinois DCFS Licensing Database
- URL: https://www.ilgateways.com/provider-search
- Contains: All licensed daycares and childcare centers
- Fields: Name, address, license status, capacity, ages served

### Secondary: Chicago Public Schools
- URL: https://www.cps.edu/schools/
- Contains: All CPS elementary schools with Pre-K/K programs
- Fields: School info, programs offered, enrollment info

### Enrichment: Google Places API
- Use for: Hours, reviews, photos
- Cost: $17 per 1000 requests (Place Details)

## Next Steps

1. **Database Setup** (Supabase)
   - Create PostgreSQL database with PostGIS extension
   - Import schema from `schema.sql`

2. **Apify Scrapers**
   - Deploy Illinois DCFS scraper
   - Set up scheduled runs (weekly)

3. **API Routes**
   - Add `/api/search` endpoint
   - Integrate geocoding for address input

4. **Deployment**
   - Deploy to Vercel
   - Configure environment variables

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Google Maps (for geocoding)
GOOGLE_MAPS_API_KEY=your-api-key

# Apify (for scrapers)
APIFY_API_TOKEN=your-token
```
 
