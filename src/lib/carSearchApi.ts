/**
 * Car Search API - Skatteverket Förmånsbil
 * Implements caching and AbortController for optimal performance
 */

const API_BASE_URL = 'https://skatteverket.entryscape.net/rowstore/dataset/fad86bf9-67e3-4d68-829c-7b9a23bc5e42'

export interface CarSearchResult {
  id: string
  label: string // Display name (märke + modell + år)
  marke: string
  modell: string
  tillverkningsar: string
  bransletyp: string
  nybilspris: number
  vardeefterschablon: number
  fordonsskatt?: number
}

// Cache for brand searches - reduces API calls
const brandCache = new Map<string, { data: CarSearchResult[]; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Extract brand (first word) from search query
 */
function extractBrand(query: string): string {
  return query.trim().split(/\s+/)[0] || ''
}

/**
 * Map API response to CarSearchResult
 */
function mapApiItem(item: Record<string, unknown>): CarSearchResult | null {
  try {
    const marke = String(item.marke || item.märke || '').trim()
    const modell = String(item.modell || '').trim()
    const tillverkningsar = String(item.tillverkningsar || item.tillverkningsår || '').trim()
    const bransletyp = String(item.bransletyp || item.bränsletyp || '').trim()
    const nybilspris = Number(item.nybilspris) || 0
    const vardeefterschablon = Number(item.vardeefterschablon) || 0
    const fordonsskatt = Number(item.fordonsskatt || item.skatt) || undefined
    const kod = String(item.kod || '')
    
    if (!marke && !modell) return null
    
    return {
      id: kod || `${marke}-${modell}-${tillverkningsar}`,
      label: `${marke} ${modell} (${tillverkningsar})`.trim(),
      marke,
      modell,
      tillverkningsar,
      bransletyp,
      nybilspris,
      vardeefterschablon,
      fordonsskatt
    }
  } catch {
    return null
  }
}

/**
 * Fetch cars by brand from API with pagination
 * Uses cache to avoid repeated API calls
 * API has a limit of 100 results per request, so we paginate
 */
async function fetchByBrand(
  brand: string,
  signal?: AbortSignal
): Promise<CarSearchResult[]> {
  const cacheKey = brand.toLowerCase()
  const cached = brandCache.get(cacheKey)
  
  // Return cached data if still valid
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`📦 Using cached data for "${brand}" (${cached.data.length} cars)`)
    return cached.data
  }
  
  // Try different case variants
  const variants = [
    brand,
    brand.charAt(0).toUpperCase() + brand.slice(1).toLowerCase(),
    brand.toUpperCase(),
    brand.toLowerCase()
  ]
  
  for (const variant of variants) {
    try {
      const allCars: CarSearchResult[] = []
      let offset = 0
      const limit = 500 // API max per request (documented max is 500)
      let hasMore = true
      
      console.log(`🔍 Fetching all cars for "${variant}" (paginated, limit=${limit})...`)
      
      // Fetch pages until we get less than limit results
      while (hasMore && offset < 5000) { // Safety limit: max 5000 cars
        const url = `${API_BASE_URL}?marke=${encodeURIComponent(variant)}&_limit=${limit}&_offset=${offset}`
        
        const response = await fetch(url, {
          headers: { 'Accept': 'application/json' },
          signal
        })
        
        if (!response.ok) {
          hasMore = false
          continue
        }
        
        const data = await response.json()
        
        if (data.results && Array.isArray(data.results) && data.results.length > 0) {
          const mapped = (data.results as Record<string, unknown>[])
            .map(mapApiItem)
            .filter((car): car is CarSearchResult => car !== null)
          
          allCars.push(...mapped)
          console.log(`  📄 Page ${offset / limit + 1}: Got ${mapped.length} cars (total: ${allCars.length})`)
          
          // If we got less than limit, we've reached the end
          if (data.results.length < limit) {
            hasMore = false
          } else {
            offset += limit
          }
        } else {
          hasMore = false
        }
      }
      
      if (allCars.length > 0) {
        // Cache the results
        brandCache.set(cacheKey, { data: allCars, timestamp: Date.now() })
        console.log(`✅ Fetched and cached ${allCars.length} cars for "${variant}"`)
        return allCars
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('🛑 Request aborted')
        throw error
      }
      console.warn(`Failed for variant "${variant}":`, error)
    }
  }
  
  return []
}

/**
 * Search for car models by year and brand
 * Uses API parameters: marke + tillverkningsar
 */
export async function searchCarModels(
  year: string,
  brand: string,
  signal?: AbortSignal
): Promise<CarSearchResult[]> {
  if (!year || !brand) {
    return []
  }
  
  console.log(`🔎 Searching models for: ${brand} ${year}`)
  
  // Cache key includes both brand and year
  const cacheKey = `${brand.toLowerCase()}_${year}`
  const cached = brandCache.get(cacheKey)
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`📦 Using cached data for "${brand} ${year}" (${cached.data.length} cars)`)
    return cached.data
  }
  
  // Try different case variants for brand
  const brandVariants = [
    brand,
    brand.charAt(0).toUpperCase() + brand.slice(1).toLowerCase(),
    brand.toUpperCase(),
    brand.toLowerCase()
  ]
  
  for (const brandVariant of brandVariants) {
    try {
      // Use both marke AND tillverkningsar in API query
      const url = `${API_BASE_URL}?marke=${encodeURIComponent(brandVariant)}&tillverkningsar=${encodeURIComponent(year)}&_limit=500`
      console.log(`🔍 Fetching: ${brandVariant} ${year}`)
      
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal
      })
      
      if (!response.ok) continue
      
      const data = await response.json()
      
      if (data.results && Array.isArray(data.results) && data.results.length > 0) {
        const mapped = (data.results as Record<string, unknown>[])
          .map(mapApiItem)
          .filter((car): car is CarSearchResult => car !== null)
        
        // Sort by model name
        const sorted = sortByModelName(mapped)
        
        // Cache the results
        brandCache.set(cacheKey, { data: sorted, timestamp: Date.now() })
        console.log(`✅ Found ${sorted.length} models for ${brandVariant} ${year}`)
        
        return sorted
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('🛑 Request aborted')
        throw error
      }
      console.warn(`Failed for variant "${brandVariant}":`, error)
    }
  }
  
  console.log(`❌ No cars found for ${brand} ${year}`)
  return []
}

/**
 * Legacy search function - kept for backwards compatibility
 */
export async function searchCars(
  query: string,
  signal?: AbortSignal
): Promise<CarSearchResult[]> {
  const trimmed = query.trim()
  
  if (trimmed.length < 2) {
    return []
  }
  
  const brand = extractBrand(trimmed)
  
  try {
    const allBrandCars = await fetchByBrand(brand, signal)
    return sortByModelName(allBrandCars).slice(0, 20)
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error
    }
    console.error('Search error:', error)
    return []
  }
}

/**
 * Sort cars alphabetically by model name
 */
function sortByModelName(cars: CarSearchResult[]): CarSearchResult[] {
  return [...cars].sort((a, b) => a.modell.localeCompare(b.modell, 'sv'))
}

/**
 * Clear the brand cache (useful for testing or refresh)
 */
export function clearCache(): void {
  brandCache.clear()
  console.log('🧹 Cache cleared')
}

