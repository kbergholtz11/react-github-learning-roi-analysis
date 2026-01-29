import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
  test('should navigate to home page', async ({ page }) => {
    await page.goto('/')
    
    // Check page title
    await expect(page).toHaveTitle(/GitHub Learning ROI Dashboard/)
    
    // Check main heading
    await expect(page.getByRole('heading', { name: /Learning Journey/i })).toBeVisible()
  })

  test('should have working sidebar navigation', async ({ page }) => {
    await page.goto('/')
    
    // Click on Executive Summary
    await page.getByRole('link', { name: /Summary/i }).click()
    await expect(page).toHaveURL('/executive/summary')
    
    // Check page loaded
    await expect(page.getByRole('heading', { name: /Executive Summary/i })).toBeVisible()
  })

  test('should navigate to learner explorer', async ({ page }) => {
    await page.goto('/journey/explorer')
    
    // Check page heading
    await expect(page.getByRole('heading', { name: /Learner Explorer/i })).toBeVisible()
    
    // Check search input is present
    await expect(page.getByPlaceholder(/Search by name/i)).toBeVisible()
  })
})

test.describe('Dark Mode', () => {
  test('should toggle dark mode', async ({ page }) => {
    await page.goto('/')
    
    // Find and click theme toggle
    const themeToggle = page.getByRole('button', { name: /toggle theme/i })
    await expect(themeToggle).toBeVisible()
    
    // Toggle theme
    await themeToggle.click()
    
    // Check that html has dark class (or system preference applied)
    const html = page.locator('html')
    await expect(html).toHaveClass(/dark/)
  })
})

test.describe('Global Search', () => {
  test('should open search with keyboard shortcut', async ({ page }) => {
    await page.goto('/')
    
    // Use keyboard shortcut to open search
    await page.keyboard.press('Meta+k')
    
    // Check search dialog is visible
    await expect(page.getByPlaceholder(/Search pages/i)).toBeVisible()
  })

  test('should search and navigate', async ({ page }) => {
    await page.goto('/')
    
    // Click search trigger
    await page.getByRole('button', { name: /Open search/i }).click()
    
    // Type in search
    await page.getByPlaceholder(/Search pages/i).fill('copilot')
    
    // Click result
    await page.getByRole('option', { name: /Copilot/i }).click()
    
    // Should navigate to copilot page
    await expect(page).toHaveURL('/analytics/copilot')
  })
})

test.describe('Learner Explorer', () => {
  test('should filter learners by search', async ({ page }) => {
    await page.goto('/journey/explorer')
    
    // Search for a learner
    await page.getByPlaceholder(/Search by name/i).fill('Sarah')
    
    // Check filtered results
    await expect(page.getByText('Sarah Chen')).toBeVisible()
  })

  test('should persist filters in URL', async ({ page }) => {
    await page.goto('/journey/explorer')
    
    // Search for something
    await page.getByPlaceholder(/Search by name/i).fill('Engineering')
    
    // Wait for URL to update
    await page.waitForURL(/search=Engineering/)
    
    // Reload page
    await page.reload()
    
    // Check search is still there
    await expect(page.getByPlaceholder(/Search by name/i)).toHaveValue('Engineering')
  })

  test('should paginate learners', async ({ page }) => {
    await page.goto('/journey/explorer')
    
    // Check pagination controls
    await expect(page.getByText(/Page 1 of/)).toBeVisible()
    
    // Click next page if available
    const nextButton = page.getByRole('button', { name: /Next page/i })
    if (await nextButton.isEnabled()) {
      await nextButton.click()
      await expect(page).toHaveURL(/page=2/)
    }
  })
})

test.describe('Accessibility', () => {
  test('should have skip to content link', async ({ page }) => {
    await page.goto('/')
    
    // Focus on body
    await page.keyboard.press('Tab')
    
    // Check skip link becomes visible
    const skipLink = page.getByRole('link', { name: /Skip to main content/i })
    await expect(skipLink).toBeFocused()
  })

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/executive/summary')
    
    // Check for h1
    const h1 = page.locator('h1')
    await expect(h1).toHaveCount(1)
  })

  test('should have accessible navigation', async ({ page }) => {
    await page.goto('/')
    
    // Check sidebar has proper navigation role
    await expect(page.getByRole('navigation', { name: /Primary navigation/i })).toBeVisible()
  })
})

test.describe('Error Pages', () => {
  test('should show 404 for unknown routes', async ({ page }) => {
    await page.goto('/this-page-does-not-exist')
    
    // Check 404 content
    await expect(page.getByText('404')).toBeVisible()
    await expect(page.getByText(/Page Not Found/i)).toBeVisible()
    
    // Check navigation options
    await expect(page.getByRole('link', { name: /Go Home/i })).toBeVisible()
  })
})
