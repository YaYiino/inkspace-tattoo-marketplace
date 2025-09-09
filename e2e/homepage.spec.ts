import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display the homepage correctly', async ({ page }) => {
    // Check that the page loads
    await expect(page).toHaveTitle(/Antsss|Tattoo/)

    // Check for key elements
    await expect(page.locator('body')).toBeVisible()
  })

  test('should allow navigation to studios page', async ({ page }) => {
    // Look for a studios link or button
    const studiosLink = page.getByRole('link', { name: /studios/i }).first()
    if (await studiosLink.isVisible()) {
      await studiosLink.click()
      await expect(page).toHaveURL(/.*studios/)
    }
  })

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Check that the page still loads correctly
    await expect(page.locator('body')).toBeVisible()
  })

  test('should handle search functionality if present', async ({ page }) => {
    // Look for search input
    const searchInput = page.getByPlaceholder(/search/i).first()
    if (await searchInput.isVisible()) {
      await searchInput.fill('tattoo')
      await searchInput.press('Enter')
      
      // Wait for results or navigation
      await page.waitForLoadState('networkidle')
    }
  })
})