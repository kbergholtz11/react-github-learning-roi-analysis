import type { Meta, StoryObj } from '@storybook/react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card'
import { Button } from './button'

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Card>

export const Default: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card description goes here</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Card content with detailed information.</p>
      </CardContent>
      <CardFooter>
        <Button>Action</Button>
      </CardFooter>
    </Card>
  ),
}

export const Simple: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardContent className="pt-6">
        <p>A simple card with just content.</p>
      </CardContent>
    </Card>
  ),
}

export const WithForm: Story = {
  render: () => (
    <Card className="w-[400px]">
      <CardHeader>
        <CardTitle>Create Account</CardTitle>
        <CardDescription>Enter your information to get started</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Email</label>
          <input 
            type="email" 
            placeholder="email@example.com"
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Password</label>
          <input 
            type="password" 
            placeholder="••••••••"
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="ghost">Cancel</Button>
        <Button>Create</Button>
      </CardFooter>
    </Card>
  ),
}

export const Notification: Story = {
  render: () => (
    <Card className="w-[380px]">
      <CardHeader>
        <CardTitle className="text-lg">Notifications</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {[
          { title: 'New learner enrolled', time: '2 hours ago' },
          { title: 'Certification completed', time: '5 hours ago' },
          { title: 'Weekly report ready', time: '1 day ago' },
        ].map((item, i) => (
          <div key={i} className="flex justify-between items-center">
            <span className="text-sm">{item.title}</span>
            <span className="text-xs text-muted-foreground">{item.time}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  ),
}
