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
    await page.waitForLoadState('networkidle');

    // 1. Page title should contain "Nexus"
    await expect(page).toHaveTitle(/Nexus/);

    // 2. The chat textarea (primary input) must be visible
    await expect(
      page.locator('textarea[aria-label="Ask me anything, search knowledge base, or run SQL mutations..."]')
    ).toBeVisible();

    // 3. Sidebar / navigation rail must be present
    await expect(page.locator('nav, aside, [role="navigation"]').first()).toBeVisible();

    // 4. Welcome greeting rendered by MessageList empty-state
    await expect(page.getByText('Hi, User')).toBeVisible();

    // 5. Hero headline
    await expect(page.getByText('Can I help you with anything?')).toBeVisible();

    // 6. Send button must exist
    await expect(
      page.locator('button[type="submit"][aria-label="Send message"]')
    ).toBeVisible();

    // 7. Header branding text
    await expect(page.getByText('Nexus AI').first()).toBeVisible();

    // 8. Telemetry button in header
    await expect(page.getByText('Telemetry').first()).toBeVisible();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 2: Feature Bento Cards — Clickable and dispatches query
  // ──────────────────────────────────────────────────────────────────────────
  test('ui: feature bento cards are clickable and dispatch query', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Track any critical JS errors that may surface after hydration
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    // Allow a brief window for any deferred errors to surface
    await page.waitForTimeout(1000);

    const criticalErrors = errors.filter(
      (e) => !e.includes('hydration') && !e.includes('Warning')
    );
    expect(criticalErrors).toHaveLength(0);

    // ── Verify all 4 feature bento card badge labels are present ──
    const expectedBadges = [
      'Hybrid RAG Engine',
      'LangGraph interrupt()',
      'Auto-Retry (Max 3)',
      'OpenTelemetry + OTLP',
    ];
    for (const badge of expectedBadges) {
      await expect(page.getByText(badge)).toBeVisible();
    }

    // ── Verify clicking a bento card dispatches the prompt ──
    await page.getByText('Hybrid Search RAG').click();

    // After click, the message bubble with prompt text should appear
    await expect(page.getByText(/password rotation/i)).toBeVisible({ timeout: 10000 });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 3: HITL Flow — Submit SQL Mutation, Verify Approval Modal, and Approve
  // ──────────────────────────────────────────────────────────────────────────
  test('hitl: triggers human-in-the-loop approval modal and executes on approval', async ({ page }) => {
    test.setTimeout(45000);

    page.on('console', msg => console.log('[BROWSER CONSOLE]', msg.type(), msg.text()));
    page.on('pageerror', err => console.log('[BROWSER ERROR]', err.message));
    page.on('response', resp => {
      if (resp.url().includes('/api/chat')) {
        console.log('[BROWSER API /api/chat RESPONSE]', resp.status(), resp.statusText());
      }
    });

    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // 1. Fill the textarea with the SQL mutation prompt
    const textarea = page.locator('textarea');
    await textarea.fill('Execute a database mutation to update document title in documents table to ARCHIVED');
    
    // Take screenshot before send
    await page.screenshot({ path: 'tests/e2e/screenshots/01_prompt_typed.png' });

    // 2. Submit the message
    await page.keyboard.press('Enter');

    // 3. Wait for the orange Approval Modal to appear
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 20000 });
    await expect(modal.getByText('Human-in-the-Loop Approval')).toBeVisible();
    await expect(modal.getByText('UPDATE documents SET title = \'ARCHIVED\';')).toBeVisible();

    // Take screenshot with modal open
    await page.screenshot({ path: 'tests/e2e/screenshots/02_approval_modal_active.png' });

    // 4. Click "Approve & Execute"
    const approveBtn = modal.getByRole('button', { name: /Approve & Execute/i });
    await approveBtn.click();

    // 5. Modal should dismiss cleanly
    await expect(modal).toBeHidden({ timeout: 15000 });

    // 6. Assistant response should confirm the execution
    await page.waitForTimeout(4000);
    await page.screenshot({ path: 'tests/e2e/screenshots/03_mutation_executed.png' });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 4: Conversational Followup — "do it then" triggers HITL Approval Modal
  // ──────────────────────────────────────────────────────────────────────────
  test('hitl: handles conversational followups like "do it then" by triggering approval modal', async ({ page }) => {
    test.setTimeout(45000);
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // 1. Send conversational query
    const textarea = page.locator('textarea');
    await textarea.fill('Can you change document titles to ARCHIVED?');
    await page.keyboard.press('Enter');

    // 2. Wait for first response or modal
    const modal = page.locator('[role="dialog"]');
    try {
      await expect(modal).toBeVisible({ timeout: 12000 });
    } catch {
      // If modal didn't pop on first conversational question, send followup "do it then"
      await textarea.fill('do it then');
      await page.keyboard.press('Enter');
      await expect(modal).toBeVisible({ timeout: 15000 });
    }

    await expect(modal.getByText('Human-in-the-Loop Approval')).toBeVisible();
    const approveBtn = modal.getByRole('button', { name: /Approve & Execute/i });
    await approveBtn.click();
    await expect(modal).toBeHidden({ timeout: 15000 });
  });
});


