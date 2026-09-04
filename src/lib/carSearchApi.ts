/**
 * Skatteverket förmånsbil-API (RowStore)
 * https://skatteverket.entryscape.net/rowstore/dataset/fad86bf9-67e3-4d68-829c-7b9a23bc5e42
 */

const API_BASE_URL = 'https://skatteverket.entryscape.net/rowstore/dataset/fad86bf9-67e3-4d68-829c-7b9a23bc5e42'

export interface CarSearchResult {
  id: string
  label: string // Visningsnamn (märke + modell + år)
  marke: string
  modell: string
  tillverkningsar: string
  bransletyp: string
  nybilspris: number
  vardeefterschablon: number
  fordonsskatt?: number
}

// ponytail: in-memory cache per märke+år, räcker för en session
const cache = new Map<string, { data: CarSearchResult[]; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000

function mapApiItem(item: Record<string, unknown>): CarSearchResult | null {
  const marke = String(item.marke || item.märke || '').trim()
  const modell = String(item.modell || '').trim()
  if (!marke && !modell) return null
  const tillverkningsar = String(item.tillverkningsar || item.tillverkningsår || '').trim()
  const kod = String(item.kod || '')
  return {
    id: kod || `${marke}-${modell}-${tillverkningsar}`,
    label: `${marke} ${modell} (${tillverkningsar})`.trim(),
    marke,
    modell,
    tillverkningsar,
    bransletyp: String(item.bransletyp || item.bränsletyp || '').trim(),
    nybilspris: Number(item.nybilspris) || 0,
    vardeefterschablon: Number(item.vardeefterschablon) || 0,
    fordonsskatt: Number(item.fordonsskatt || item.skatt) || undefined,
  }
}

/**
 * Hämtar modeller för ett märke och tillverkningsår.
 * API:et är skiftlägeskänsligt på märke, så några varianter provas.
 */
export async function searchCarModels(
  year: string,
  brand: string,
  signal?: AbortSignal
): Promise<CarSearchResult[]> {
  if (!year || !brand) return []

  const cacheKey = `${brand.toLowerCase()}_${year}`
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.data

  const variants = [
    brand,
    brand.charAt(0).toUpperCase() + brand.slice(1).toLowerCase(),
    brand.toUpperCase(),
    brand.toLowerCase(),
  ]

  for (const variant of new Set(variants)) {
    try {
      const url = `${API_BASE_URL}?marke=${encodeURIComponent(variant)}&tillverkningsar=${encodeURIComponent(year)}&_limit=500`
      const response = await fetch(url, { headers: { Accept: 'application/json' }, signal })
      if (!response.ok) continue

      const data = await response.json()
      if (!Array.isArray(data.results) || data.results.length === 0) continue

      const sorted = (data.results as Record<string, unknown>[])
        .map(mapApiItem)
        .filter((car): car is CarSearchResult => car !== null)
        .sort((a, b) => a.modell.localeCompare(b.modell, 'sv'))

      cache.set(cacheKey, { data: sorted, timestamp: Date.now() })
      return sorted
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw error
      console.warn(`Skatteverket-anrop misslyckades för "${variant}":`, error)
    }
  }

  return []
}
