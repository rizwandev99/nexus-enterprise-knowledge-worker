# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: session-navigation.spec.ts >> Session Management & Navigation Rail E2E Suite >> 1. All 5 vertical navigation rail triggers operate correctly
- Location: tests\e2e\session-navigation.spec.ts:9:7

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
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('Session Management & Navigation Rail E2E Suite', () => {
  4   |   test.beforeEach(async ({ page }) => {
> 5   |     await page.goto('http://localhost:3000');
      |                ^ Error: page.goto: Test ended.
  6   |     await page.waitForLoadState('domcontentloaded');
  7   |   });
  8   | 
  9   |   test('1. All 5 vertical navigation rail triggers operate correctly', async ({ page }) => {
  10  |     // 1. History trigger (💬)
  11  |     const historyBtn = page.locator('button[title*="Toggle Chat Sessions"]').first();
  12  |     await expect(historyBtn).toBeVisible();
  13  |     await historyBtn.click();
  14  |     await expect(page.getByText('Chat Sessions').first()).toBeVisible();
  15  | 
  16  |     // 2. New Chat trigger (+)
  17  |     const newChatBtn = page.locator('button[title*="Start New Chat Session"]').first();
  18  |     await expect(newChatBtn).toBeVisible();
  19  |     await newChatBtn.click();
  20  |     await expect(page.getByText('Can I help you with anything?')).toBeVisible();
  21  | 
  22  |     // 3. Telemetry trigger (⚡)
  23  |     const telemetryBtn = page.locator('button[title*="Live LangGraph State Machine"]').first();
  24  |     await expect(telemetryBtn).toBeVisible();
  25  |     await telemetryBtn.click();
  26  |     await expect(page.getByText('Live Agent Telemetry & Tracing')).toBeVisible();
  27  |     const closeTelemetryBtn = page.locator('button[aria-label="Close modal"]').first();
  28  |     await closeTelemetryBtn.click();
  29  | 
  30  |     // 4. Knowledge Base Seeder trigger (📚)
  31  |     const kbSeedBtn = page.locator('button[title*="Seed Knowledge Base"]').first();
  32  |     if (await kbSeedBtn.isVisible()) {
  33  |       await kbSeedBtn.click();
  34  |       await expect(page.getByText(/Seeded 3 Enterprise Documents|Knowledge base/i).first()).toBeVisible({ timeout: 15000 });
  35  |     }
  36  | 
  37  |     // 5. GitHub link (🐙)
  38  |     const githubLink = page.locator('a[href*="github.com"]').first();
  39  |     await expect(githubLink).toBeVisible();
  40  |   });
  41  | 
  42  |   test('2. Multi-turn session persistence, switching between threads, and message isolation', async ({ page }) => {
  43  |     test.setTimeout(60000);
  44  | 
  45  |     // Thread 1
  46  |     const textarea = page.locator('textarea');
  47  |     await textarea.fill('Hello Thread 1: Explain enterprise governance');
  48  |     const sendButton = page.locator('button[type="submit"][aria-label="Send message"]');
  49  |     await sendButton.click();
  50  | 
  51  |     await expect(page.getByText(/Hello Thread 1/i)).toBeVisible({ timeout: 15000 });
  52  |     await expect(page.getByText(/governance|security|enterprise/i).first()).toBeVisible({ timeout: 30000 });
  53  | 
  54  |     // Open History drawer
  55  |     const historyBtn = page.locator('button[title*="Toggle Chat Sessions"]').first();
  56  |     await historyBtn.click();
  57  |     await page.waitForTimeout(500);
  58  | 
  59  |     // Click '+' to create Thread 2
  60  |     const newChatBtn = page.locator('button[title*="Start New Chat Session"]').first();
  61  |     await newChatBtn.click();
  62  | 
  63  |     // Verify empty state is displayed in Thread 2
  64  |     await expect(page.getByText('Can I help you with anything?')).toBeVisible();
  65  | 
  66  |     // Thread 2
  67  |     await textarea.fill('Hello Thread 2: What is the 99.99% SLA?');
  68  |     await sendButton.click();
  69  |     await expect(page.getByText(/Hello Thread 2/i)).toBeVisible({ timeout: 15000 });
  70  |     await expect(page.getByText(/99\.99%|SLA|uptime/i).first()).toBeVisible({ timeout: 30000 });
  71  | 
  72  |     // Switch back to Thread 1 from History drawer
  73  |     await historyBtn.click();
  74  |     await page.waitForTimeout(500);
  75  |     const firstThreadItem = page.locator('button').filter({ hasText: /Hello Thread 1|Explain enterprise/i }).first();
  76  |     if (await firstThreadItem.isVisible()) {
  77  |       await firstThreadItem.click();
  78  |       await expect(page.getByText(/Hello Thread 1/i)).toBeVisible({ timeout: 10000 });
  79  |     }
  80  |   });
  81  | 
  82  |   test('3. Message actions: User copy badge and Markdown export', async ({ page }) => {
  83  |     test.setTimeout(45000);
  84  | 
  85  |     const textarea = page.locator('textarea');
  86  |     await textarea.fill('Test message for copy and export validation');
  87  |     const sendButton = page.locator('button[type="submit"][aria-label="Send message"]');
  88  |     await sendButton.click();
  89  | 
  90  |     await expect(page.getByText('Test message for copy and export validation')).toBeVisible({ timeout: 10000 });
  91  | 
  92  |     // Copy action
  93  |     const copyBtns = page.locator('button[aria-label="Copy message"]');
  94  |     if (await copyBtns.first().isVisible()) {
  95  |       await copyBtns.first().click();
  96  |       await expect(page.getByText(/Copied!/i).first()).toBeVisible();
  97  |     }
  98  |   });
  99  | });
  100 | 
```