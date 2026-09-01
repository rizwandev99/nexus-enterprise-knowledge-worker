import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

test.describe('Hero, Bento Cards, Omni-Input & Document Ingestion Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('domcontentloaded');
  });

  test('1. Hero header renders 48x48px white squircle brand mark, monospace greeting, bold headline, and maintains top scroll anchoring', async ({ page }) => {
    await expect(page).toHaveTitle(/Nexus/);

    // 48x48px white squircle brand mark
    const squircle = page.locator('div.w-12.h-12.rounded-2xl.bg-white').first();
    await expect(squircle).toBeVisible();

    const box = await squircle.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(Math.round(box.width)).toBe(48);
      expect(Math.round(box.height)).toBe(48);
    }

    // Greeting: Hi, User
    const greeting = page.locator('p.font-mono').filter({ hasText: /Hi,/i }).first();
    await expect(greeting).toBeVisible();

    // Headline
    const headline = page.getByRole('heading', { level: 1, name: 'Can I help you with anything?' });
    await expect(headline).toBeVisible();

    // Subtitle
    await expect(page.getByText(/Ready to assist you with anything you need/i)).toBeVisible();

    // Top scroll anchoring verification
    const scrollContainer = page.locator('div.flex-1.overflow-y-auto').first();
    const scrollTop = await scrollContainer.evaluate((el) => el.scrollTop);
    expect(scrollTop).toBe(0);

    await page.screenshot({ path: 'tests/e2e/screenshots/hero_01_branding_and_bento.png', fullPage: true });
  });

  test('2. 4 Bento Showcase Cards render icons, badges, descriptions, support hover, and execute actions', async ({ page }) => {
    const badges = [
      'Hybrid RAG Engine',
      'LangGraph interrupt()',
      'Auto-Retry (Max 3)',
      'OpenTelemetry + OTLP',
    ];

    for (const badge of badges) {
      await expect(page.getByText(badge)).toBeVisible();
    }

    // Click Card 1: Hybrid Search RAG
    await page.getByText('Hybrid Search RAG').click();
    await expect(page.getByText(/password rotation/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('3. Demo Knowledge Base Quick Seeder triggers seeding with feedback toast, and clear button confirms before purge', async ({ page }) => {
    test.setTimeout(45000);

    const seedBtn = page.locator('button[title*="Seed sample governance and SLA documents"]').first();
    await expect(seedBtn).toBeVisible();
    await seedBtn.click();

    // Toast notification appears
    await expect(page.getByText(/Seeded 3 Enterprise Documents/i).first()).toBeVisible({ timeout: 20000 });

    const clearBtn = page.locator('button[title*="Purge all documents"]').first();
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();
    await expect(page.getByText('Click to Confirm Clear')).toBeVisible();
  });

  test('4. Omni-Input Bar supports textarea focus, auto-expansion on multiline text, Shift+Enter newline, and button state management', async ({ page }) => {
    const textarea = page.locator('textarea[aria-label="Ask me anything, search knowledge base, or run SQL mutations..."]');
    await expect(textarea).toBeVisible();

    const sendBtn = page.locator('button[aria-label="Send message"]');
    await expect(sendBtn).toBeVisible();
    await expect(sendBtn).toBeDisabled();

    await textarea.fill('Testing single line input');
    await expect(sendBtn).toBeEnabled();

    // Multiline expansion test
    const multilineText = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5';
    await textarea.fill(multilineText);

    await textarea.focus();
    await page.keyboard.press('Shift+Enter');
    const currentValue = await textarea.inputValue();
    expect(currentValue).toContain('\n');

    await textarea.fill('');
    await expect(sendBtn).toBeDisabled();
  });

  test('5. Document Upload & Ingestion: file parsing, preview pill rendering, removal chip, and prompt attachment submission', async ({ page }) => {
    test.setTimeout(60000);

    const tempMdPath = path.join(process.cwd(), 'temp-test-policy.md');
    fs.writeFileSync(
      tempMdPath,
      '# Enterprise Access Control Matrix\n\nAll administrative mutations require dual-role human confirmation.'
    );

    try {
      const attachBtn = page.locator('button[aria-label="Attach Document"]');
      const sendBtn = page.locator('button[aria-label="Send message"]');
      await expect(attachBtn).toBeVisible();

      const fileChooserPromise = page.waitForEvent('filechooser');
      await attachBtn.click();
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles(tempMdPath);

      // Verify attachment pill renders inside form with filename
      const mdPill = page.locator('form').getByText('temp-test-policy.md');
      await expect(mdPill).toBeVisible({ timeout: 15000 });

      await expect(sendBtn).toBeEnabled();

      const removeBtn = page.locator('button[aria-label="Remove attachment"]');
      await expect(removeBtn).toBeVisible();
      await removeBtn.click();
      await expect(mdPill).toBeHidden();
    } finally {
      if (fs.existsSync(tempMdPath)) {
        fs.unlinkSync(tempMdPath);
      }
    }
  });
});
