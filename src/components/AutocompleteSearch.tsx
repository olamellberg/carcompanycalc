import { useState, useEffect, useRef, useCallback, KeyboardEvent } from 'react'
import { Search, Loader2, X } from 'lucide-react'
import { searchCars, type CarSearchResult } from '../lib/carSearchApi'

interface AutocompleteSearchProps {
  value: string
  onChange: (value: string) => void
  onSelect: (car: CarSearchResult) => void
  onManualEntry?: (modelName: string) => void // Called when user wants to add manually
  placeholder?: string
  className?: string
}

export default function AutocompleteSearch({
  value,
  onChange,
  onSelect,
  onManualEntry,
  placeholder = 'Sök bilmodell...',
  className = ''
}: AutocompleteSearchProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<CarSearchResult[]>([])
  const [activeIndex, setActiveIndex] = useState(-1)
  const [error, setError] = useState<string | null>(null)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastSearchRef = useRef<string>('')
  const isSelectingRef = useRef(false)

  // Debounce settings - wait for user to stop typing
  const DEBOUNCE_MS = 600 // 600ms wait after last keystroke

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  // Search function with debounce + throttle
  const performSearch = useCallback(async (query: string) => {
    const trimmed = query.trim()
    
    // Skip if same as last search
    if (trimmed === lastSearchRef.current) {
      return
    }
    
    // Skip if too short
    if (trimmed.length < 2) {
      setResults([])
      setIsOpen(false)
      setIsLoading(false)
      return
    }
    
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // Create new AbortController
    abortControllerRef.current = new AbortController()
    lastSearchRef.current = trimmed
    
    setIsLoading(true)
    setError(null)
    
    try {
      const cars = await searchCars(trimmed, abortControllerRef.current.signal)
      
      setResults(cars)
      setIsOpen(cars.length > 0)
      setActiveIndex(-1)
      
      if (cars.length === 0 && trimmed.length >= 2) {
        setError('Inga resultat hittades')
        setIsOpen(true)
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was cancelled, ignore
        return
      }
      console.error('Search error:', err)
      setError('Sökningen misslyckades')
      setIsOpen(true)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Handle input change with debounce only
  const handleInputChange = useCallback((newValue: string) => {
    onChange(newValue)
    
    // Skip if selecting from dropdown
    if (isSelectingRef.current) {
      return
    }
    
    // Clear previous debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    
    const trimmed = newValue.trim()
    
    // Show loading indicator if we have enough characters
    if (trimmed.length >= 2) {
      setIsLoading(true)
    } else {
      setResults([])
      setIsOpen(false)
      setIsLoading(false)
      return
    }
    
    // Debounce: wait for user to stop typing before searching
    debounceTimerRef.current = setTimeout(() => {
      performSearch(newValue)
    }, DEBOUNCE_MS)
  }, [onChange, performSearch])

  // Handle item selection
  const handleSelect = useCallback((car: CarSearchResult) => {
    isSelectingRef.current = true
    onChange(car.label)
    onSelect(car)
    setIsOpen(false)
    setResults([])
    setActiveIndex(-1)
    
    // Reset selecting flag after a short delay
    setTimeout(() => {
      isSelectingRef.current = false
    }, 100)
  }, [onChange, onSelect])

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' && results.length > 0) {
        setIsOpen(true)
        setActiveIndex(0)
        e.preventDefault()
      }
      return
    }
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex(prev => 
          prev < results.length - 1 ? prev + 1 : prev
        )
        break
        
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex(prev => prev > 0 ? prev - 1 : -1)
        break
        
      case 'Enter':
        e.preventDefault()
        if (activeIndex >= 0 && results[activeIndex]) {
          handleSelect(results[activeIndex])
        }
        break
        
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        setActiveIndex(-1)
        inputRef.current?.blur()
        break
        
      case 'Tab':
        setIsOpen(false)
        break
    }
  }, [isOpen, results, activeIndex, handleSelect])

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const activeItem = listRef.current.children[activeIndex] as HTMLElement
      if (activeItem) {
        activeItem.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [activeIndex])

  // Clear input
  const handleClear = useCallback(() => {
    onChange('')
    setResults([])
    setIsOpen(false)
    setError(null)
    inputRef.current?.focus()
  }, [onChange])

  // Highlight matching text
  const renderHighlightedText = (text: string, query: string) => {
    const lowerText = text.toLowerCase()
    const lowerQuery = query.toLowerCase().trim()
    
    if (!lowerQuery) return text
    
    const index = lowerText.indexOf(lowerQuery)
    if (index === -1) {
      // Try matching first word only
      const firstWord = lowerQuery.split(' ')[0]
      const firstIndex = lowerText.indexOf(firstWord)
      if (firstIndex === -1) return text
      
      return (
        <>
          {text.slice(0, firstIndex)}
          <mark className="bg-b3-turquoise bg-opacity-30 text-inherit rounded px-0.5">
            {text.slice(firstIndex, firstIndex + firstWord.length)}
          </mark>
          {text.slice(firstIndex + firstWord.length)}
        </>
      )
    }
    
    return (
      <>
        {text.slice(0, index)}
        <mark className="bg-b3-turquoise bg-opacity-30 text-inherit rounded px-0.5">
          {text.slice(index, index + lowerQuery.length)}
        </mark>
        {text.slice(index + lowerQuery.length)}
      </>
    )
  }

  const listId = 'autocomplete-list'
  const activeDescendant = activeIndex >= 0 ? `option-${activeIndex}` : undefined

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Input */}
      <div className="relative">
        <Search 
          size={18} 
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
        />
        
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true)
          }}
          placeholder={placeholder}
          className="w-full px-4 py-3 pl-10 pr-10 border border-gray-300 rounded-b3 
                     focus:ring-2 focus:ring-b3-turquoise focus:border-transparent
                     transition-all duration-200"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={listId}
          aria-activedescendant={activeDescendant}
          aria-autocomplete="list"
          autoComplete="off"
        />
        
        {/* Loading/Clear indicator */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {isLoading ? (
            <Loader2 size={18} className="animate-spin text-b3-turquoise" />
          ) : value ? (
            <button
              type="button"
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Rensa"
            >
              <X size={18} />
            </button>
          ) : null}
        </div>
      </div>

      {/* Dropdown */}
      <div
        className={`absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-b3 shadow-xl
                    overflow-hidden transition-all duration-200 origin-top
                    ${isOpen ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0 pointer-events-none'}`}
      >
        {error && results.length === 0 ? (
          <div className="p-4">
            <div className="text-gray-500 text-center mb-3">
              {error}
            </div>
            {onManualEntry && value.trim().length >= 2 && (
              <button
                type="button"
                onClick={() => {
                  onManualEntry(value.trim())
                  setIsOpen(false)
                }}
                className="w-full py-3 px-4 bg-b3-turquoise bg-opacity-10 hover:bg-opacity-20 
                           text-b3-turquoise-darker rounded-lg border-2 border-dashed border-b3-turquoise
                           transition-colors flex items-center justify-center gap-2"
              >
                <span className="font-medium">Lägg till "{value.trim()}" manuellt</span>
              </button>
            )}
          </div>
        ) : (
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            className="max-h-64 overflow-y-auto"
          >
            {results.map((car, index) => (
              <li
                key={car.id}
                id={`option-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                className={`px-4 py-3 cursor-pointer transition-colors
                           ${index === activeIndex 
                             ? 'bg-b3-turquoise bg-opacity-10 text-b3-turquoise-darker' 
                             : 'hover:bg-gray-50'
                           }
                           ${index !== results.length - 1 ? 'border-b border-gray-100' : ''}`}
                onClick={() => handleSelect(car)}
                onMouseEnter={() => setActiveIndex(index)}
              >
                <div className="font-medium">
                  {renderHighlightedText(car.label, value)}
                </div>
                <div className="text-sm text-gray-500 mt-0.5 flex items-center gap-2">
                  <span>{car.bransletyp || 'Okänd drivlina'}</span>
                  <span>•</span>
                  <span>{car.nybilspris.toLocaleString('sv-SE')} kr</span>
                </div>
              </li>
            ))}
            {/* Always show manual entry option at the bottom */}
            {onManualEntry && value.trim().length >= 2 && (
              <li
                className="px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50 border-t border-gray-200"
                onClick={() => {
                  onManualEntry(value.trim())
                  setIsOpen(false)
                }}
              >
                <div className="text-b3-turquoise font-medium flex items-center gap-2">
                  <span>+ Lägg till "{value.trim()}" manuellt</span>
                </div>
                <div className="text-sm text-gray-500 mt-0.5">
                  Fyll i biluppgifter manuellt
                </div>
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  )
}

