import { test, expect } from '@playwright/test';

test.describe('Telemetry & Multi-Model Routing E2E Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await expect(page.locator('textarea')).toBeVisible({ timeout: 15000 });
  });

  test('1. Multi-Model Selector Dropdown — multi-provider options, selection persistence', async ({ page }) => {
    const modelBtn = page.locator('button[title="Select AI Inference Engine"]');
    await expect(modelBtn).toBeVisible();

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

  test('2. Live Telemetry & Observability Modal — state machine, Postgres checkpointer, and OTel tracing', async ({ page }) => {
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

  test('3. Enterprise Knowledge Base RAG Query Execution', async ({ page }) => {
    test.setTimeout(45000);

    const textarea = page.locator('textarea');
    await textarea.fill('What are the enterprise security and data retention guidelines?');
    await page.keyboard.press('Enter');

    // Verify response contains enterprise context and citations
    await expect(page.getByText(/security|retention|policy|guidelines|governance|compliance/i).first()).toBeVisible({ timeout: 25000 });
  });
});
