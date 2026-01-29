import { describe, it, expect } from 'vitest'
import { render, screen } from '@/test/test-utils'
import { MetricCard } from './metric-card'
import { Users } from 'lucide-react'

describe('MetricCard', () => {
  it('renders with title and value', () => {
    render(
      <MetricCard
        title="Total Users"
        value="1,234"
        icon={Users}
      />
    )

    expect(screen.getByText('Total Users')).toBeInTheDocument()
    expect(screen.getByText('1,234')).toBeInTheDocument()
  })

  it('displays trend indicator when provided', () => {
    render(
      <MetricCard
        title="Revenue"
        value="$50,000"
        icon={Users}
        trend={{ value: 12.5, isPositive: true }}
      />
    )

    expect(screen.getByText(/12.5%/)).toBeInTheDocument()
  })

  it('shows negative trend styling', () => {
    render(
      <MetricCard
        title="Churn Rate"
        value="5%"
        icon={Users}
        trend={{ value: 2.3, isPositive: false }}
      />
    )

    const trendElement = screen.getByText(/2.3%/)
    expect(trendElement).toBeInTheDocument()
  })

  it('displays description when provided', () => {
    render(
      <MetricCard
        title="Active Learners"
        value="500"
        icon={Users}
        description="Currently enrolled"
      />
    )

    expect(screen.getByText('Currently enrolled')).toBeInTheDocument()
  })

  it('renders icon', () => {
    render(
      <MetricCard
        title="Test"
        value="123"
        icon={Users}
      />
    )

    // Icon should be present (rendered as SVG)
    const card = screen.getByText('Test').closest('div')
    expect(card?.querySelector('svg')).toBeInTheDocument()
  })
})
