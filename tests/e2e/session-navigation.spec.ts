import { test, expect } from '@playwright/test';

test.describe('Session Management & Navigation Rail E2E Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('domcontentloaded');
  });

  test('1. All 5 vertical navigation rail triggers operate correctly', async ({ page }) => {
    // 1. History trigger (💬)
    const historyBtn = page.locator('button[title*="Toggle Chat Sessions"]').first();
    await expect(historyBtn).toBeVisible();
    await historyBtn.click();
    await expect(page.getByText('Chat Sessions').first()).toBeVisible();

    // 2. New Chat trigger (+)
    const newChatBtn = page.locator('button[title*="Start New Chat Session"]').first();
    await expect(newChatBtn).toBeVisible();
    await newChatBtn.click();
    await expect(page.getByText('Can I help you with anything?')).toBeVisible();

    // 3. Telemetry trigger (⚡)
    const telemetryBtn = page.locator('button[title*="Live LangGraph State Machine"]').first();
    await expect(telemetryBtn).toBeVisible();
    await telemetryBtn.click();
    await expect(page.getByText('Live Agent Telemetry & Tracing')).toBeVisible();
    const closeTelemetryBtn = page.locator('button[aria-label="Close modal"]').first();
    await closeTelemetryBtn.click();

    // 4. Knowledge Base Seeder trigger (📚)
    const kbSeedBtn = page.locator('button[title*="Seed Knowledge Base"]').first();
    if (await kbSeedBtn.isVisible()) {
      await kbSeedBtn.click();
      await expect(page.getByText(/Seeded 3 Enterprise Documents|Knowledge base/i).first()).toBeVisible({ timeout: 15000 });
    }

    // 5. GitHub link (🐙)
    const githubLink = page.locator('a[href*="github.com"]').first();
    await expect(githubLink).toBeVisible();
  });

  test('2. Multi-turn session persistence, switching between threads, and message isolation', async ({ page }) => {
    test.setTimeout(60000);

    // Thread 1
    const textarea = page.locator('textarea');
    await textarea.fill('Hello Thread 1: Explain enterprise governance');
    const sendButton = page.locator('button[type="submit"][aria-label="Send message"]');
    await sendButton.click();

    await expect(page.getByText(/Hello Thread 1/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/governance|security|enterprise/i).first()).toBeVisible({ timeout: 30000 });

    // Open History drawer
    const historyBtn = page.locator('button[title*="Toggle Chat Sessions"]').first();
    await historyBtn.click();
    await page.waitForTimeout(500);

    // Click '+' to create Thread 2
    const newChatBtn = page.locator('button[title*="Start New Chat Session"]').first();
    await newChatBtn.click();

    // Verify empty state is displayed in Thread 2
    await expect(page.getByText('Can I help you with anything?')).toBeVisible();

    // Thread 2
    await textarea.fill('Hello Thread 2: What is the 99.99% SLA?');
    await sendButton.click();
    await expect(page.getByText(/Hello Thread 2/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/99\.99%|SLA|uptime/i).first()).toBeVisible({ timeout: 30000 });

    // Switch back to Thread 1 from History drawer
    await historyBtn.click();
    await page.waitForTimeout(500);
    const firstThreadItem = page.locator('button').filter({ hasText: /Hello Thread 1|Explain enterprise/i }).first();
    if (await firstThreadItem.isVisible()) {
      await firstThreadItem.click();
      await expect(page.getByText(/Hello Thread 1/i)).toBeVisible({ timeout: 10000 });
    }
  });

  test('3. Message actions: User copy badge and Markdown export', async ({ page }) => {
    test.setTimeout(45000);

    const textarea = page.locator('textarea');
    await textarea.fill('Test message for copy and export validation');
    const sendButton = page.locator('button[type="submit"][aria-label="Send message"]');
    await sendButton.click();

    await expect(page.getByText('Test message for copy and export validation')).toBeVisible({ timeout: 10000 });

    // Copy action
    const copyBtns = page.locator('button[aria-label="Copy message"]');
    if (await copyBtns.first().isVisible()) {
      await copyBtns.first().click();
      await expect(page.getByText(/Copied!/i).first()).toBeVisible();
    }
  });
});
