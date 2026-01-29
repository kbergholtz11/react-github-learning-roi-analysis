import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { EmptyState, ErrorState, LoadingState, NoResultsState } from './empty-state'

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
    render(<ErrorState message="Something went wrong" />)
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('shows retry button when onRetry is provided', async () => {
    const handleRetry = vi.fn()
    render(<ErrorState message="Error" onRetry={handleRetry} />)

    const button = screen.getByRole('button', { name: /try again/i })
    await userEvent.click(button)
    expect(handleRetry).toHaveBeenCalled()
  })
})

describe('LoadingState', () => {
  it('renders loading message', () => {
    render(<LoadingState />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('renders custom message', () => {
    render(<LoadingState message="Fetching data..." />)
    expect(screen.getByText('Fetching data...')).toBeInTheDocument()
  })
})

describe('NoResultsState', () => {
  it('renders no results message', () => {
    render(<NoResultsState query="test search" />)
    expect(screen.getByText(/no results/i)).toBeInTheDocument()
    expect(screen.getByText(/test search/i)).toBeInTheDocument()
  })

  it('shows clear button when onClear is provided', async () => {
    const handleClear = vi.fn()
    render(<NoResultsState query="search" onClear={handleClear} />)

    const button = screen.getByRole('button', { name: /clear/i })
    await userEvent.click(button)
    expect(handleClear).toHaveBeenCalled()
  })
})
