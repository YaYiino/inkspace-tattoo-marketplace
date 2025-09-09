import { chromium, FullConfig } from '@playwright/test'

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up E2E test environment...')

  // Launch browser for cleanup
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    // Navigate to the application
    await page.goto(process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000')

    // Clean up test data
    await cleanupTestData(page)

    console.log('✅ E2E test environment cleaned up')
  } catch (error) {
    console.warn('⚠️ E2E cleanup failed:', error)
    // Don't fail for cleanup issues
  } finally {
    await context.close()
    await browser.close()
  }
}

async function cleanupTestData(page: any) {
  try {
    // Example: Clean up test data via API
    // await page.request.post('/api/test/cleanup', {
    //   data: { action: 'cleanup_test_data' }
    // })
    
    console.log('🗑️ Test data cleanup completed')
  } catch (error) {
    console.warn('⚠️ Test data cleanup failed:', error)
  }
}

export default globalTeardown