'use client'

import * as React from 'react'

/**
 * Announce a message to screen readers using a live region
 */
export function useAnnounce() {
  const announce = React.useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcer = document.getElementById('sr-announcer') || createAnnouncer()
    announcer.setAttribute('aria-live', priority)
    announcer.textContent = message
    
    // Clear after announcement
    setTimeout(() => {
      announcer.textContent = ''
    }, 1000)
  }, [])

  return announce
}

function createAnnouncer(): HTMLElement {
  const announcer = document.createElement('div')
  announcer.id = 'sr-announcer'
  announcer.setAttribute('role', 'status')
  announcer.setAttribute('aria-live', 'polite')
  announcer.setAttribute('aria-atomic', 'true')
  announcer.className = 'sr-only'
  document.body.appendChild(announcer)
  return announcer
}

/**
 * Focus trap for modals and dialogs
 */
export function useFocusTrap(isActive: boolean) {
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!isActive || !containerRef.current) return

    const container = containerRef.current
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    firstElement?.focus()

    return () => {
      container.removeEventListener('keydown', handleKeyDown)
    }
  }, [isActive])

  return containerRef
}

/**
 * Skip to main content link for keyboard navigation
 */
export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:bg-background focus:px-4 focus:py-2 focus:text-foreground focus:ring-2 focus:ring-ring focus:rounded-md"
    >
      Skip to main content
    </a>
  )
}

/**
 * Visually hidden text for screen readers
 */
export function VisuallyHidden({ children }: { children: React.ReactNode }) {
  return <span className="sr-only">{children}</span>
}

/**
 * Live region for dynamic content announcements
 */
export function LiveRegion({ 
  children, 
  'aria-live': ariaLive = 'polite',
  role = 'status',
}: { 
  children: React.ReactNode
  'aria-live'?: 'polite' | 'assertive' | 'off'
  role?: 'status' | 'alert' | 'log'
}) {
  return (
    <div 
      role={role} 
      aria-live={ariaLive} 
      aria-atomic="true" 
      className="sr-only"
    >
      {children}
    </div>
  )
}

/**
 * Hook to manage focus when content changes (e.g., after navigation)
 */
export function useFocusOnMount(shouldFocus: boolean = true) {
  const ref = React.useRef<HTMLElement>(null)

  React.useEffect(() => {
    if (shouldFocus && ref.current) {
      ref.current.focus()
    }
  }, [shouldFocus])

  return ref
}

/**
 * Reduce motion preference detection
 */
export function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false)

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches)
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return prefersReducedMotion
}
