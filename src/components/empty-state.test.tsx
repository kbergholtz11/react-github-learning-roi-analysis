import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { EmptyState, ErrorState, NoSearchResults, NoData, NoLearners } from './empty-state'

describe('EmptyState', () => {
  it('renders with title and description', () => {
    render(
      <EmptyState
        title="No Data"
        description="There is nothing to display"
      />
    )

    expect(screen.getByText('No Data')).toBeInTheDocument()
    expect(screen.getByText('There is nothing to display')).toBeInTheDocument()
  })

  it('renders action button when provided', async () => {
    const handleAction = vi.fn()
    render(
      <EmptyState
        title="Empty"
        description="No items"
        action={{ label: 'Add Item', onClick: handleAction }}
      />
    )

    const button = screen.getByRole('button', { name: /add item/i })
    await userEvent.click(button)
    expect(handleAction).toHaveBeenCalled()
  })
})

describe('ErrorState', () => {
  it('renders error message', () => {
    render(<ErrorState message="Connection failed" />)
    expect(screen.getByText('Connection failed')).toBeInTheDocument()
  })

  it('shows retry button when onRetry is provided', async () => {
    const handleRetry = vi.fn()
    render(<ErrorState message="Error occurred" onRetry={handleRetry} />)

    const button = screen.getByRole('button', { name: /try again/i })
    await userEvent.click(button)
    expect(handleRetry).toHaveBeenCalled()
  })
})

describe('NoSearchResults', () => {
  it('renders no results message with query', () => {
    render(<NoSearchResults query="test search" />)
    expect(screen.getByText(/no results found/i)).toBeInTheDocument()
    expect(screen.getByText(/test search/i)).toBeInTheDocument()
  })
})

describe('NoData', () => {
  it('renders no data message', () => {
    render(<NoData entity="learners" />)
    expect(screen.getByText(/no learners yet/i)).toBeInTheDocument()
  })
})

describe('NoLearners', () => {
  it('renders no learners message', () => {
    render(<NoLearners />)
    expect(screen.getByText(/no learners found/i)).toBeInTheDocument()
  })
})
