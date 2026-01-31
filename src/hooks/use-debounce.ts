"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";

/**
 * Debounce a value - returns the value after the specified delay
 * Useful for search inputs to avoid excessive API calls
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Debounced callback function - useful for event handlers
 * Returns a stable debounced version of the callback
 */
export function useDebouncedCallback<T extends (...args: Parameters<T>) => ReturnType<T>>(
  callback: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);

  // Update callback ref on every render
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  );
}

/**
 * Throttle a value - returns the value at most once per interval
 * Useful for scroll/resize handlers
 */
export function useThrottle<T>(value: T, interval: number = 500): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastUpdated = useRef<number>(0);
  const isFirstRun = useRef(true);

  useEffect(() => {
    // Skip throttling on first render - value is already initialized
    if (isFirstRun.current) {
      isFirstRun.current = false;
      lastUpdated.current = Date.now();
      return;
    }
    
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdated.current;
    
    if (timeSinceLastUpdate >= interval) {
      lastUpdated.current = now;
      // Use microtask to avoid synchronous setState in effect
      queueMicrotask(() => setThrottledValue(value));
    } else {
      const timer = setTimeout(() => {
        lastUpdated.current = Date.now();
        setThrottledValue(value);
      }, interval - timeSinceLastUpdate);

      return () => clearTimeout(timer);
    }
  }, [value, interval]);

  return throttledValue;
}
