import type { Meta, StoryObj } from '@storybook/react'
import { EmptyState, ErrorState, LoadingState, NoResultsState } from './empty-state'

const meta: Meta<typeof EmptyState> = {
  title: 'Components/EmptyState',
  component: EmptyState,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-[500px]">
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof EmptyState>

export const Default: Story = {
  args: {
    title: 'No data available',
    description: 'There is no data to display at this time.',
  },
}

export const WithAction: Story = {
  args: {
    title: 'No learners found',
    description: 'Get started by adding your first learner.',
    action: {
      label: 'Add Learner',
      onClick: () => alert('Add learner clicked'),
    },
  },
}

export const Error: Story = {
  render: () => (
    <ErrorState 
      message="Failed to load data. Please try again."
      onRetry={() => alert('Retry clicked')}
    />
  ),
}

export const Loading: Story = {
  render: () => <LoadingState />,
}

export const LoadingCustomMessage: Story = {
  render: () => <LoadingState message="Fetching learner data..." />,
}

export const NoResults: Story = {
  render: () => (
    <NoResultsState 
      query="advanced security"
      onClear={() => alert('Clear clicked')}
    />
  ),
}

export const CustomIcon: Story = {
  args: {
    title: 'Inbox Zero!',
    description: 'You have no pending notifications.',
  },
}
