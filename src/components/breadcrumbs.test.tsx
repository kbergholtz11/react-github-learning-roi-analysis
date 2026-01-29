import { describe, it, expect } from 'vitest'
import { render, screen } from '@/test/test-utils'
import { Breadcrumbs } from './breadcrumbs'

// Mock usePathname
import { vi } from 'vitest'

vi.mock('next/navigation', async () => {
  return {
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
    }),
    usePathname: () => '/journey/explorer',
    useSearchParams: () => new URLSearchParams(),
  }
})

describe('Breadcrumbs', () => {
  it('renders home link with icon', () => {
    render(<Breadcrumbs />)
    // Home link uses an icon, not text
    const homeLink = screen.getByRole('link', { name: '' })
    expect(homeLink).toHaveAttribute('href', '/')
  })

  it('renders path segments', () => {
    render(<Breadcrumbs />)
    // Should show "Learner Journey" and "Explorer" for /journey/explorer path
    expect(screen.getByText('Learner Journey')).toBeInTheDocument()
    expect(screen.getByText('Explorer')).toBeInTheDocument()
  })

  it('makes intermediate segments clickable links', () => {
    render(<Breadcrumbs />)
    const journeyLink = screen.getByRole('link', { name: /learner journey/i })
    expect(journeyLink).toHaveAttribute('href', '/journey')
  })

  it('does not make the last segment a link', () => {
    render(<Breadcrumbs />)
    const explorerText = screen.getByText('Explorer')
    // Last segment should not be a link
    expect(explorerText.closest('a')).toBeNull()
  })
})
