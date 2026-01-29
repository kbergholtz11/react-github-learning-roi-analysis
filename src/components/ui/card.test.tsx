import { describe, it, expect } from 'vitest'
import { render, screen } from '@/test/test-utils'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card'

describe('Card', () => {
  it('renders a complete card with all parts', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Test Title</CardTitle>
          <CardDescription>Test Description</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Card content here</p>
        </CardContent>
        <CardFooter>
          <p>Footer content</p>
        </CardFooter>
      </Card>
    )

    expect(screen.getByText('Test Title')).toBeInTheDocument()
    expect(screen.getByText('Test Description')).toBeInTheDocument()
    expect(screen.getByText('Card content here')).toBeInTheDocument()
    expect(screen.getByText('Footer content')).toBeInTheDocument()
  })

  it('applies custom className to Card', () => {
    render(<Card className="custom-class" data-testid="card">Content</Card>)
    expect(screen.getByTestId('card')).toHaveClass('custom-class')
  })

  it('renders CardTitle with correct heading structure', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Important Heading</CardTitle>
        </CardHeader>
      </Card>
    )
    
    const heading = screen.getByText('Important Heading')
    expect(heading.tagName).toBe('DIV') // shadcn uses div with heading styles
    expect(heading).toHaveClass('font-semibold')
  })
})
