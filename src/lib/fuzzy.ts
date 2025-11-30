/**
 * Lightweight fuzzy search implementation
 * No external dependencies - pure TypeScript
 */

export interface FuzzyMatch<T> {
  item: T
  score: number
  matches: Array<{
    indices: Array<[number, number]>
    key: string
    value: string
  }>
}

interface FuzzyOptions<T> {
  keys: Array<keyof T>
  threshold?: number // 0-1, lower = stricter match
  ignoreCase?: boolean
}

/**
 * Calculate fuzzy match score between query and target string
 * Returns score 0-1 (1 = perfect match, 0 = no match)
 */
function fuzzyScore(query: string, target: string, ignoreCase: boolean): { score: number; indices: Array<[number, number]> } {
  if (!query || !target) return { score: 0, indices: [] }
  
  const q = ignoreCase ? query.toLowerCase() : query
  const t = ignoreCase ? target.toLowerCase() : target
  
  // Exact match
  if (t === q) return { score: 1, indices: [[0, t.length - 1]] }
  
  // Contains match
  const containsIndex = t.indexOf(q)
  if (containsIndex !== -1) {
    return { 
      score: 0.9 - (containsIndex * 0.01), // Prefer matches at start
      indices: [[containsIndex, containsIndex + q.length - 1]]
    }
  }
  
  // Fuzzy character matching
  let qIdx = 0
  let tIdx = 0
  let matches = 0
  const indices: Array<[number, number]> = []
  let currentMatchStart = -1
  
  while (qIdx < q.length && tIdx < t.length) {
    if (q[qIdx] === t[tIdx]) {
      if (currentMatchStart === -1) currentMatchStart = tIdx
      matches++
      qIdx++
    } else {
      if (currentMatchStart !== -1) {
        indices.push([currentMatchStart, tIdx - 1])
        currentMatchStart = -1
      }
    }
    tIdx++
  }
  
  // Close any open match
  if (currentMatchStart !== -1) {
    indices.push([currentMatchStart, tIdx - 1])
  }
  
  // Not all query characters found
  if (qIdx < q.length) return { score: 0, indices: [] }
  
  // Score based on match ratio and string length
  const score = (matches / q.length) * (q.length / t.length) * 0.8
  return { score, indices }
}

/**
 * Perform fuzzy search on array of items
 */
export function fuzzySearch<T extends Record<string, unknown>>(
  items: T[],
  query: string,
  options: FuzzyOptions<T>
): FuzzyMatch<T>[] {
  const { keys, threshold = 0.3, ignoreCase = true } = options
  
  if (!query || query.length < 2) return []
  
  const results: FuzzyMatch<T>[] = []
  
  for (const item of items) {
    let bestScore = 0
    const allMatches: FuzzyMatch<T>['matches'] = []
    
    for (const key of keys) {
      const value = item[key]
      if (typeof value !== 'string') continue
      
      const { score, indices } = fuzzyScore(query, value, ignoreCase)
      
      if (score > bestScore) {
        bestScore = score
      }
      
      if (indices.length > 0) {
        allMatches.push({
          key: String(key),
          value,
          indices
        })
      }
    }
    
    if (bestScore >= threshold) {
      results.push({
        item,
        score: bestScore,
        matches: allMatches
      })
    }
  }
  
  // Sort by score descending
  return results.sort((a, b) => b.score - a.score)
}

/**
 * Highlight matched portions of a string
 */
export function highlightMatches(
  text: string,
  indices: Array<[number, number]>
): Array<{ text: string; highlight: boolean }> {
  if (!indices.length) {
    return [{ text, highlight: false }]
  }
  
  const result: Array<{ text: string; highlight: boolean }> = []
  let lastEnd = 0
  
  // Sort indices by start position
  const sortedIndices = [...indices].sort((a, b) => a[0] - b[0])
  
  for (const [start, end] of sortedIndices) {
    // Add non-highlighted text before this match
    if (start > lastEnd) {
      result.push({
        text: text.slice(lastEnd, start),
        highlight: false
      })
    }
    
    // Add highlighted text
    result.push({
      text: text.slice(start, end + 1),
      highlight: true
    })
    
    lastEnd = end + 1
  }
  
  // Add remaining text
  if (lastEnd < text.length) {
    result.push({
      text: text.slice(lastEnd),
      highlight: false
    })
  }
  
  return result
}

