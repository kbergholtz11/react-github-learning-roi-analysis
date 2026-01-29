import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { MetricCard } from './metric-card'
import { Users, TrendingUp, Award, Activity } from 'lucide-react'

const meta: Meta<typeof MetricCard> = {
  title: 'Dashboard/MetricCard',
  component: MetricCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-[300px]">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof MetricCard>

export const Default: Story = {
  args: {
    title: 'Total Learners',
    value: '5,234',
    icon: <Users className="h-5 w-5" />,
  },
}

export const WithPositiveTrend: Story = {
  args: {
    title: 'Active Learners',
    value: '1,847',
    icon: <Users className="h-5 w-5" />,
    trend: {
      value: 12.5,
      isPositive: true,
      label: 'vs last month',
    },
  },
}

export const WithNegativeTrend: Story = {
  args: {
    title: 'Churn Rate',
    value: '2.4%',
    icon: <TrendingUp className="h-5 w-5" />,
    trend: {
      value: 0.8,
      isPositive: false,
      label: 'vs last month',
    },
  },
}

export const WithDescription: Story = {
  args: {
    title: 'Certifications',
    value: '342',
    icon: <Award className="h-5 w-5" />,
    description: 'Total certifications earned this quarter',
  },
}

export const WithNeutralTrend: Story = {
  args: {
    title: 'Engagement Score',
    value: '87%',
    icon: <Activity className="h-5 w-5" />,
    trend: {
      value: 0,
      label: 'no change',
    },
  },
}

export const Grid: Story = {
  decorators: [
    (Story) => (
      <div className="w-full max-w-4xl">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <MetricCard
        title="Total Learners"
        value="5,234"
        icon={<Users className="h-5 w-5" />}
        trend={{ value: 12.5, isPositive: true, label: 'vs last month' }}
      />
      <MetricCard
        title="Active"
        value="1,847"
        icon={<Activity className="h-5 w-5" />}
        trend={{ value: 5.2, isPositive: true, label: 'vs last month' }}
      />
      <MetricCard
        title="Certified"
        value="342"
        icon={<Award className="h-5 w-5" />}
        trend={{ value: 8.1, isPositive: true, label: 'vs last month' }}
      />
      <MetricCard
        title="Completion Rate"
        value="73%"
        icon={<TrendingUp className="h-5 w-5" />}
        trend={{ value: 2.3, isPositive: false, label: 'vs last month' }}
      />
    </div>
  ),
}
