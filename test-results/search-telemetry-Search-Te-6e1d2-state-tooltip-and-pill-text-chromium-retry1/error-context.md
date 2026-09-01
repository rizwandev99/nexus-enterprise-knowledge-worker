# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: search-telemetry.spec.ts >> Search, Telemetry & Multi-Model Routing E2E Suite >> 1. Omni-Input Web Search Toggle — styling, active state, tooltip, and pill text
- Location: tests\e2e\search-telemetry.spec.ts:9:7

# Error details

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
```

```
Test timeout of 30000ms exceeded.
```

```
Fixture "trace recording" timeout of 30000ms exceeded during teardown.
```

```
Error: page.goto: Test ended.
Call log:
  - navigating to "http://localhost:3000/", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Search, Telemetry & Multi-Model Routing E2E Suite', () => {
  4  |   test.beforeEach(async ({ page }) => {
> 5  |     await page.goto('http://localhost:3000');
     |                ^ Error: page.goto: Test ended.
  6  |     await expect(page.locator('textarea')).toBeVisible({ timeout: 15000 });
  7  |   });
  8  | 
  9  |   test('1. Omni-Input Web Search Toggle — styling, active state, tooltip, and pill text', async ({ page }) => {
  10 |     const webSearchBtn = page.locator('button[aria-label="Toggle Live Internet Web Search"]');
  11 |     await expect(webSearchBtn).toBeVisible();
  12 | 
  13 |     await expect(webSearchBtn).not.toContainText('Web Search');
  14 | 
  15 |     // Click to activate Web Search
  16 |     await webSearchBtn.click();
  17 |     await expect(webSearchBtn).toContainText('Web Search');
  18 | 
  19 |     // Click again to deactivate Web Search
  20 |     await webSearchBtn.click();
  21 |     await expect(webSearchBtn).not.toContainText('Web Search');
  22 |   });
  23 | 
  24 |   test('2. Multi-Model Selector Dropdown — multi-provider options, selection persistence', async ({ page }) => {
  25 |     const modelBtn = page.locator('button[title="Select AI Inference Engine"]');
  26 |     await expect(modelBtn).toBeVisible();
  27 |     await expect(modelBtn).toContainText('Groq GPT-OSS 120B');
  28 | 
  29 |     // Open model selector dropdown
  30 |     await modelBtn.click();
  31 |     const dropdown = page.locator('[role="listbox"]');
  32 |     await expect(dropdown).toBeVisible();
  33 | 
  34 |     // Verify model options exist
  35 |     await expect(dropdown.getByText('Groq GPT-OSS 120B')).toBeVisible();
  36 |     await expect(dropdown.getByText('OpenAI GPT-4o')).toBeVisible();
  37 |     await expect(dropdown.getByText('Claude 3.5 Sonnet')).toBeVisible();
  38 | 
  39 |     // Select OpenAI GPT-4o
  40 |     await dropdown.getByText('OpenAI GPT-4o').click();
  41 |     await expect(dropdown).toBeHidden();
  42 |     await expect(modelBtn).toContainText('OpenAI GPT-4o');
  43 | 
  44 |     // Switch back to default Groq GPT-OSS 120B
  45 |     await modelBtn.click();
  46 |     await expect(dropdown).toBeVisible();
  47 |     await dropdown.getByText('Groq GPT-OSS 120B').click();
  48 |     await expect(dropdown).toBeHidden();
  49 |     await expect(modelBtn).toContainText('Groq GPT-OSS 120B');
  50 |   });
  51 | 
  52 |   test('3. Live Telemetry & Observability Modal — state machine, Postgres checkpointer, and OTel tracing', async ({ page }) => {
  53 |     // Locate the Activity / Telemetry icon button on the left vertical rail
  54 |     const telemetryRailBtn = page.locator('button[title*="Live LangGraph State Machine"]').first();
  55 |     await expect(telemetryRailBtn).toBeVisible();
  56 | 
  57 |     // Open Telemetry Modal
  58 |     await telemetryRailBtn.click();
  59 | 
  60 |     // Verify modal header
  61 |     await expect(page.getByText('Live Agent Telemetry & Tracing')).toBeVisible();
  62 | 
  63 |     // Verify DAG flow nodes
  64 |     await expect(page.getByText('ragNode')).toBeVisible();
  65 |     await expect(page.getByText('reasoningNode')).toBeVisible();
  66 |     await expect(page.getByText('approvalNode')).toBeVisible();
  67 |     await expect(page.getByText('toolsNode')).toBeVisible();
  68 | 
  69 |     // Close modal
  70 |     const closeBtn = page.locator('button[aria-label="Close modal"]').first();
  71 |     if (await closeBtn.isVisible()) {
  72 |       await closeBtn.click();
  73 |       await expect(page.getByText('Live Agent Telemetry & Tracing')).toBeHidden();
  74 |     }
  75 |   });
  76 | 
  77 |   test('4. Live Internet Web Search Execution with DuckDuckGo tool', async ({ page }) => {
  78 |     test.setTimeout(45000);
  79 | 
  80 |     const webSearchBtn = page.locator('button[aria-label="Toggle Live Internet Web Search"]');
  81 |     await webSearchBtn.click();
  82 |     await expect(webSearchBtn).toContainText('Web Search');
  83 | 
  84 |     const textarea = page.locator('textarea');
  85 |     await textarea.fill('What is the latest version of Next.js?');
  86 |     await page.keyboard.press('Enter');
  87 | 
  88 |     await expect(page.getByText(/Next\.js|version|Vercel|release|features/i).first()).toBeVisible({ timeout: 25000 });
  89 |   });
  90 | });
  91 | 
```