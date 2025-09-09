import { chromium, FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  // Set up test environment
  console.log('🔧 Setting up E2E test environment...')

  // Launch browser for setup
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    // Wait for the application to be ready
    await page.goto(process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000')
    await page.waitForSelector('body', { timeout: 30000 })

    // Set up test data if needed
    await setupTestData(page)

    console.log('✅ E2E test environment ready')
  } catch (error) {
    console.error('❌ E2E setup failed:', error)
    throw error
  } finally {
    await context.close()
    await browser.close()
  }
}

async function setupTestData(page: any) {
  // Add any test data setup logic here
  // For example, creating test users, studios, etc.
  
  try {
    // Example: Create test user via API
    // await page.request.post('/api/test/setup', {
    //   data: { action: 'create_test_data' }
    // })
    
    console.log('📊 Test data setup completed')
  } catch (error) {
    console.warn('⚠️ Test data setup failed:', error)
    // Don't fail the entire setup for test data issues
  }
}

export default globalSetup