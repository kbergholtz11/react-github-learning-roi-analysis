import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { EmptyState, ErrorState, NoSearchResults, NoData, NoLearners } from './empty-state'

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

export const SearchNoResults: Story = {
  render: () => <NoSearchResults query="advanced security" />,
}

export const NoDataState: Story = {
  render: () => <NoData entity="certifications" />,
}

export const NoLearnersState: Story = {
  render: () => <NoLearners />,
}

export const WithSearchIcon: Story = {
  args: {
    icon: 'search',
    title: 'Search for learners',
    description: 'Enter a name or email to find learners.',
  },
}

export const WithErrorIcon: Story = {
  args: {
    icon: 'error',
    title: 'Connection failed',
    description: 'Unable to connect to the server.',
    action: {
      label: 'Retry',
      onClick: () => alert('Retry clicked'),
    },
  },
}
