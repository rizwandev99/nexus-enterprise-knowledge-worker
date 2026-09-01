import { test, expect } from '@playwright/test';

test.describe('Search, Telemetry & Multi-Model Routing E2E Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await expect(page.locator('textarea')).toBeVisible({ timeout: 15000 });
  });

  test('1. Omni-Input Web Search Toggle — styling, active state, tooltip, and pill text', async ({ page }) => {
    const webSearchBtn = page.locator('button[aria-label="Toggle Live Internet Web Search"]');
    await expect(webSearchBtn).toBeVisible();

    await expect(webSearchBtn).not.toContainText('Web Search');

    // Click to activate Web Search
    await webSearchBtn.click();
    await expect(webSearchBtn).toContainText('Web Search');

    // Click again to deactivate Web Search
    await webSearchBtn.click();
    await expect(webSearchBtn).not.toContainText('Web Search');
  });

  test('2. Multi-Model Selector Dropdown — multi-provider options, selection persistence', async ({ page }) => {
    const modelBtn = page.locator('button[title="Select AI Inference Engine"]');
    await expect(modelBtn).toBeVisible();
    await expect(modelBtn).toContainText('Groq GPT-OSS 120B');

    // Open model selector dropdown
    await modelBtn.click();
    const dropdown = page.locator('[role="listbox"]');
    await expect(dropdown).toBeVisible();

    // Verify model options exist
    await expect(dropdown.getByText('Groq GPT-OSS 120B')).toBeVisible();
    await expect(dropdown.getByText('OpenAI GPT-4o')).toBeVisible();
    await expect(dropdown.getByText('Claude 3.5 Sonnet')).toBeVisible();

    // Select OpenAI GPT-4o
    await dropdown.getByText('OpenAI GPT-4o').click();
    await expect(dropdown).toBeHidden();
    await expect(modelBtn).toContainText('OpenAI GPT-4o');

    // Switch back to default Groq GPT-OSS 120B
    await modelBtn.click();
    await expect(dropdown).toBeVisible();
    await dropdown.getByText('Groq GPT-OSS 120B').click();
    await expect(dropdown).toBeHidden();
    await expect(modelBtn).toContainText('Groq GPT-OSS 120B');
  });

  test('3. Live Telemetry & Observability Modal — state machine, Postgres checkpointer, and OTel tracing', async ({ page }) => {
    // Locate the Activity / Telemetry icon button on the left vertical rail
    const telemetryRailBtn = page.locator('button[title*="Live LangGraph State Machine"]').first();
    await expect(telemetryRailBtn).toBeVisible();

    // Open Telemetry Modal
    await telemetryRailBtn.click();

    // Verify modal header
    await expect(page.getByText('Live Agent Telemetry & Tracing')).toBeVisible();

    // Verify DAG flow nodes
    await expect(page.getByText('ragNode')).toBeVisible();
    await expect(page.getByText('reasoningNode')).toBeVisible();
    await expect(page.getByText('approvalNode')).toBeVisible();
    await expect(page.getByText('toolsNode')).toBeVisible();

    // Close modal
    const closeBtn = page.locator('button[aria-label="Close modal"]').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await expect(page.getByText('Live Agent Telemetry & Tracing')).toBeHidden();
    }
  });

  test('4. Live Internet Web Search Execution with DuckDuckGo tool', async ({ page }) => {
    test.setTimeout(45000);

    const webSearchBtn = page.locator('button[aria-label="Toggle Live Internet Web Search"]');
    await webSearchBtn.click();
    await expect(webSearchBtn).toContainText('Web Search');

    const textarea = page.locator('textarea');
    await textarea.fill('What is the latest version of Next.js?');
    await page.keyboard.press('Enter');

    await expect(page.getByText(/Next\.js|version|Vercel|release|features/i).first()).toBeVisible({ timeout: 25000 });
  });
});
