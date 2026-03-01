/**
 * Illinois DCFS Childcare Licensing Scraper
 * 
 * Scrapes the IL Gateways provider search for licensed childcare facilities.
 * Target URL: https://www.ilgateways.com/provider-search
 * 
 * This scraper uses Puppeteer because the search requires JavaScript rendering.
 */

import { Actor } from 'apify';
import { PuppeteerCrawler, Dataset } from 'crawlee';

// Input schema - what zip codes/areas to search
const INPUT_SCHEMA = {
  zipCodes: ['60601', '60602', '60603'], // Default: Downtown Chicago
  searchRadius: 10, // miles
  maxResults: 1000,
};

await Actor.init();

// Get input from Apify console or use defaults
const input = await Actor.getInput() ?? INPUT_SCHEMA;
const { zipCodes, searchRadius, maxResults } = input;

console.log(`Starting scrape for ${zipCodes.length} zip codes...`);

// Store for scraped facilities
const facilities = [];

const crawler = new PuppeteerCrawler({
  maxRequestsPerCrawl: maxResults,
  
  // Browser configuration
  launchContext: {
    launchOptions: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
  },

  async requestHandler({ page, request, log }) {
    const { zipCode } = request.userData;
    log.info(`Scraping zip code: ${zipCode}`);

    // Navigate to the provider search page
    await page.goto('https://www.ilgateways.com/provider-search', {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });

    // Wait for the search form to load
    await page.waitForSelector('input[name="zip"]', { timeout: 10000 });

    // Fill in the search form
    await page.type('input[name="zip"]', zipCode);
    
    // Select search radius if available
    const radiusSelect = await page.$('select[name="radius"]');
    if (radiusSelect) {
      await page.select('select[name="radius"]', String(searchRadius));
    }

    // Click search button
    await page.click('button[type="submit"], input[type="submit"]');

    // Wait for results to load
    await page.waitForSelector('.provider-result, .search-results, .no-results', {
      timeout: 30000,
    });

    // Extract facility data from results
    const results = await page.evaluate(() => {
      const items = [];
      
      // Adjust selectors based on actual page structure
      // This is a template - you'll need to inspect the actual page
      const resultElements = document.querySelectorAll('.provider-result, .provider-card');
      
      resultElements.forEach((el) => {
        const getText = (selector) => {
          const elem = el.querySelector(selector);
          return elem ? elem.textContent.trim() : null;
        };

        const item = {
          name: getText('.provider-name, h3, .name'),
          address: getText('.address, .location'),
          phone: getText('.phone, .tel'),
          licenseNumber: getText('.license-number, .license'),
          licenseStatus: getText('.license-status, .status'),
          capacity: getText('.capacity'),
          agesServed: getText('.ages, .age-range'),
          facilityType: getText('.type, .facility-type'),
        };

        // Only add if we got a name
        if (item.name) {
          items.push(item);
        }
      });

      return items;
    });

    log.info(`Found ${results.length} facilities for zip ${zipCode}`);

    // Process and normalize each result
    for (const result of results) {
      const facility = {
        // Basic info
        name: result.name,
        address: result.address,
        phone: result.phone,
        
        // Parse city/state/zip from address
        ...parseAddress(result.address),
        
        // Licensing
        licenseNumber: result.licenseNumber,
        licenseStatus: normalizeLicenseStatus(result.licenseStatus),
        
        // Capacity and ages
        capacity: parseCapacity(result.capacity),
        ageRange: parseAgeRange(result.agesServed),
        
        // Facility type
        type: normalizeFacilityType(result.facilityType),
        
        // Meta
        sourceUrl: 'https://www.ilgateways.com/provider-search',
        sourceZipCode: zipCode,
        scrapedAt: new Date().toISOString(),
      };

      facilities.push(facility);
    }

    // Check for pagination / "next" button
    const nextButton = await page.$('.pagination .next:not(.disabled), a[rel="next"]');
    if (nextButton && facilities.length < maxResults) {
      const nextUrl = await page.evaluate(
        (el) => el.href,
        nextButton
      );
      if (nextUrl) {
        await crawler.addRequests([{
          url: nextUrl,
          userData: { zipCode },
        }]);
      }
    }
  },

  failedRequestHandler({ request, log }) {
    log.error(`Request failed: ${request.url}`);
  },
});

// Helper functions for data normalization
function parseAddress(address) {
  if (!address) return { city: null, state: 'IL', zip: null };
  
  // Basic address parsing - improve based on actual data format
  const parts = address.split(',').map(p => p.trim());
  const lastPart = parts[parts.length - 1] || '';
  const stateZipMatch = lastPart.match(/([A-Z]{2})\s*(\d{5})/);
  
  return {
    city: parts.length > 1 ? parts[parts.length - 2] : null,
    state: stateZipMatch ? stateZipMatch[1] : 'IL',
    zip: stateZipMatch ? stateZipMatch[2] : null,
  };
}

function normalizeLicenseStatus(status) {
  if (!status) return 'unknown';
  const lower = status.toLowerCase();
  if (lower.includes('active') || lower.includes('licensed')) return 'active';
  if (lower.includes('provisional')) return 'provisional';
  if (lower.includes('expired')) return 'expired';
  return 'unknown';
}

function parseCapacity(capacityStr) {
  if (!capacityStr) return null;
  const match = capacityStr.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

function parseAgeRange(agesStr) {
  if (!agesStr) return { minMonths: 0, maxMonths: 144 };
  
  // Parse common formats like "6 weeks - 5 years", "Infant - Pre-K"
  // This is simplified - expand based on actual data
  const lower = agesStr.toLowerCase();
  
  let minMonths = 0;
  let maxMonths = 144; // 12 years default max
  
  if (lower.includes('infant') || lower.includes('6 week')) minMonths = 0;
  else if (lower.includes('toddler')) minMonths = 12;
  else if (lower.includes('preschool')) minMonths = 36;
  
  if (lower.includes('pre-k') || lower.includes('prek')) maxMonths = 60;
  else if (lower.includes('kindergarten')) maxMonths = 72;
  
  return { minMonths, maxMonths };
}

function normalizeFacilityType(typeStr) {
  if (!typeStr) return ['daycare'];
  
  const lower = typeStr.toLowerCase();
  const types = [];
  
  if (lower.includes('home') || lower.includes('family')) types.push('home-daycare');
  if (lower.includes('center') || lower.includes('daycare')) types.push('daycare');
  if (lower.includes('preschool')) types.push('preschool');
  if (lower.includes('montessori')) types.push('montessori');
  if (lower.includes('pre-k') || lower.includes('prek')) types.push('pre-k');
  
  return types.length > 0 ? types : ['daycare'];
}

// Build initial request list from zip codes
const initialRequests = zipCodes.map((zipCode) => ({
  url: 'https://www.ilgateways.com/provider-search',
  uniqueKey: `zip-${zipCode}`,
  userData: { zipCode },
}));

// Run the crawler
await crawler.run(initialRequests);

// Deduplicate by license number or name+address
const seen = new Set();
const uniqueFacilities = facilities.filter((f) => {
  const key = f.licenseNumber || `${f.name}-${f.address}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

console.log(`Scrape complete. Found ${uniqueFacilities.length} unique facilities.`);

// Save results to Apify dataset
await Dataset.pushData(uniqueFacilities);

// Also save summary stats
await Actor.setValue('stats', {
  totalFacilities: uniqueFacilities.length,
  zipCodesSearched: zipCodes.length,
  scrapedAt: new Date().toISOString(),
});

await Actor.exit();
