'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useMemo } from 'react'

type ParamValue = string | number | boolean | null | undefined

interface UseUrlParamsOptions {
  /** Whether to replace instead of push when updating params */
  replace?: boolean
  /** Whether to scroll to top when updating params */
  scroll?: boolean
}

/**
 * Hook for managing URL search parameters with type safety
 * Enables filter state persistence via URL for shareable links
 */
export function useUrlParams<T extends Record<string, ParamValue>>(
  defaults: T,
  options: UseUrlParamsOptions = {}
) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { replace = true, scroll = false } = options

  // Parse current URL params with defaults
  const params = useMemo(() => {
    const result = { ...defaults } as T

    for (const key of Object.keys(defaults)) {
      const value = searchParams.get(key)
      if (value !== null) {
        const defaultValue = defaults[key]
        
        // Type coercion based on default value type
        if (typeof defaultValue === 'number') {
          const num = parseFloat(value)
          if (!isNaN(num)) {
            (result as Record<string, ParamValue>)[key] = num
          }
        } else if (typeof defaultValue === 'boolean') {
          (result as Record<string, ParamValue>)[key] = value === 'true'
        } else {
          (result as Record<string, ParamValue>)[key] = value
        }
      }
    }

    return result
  }, [searchParams, defaults])

  // Update URL params
  const setParams = useCallback(
    (updates: Partial<T>) => {
      const current = new URLSearchParams(searchParams.toString())

      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === undefined || value === '' || value === defaults[key]) {
          current.delete(key)
        } else {
          current.set(key, String(value))
        }
      }

      const search = current.toString()
      const url = search ? `${pathname}?${search}` : pathname

      if (replace) {
        router.replace(url, { scroll })
      } else {
        router.push(url, { scroll })
      }
    },
    [router, pathname, searchParams, defaults, replace, scroll]
  )

  // Set a single param
  const setParam = useCallback(
    <K extends keyof T>(key: K, value: T[K]) => {
      setParams({ [key]: value } as unknown as Partial<T>)
    },
    [setParams]
  )

  // Clear all params (reset to defaults)
  const clearParams = useCallback(() => {
    if (replace) {
      router.replace(pathname, { scroll })
    } else {
      router.push(pathname, { scroll })
    }
  }, [router, pathname, replace, scroll])

  // Check if any param differs from default
  const hasActiveFilters = useMemo(() => {
    return Object.keys(defaults).some((key) => {
      const urlValue = searchParams.get(key)
      return urlValue !== null && urlValue !== String(defaults[key])
    })
  }, [searchParams, defaults])

  return {
    params,
    setParams,
    setParam,
    clearParams,
    hasActiveFilters,
    searchParams,
  }
}

/**
 * Simple hook for a single URL param
 */
export function useUrlParam(
  key: string,
  defaultValue: string = ''
): [string, (value: string) => void] {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const value = searchParams.get(key) ?? defaultValue

  const setValue = useCallback(
    (newValue: string) => {
      const current = new URLSearchParams(searchParams.toString())
      
      if (newValue === '' || newValue === defaultValue) {
        current.delete(key)
      } else {
        current.set(key, newValue)
      }

      const search = current.toString()
      const url = search ? `${pathname}?${search}` : pathname
      router.replace(url, { scroll: false })
    },
    [router, pathname, searchParams, key, defaultValue]
  )

  return [value, setValue]
}

/**
 * Hook for paginated data with URL persistence
 */
export function usePaginationParams(defaultPageSize: number = 10) {
  const { params, setParams, clearParams } = useUrlParams({
    page: 1,
    pageSize: defaultPageSize,
    sort: '',
    order: 'asc' as 'asc' | 'desc',
  })

  const setPage = useCallback(
    (page: number) => setParams({ page }),
    [setParams]
  )

  const setPageSize = useCallback(
    (pageSize: number) => setParams({ pageSize, page: 1 }),
    [setParams]
  )

  const setSort = useCallback(
    (sort: string, order?: 'asc' | 'desc') => {
      const newOrder = order ?? (params.sort === sort && params.order === 'asc' ? 'desc' : 'asc')
      setParams({ sort, order: newOrder, page: 1 })
    },
    [setParams, params.sort, params.order]
  )

  return {
    page: params.page,
    pageSize: params.pageSize,
    sort: params.sort,
    order: params.order,
    setPage,
    setPageSize,
    setSort,
    resetPagination: clearParams,
  }
}

/**
 * Hook for filter state with URL persistence
 */
export function useFilterParams<T extends Record<string, string>>(defaults: T) {
  const { params, setParams, clearParams, hasActiveFilters } = useUrlParams(defaults)

  const setFilter = useCallback(
    <K extends keyof T>(key: K, value: T[K]) => {
      setParams({ [key]: value } as unknown as Partial<T>)
    },
    [setParams]
  )

  const toggleFilter = useCallback(
    (key: keyof T, value: string) => {
      const current = params[key] as string
      const values = current ? current.split(',') : []
      
      if (values.includes(value)) {
        const newValues = values.filter(v => v !== value)
        setParams({ [key]: newValues.join(',') || undefined } as unknown as Partial<T>)
      } else {
        setParams({ [key]: [...values, value].join(',') } as unknown as Partial<T>)
      }
    },
    [params, setParams]
  )

  return {
    filters: params,
    setFilter,
    toggleFilter,
    clearFilters: clearParams,
    hasActiveFilters,
  }
}
