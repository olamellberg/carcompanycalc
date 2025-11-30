import { useRef, useCallback, useEffect, useState } from 'react'

interface UseDebounceThrottleOptions {
  debounceMs: number
  throttleMs: number
}

/**
 * Combined Debounce + Throttle hook
 * - Debounce: Waits until user stops typing
 * - Throttle: Limits how often the callback can fire
 */
export function useDebounceThrottle<T extends (...args: unknown[]) => void>(
  callback: T,
  options: UseDebounceThrottleOptions
): T {
  const { debounceMs, throttleMs } = options
  
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastCallRef = useRef<number>(0)
  const pendingArgsRef = useRef<unknown[] | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  const debouncedThrottledCallback = useCallback(
    (...args: unknown[]) => {
      const now = Date.now()
      const timeSinceLastCall = now - lastCallRef.current

      // Clear any pending debounce
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      // If enough time has passed (throttle), execute immediately
      if (timeSinceLastCall >= throttleMs) {
        lastCallRef.current = now
        callback(...args)
      } else {
        // Otherwise, debounce the call
        pendingArgsRef.current = args
        debounceTimerRef.current = setTimeout(() => {
          lastCallRef.current = Date.now()
          if (pendingArgsRef.current) {
            callback(...pendingArgsRef.current)
            pendingArgsRef.current = null
          }
        }, debounceMs)
      }
    },
    [callback, debounceMs, throttleMs]
  ) as T

  return debouncedThrottledCallback
}

/**
 * Simple debounce hook
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}
