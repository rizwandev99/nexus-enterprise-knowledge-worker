import { test, expect } from '@playwright/test';

/**
 * Nexus Enterprise Knowledge Worker - Playwright E2E Test Suite
 *
 * Prerequisites:
 *   - Dev server running: 
pm run dev
 *   - Playwright browsers installed: 
px playwright install chromium
 *
 * Run: npm run test:e2e
 */
test.describe('Nexus Enterprise Knowledge Worker', () => {
  // ──────────────────────────────────────────────────────────────────────────
  // TEST 1: Smoke Test — Page loads and core UI elements render
  // ──────────────────────────────────────────────────────────────────────────
  test('smoke test: homepage loads and renders core UI elements', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // 1. Page title should contain "Nexus"
    await expect(page).toHaveTitle(/Nexus/);

    // 2. The chat textarea (primary input) must be visible
    //    Selector targets the aria-labelled textarea in ChatInput.tsx
    await expect(
      page.locator('textarea[aria-label="Ask me anything"]')
    ).toBeVisible();

    // 3. Sidebar / navigation rail must be present
    //    The Sidebar renders a <nav> element
    await expect(page.locator('nav, aside, [role="navigation"]').first()).toBeVisible();

    // 4. Welcome heading rendered by MessageList empty-state
    await expect(page.getByText('Hey! Enterprise Worker')).toBeVisible();

    // 5. Sub-heading
    await expect(page.getByText('What can I help with?')).toBeVisible();

    // 6. Send button (type="submit" with aria-label="Send message") must exist
    await expect(
      page.locator('button[type="submit"][aria-label="Send message"]')
    ).toBeVisible();

    // 7. Header branding text
    await expect(page.getByText('Nexus Knowledge Base')).toBeVisible();

    // 8. Telemetry button in header
    await expect(page.getByText('Telemetry & Traces')).toBeVisible();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 2: Feature Bento Cards — Clickable and populate input
  // ──────────────────────────────────────────────────────────────────────────
  test('ui: feature bento cards are clickable and populate input', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Wait for the page to fully hydrate (Next.js SSR → client takeover)
    await page.waitForLoadState('networkidle');

    // Take a baseline screenshot for visual regression reference
    await page.screenshot({
      path: 'tests/e2e/screenshots/homepage.png',
      fullPage: false,
    });

    // Track any critical JS errors that may surface after hydration
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    // Allow a brief window for any deferred errors to surface
    await page.waitForTimeout(2000);

    // Filter out non-fatal React hydration warnings (expected in dev mode)
    const criticalErrors = errors.filter(
      (e) => !e.includes('hydration') && !e.includes('Warning')
    );
    expect(criticalErrors).toHaveLength(0);

    // ── Verify all 4 feature bento card badge labels are present ──
    const expectedBadges = [
      'Hybrid RAG Engine',
      'SQL Agent + HITL',
      'Self-Correction Graph',
      'OpenTelemetry',
    ];
    for (const badge of expectedBadges) {
      await expect(page.getByText(badge)).toBeVisible();
    }

    // ── Verify clicking a bento card populates the textarea ──
    // Click the "Query Knowledge Base" card (first feature card)
    await page.getByText('Query Knowledge Base').click();

    // After click, the textarea should be populated with the card's prompt
    const textarea = page.locator('textarea[aria-label="Ask me anything"]');
    const inputValue = await textarea.inputValue();
    expect(inputValue.length).toBeGreaterThan(10);
    expect(inputValue).toContain('zero-trust');

    // ── Verify the send button becomes active once text is populated ──
    // The submit button is enabled when canSend === true (input has content)
    const sendButton = page.locator('button[type="submit"][aria-label="Send message"]');
    // Button should no longer be in its disabled visual state
    // (disabled attr is NOT set; Playwright checks the DOM attribute)
    await expect(sendButton).not.toBeDisabled();
  });
});
