import { test, expect } from '@playwright/test';

test.describe('HITL Database Mutation & Security Engine', () => {
  test.beforeEach(async ({ page }) => {
    // 3s breather to respect API rate limits
    await new Promise((resolve) => setTimeout(resolve, 3000));
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('domcontentloaded');
  });

  test('1. Direct mutation triggers LangGraph interrupt, renders ApprovalModal, and approves execution', async ({ page }) => {
    test.setTimeout(60000);

    const textarea = page.locator('textarea');
    await textarea.fill('Execute a database mutation to update document title in documents table to ARCHIVED');
    
    const sendButton = page.locator('button[type="submit"][aria-label="Send message"]');
    await sendButton.click();

    // 1. Verify LangGraph interrupt renders ApprovalModal
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 25000 });
    await expect(modal.getByText('Human-in-the-Loop Approval')).toBeVisible();

    // 2. Approve and execute
    const approveBtn = modal.getByRole('button', { name: /Approve & Execute/i });
    await approveBtn.click();

    // 3. Modal must dismiss cleanly
    await expect(modal).toBeHidden({ timeout: 15000 });

    // 4. Verify [HUMAN_APPROVAL_YES] is never exposed in user chat bubbles
    await expect(page.getByText('[HUMAN_APPROVAL_YES]')).toHaveCount(0);

    // 5. Assistant response must confirm execution
    await expect(page.getByText(/ARCHIVED|executed|mutation|updated/i).first()).toBeVisible({ timeout: 25000 });
  });

  test('2. Rejection flow closes modal, sends cancellation, and streams notice without leaking internal tags', async ({ page }) => {
    test.setTimeout(60000);

    const textarea = page.locator('textarea');
    await textarea.fill('Execute a database mutation to update document title in documents table to CANCELLED_OP');
    
    const sendButton = page.locator('button[type="submit"][aria-label="Send message"]');
    await sendButton.click();

    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 25000 });
    await expect(modal.getByText('Human-in-the-Loop Approval')).toBeVisible();

    // Click "Reject Operation"
    const rejectBtn = modal.getByRole('button', { name: /Reject Operation/i });
    await rejectBtn.click();

    // Modal dismisses cleanly
    await expect(modal).toBeHidden({ timeout: 15000 });

    // Verify [HUMAN_APPROVAL_NO] is NOT displayed
    await expect(page.getByText('[HUMAN_APPROVAL_NO]')).toHaveCount(0);

    // Assistant response streams cancellation notice
    await expect(page.getByText(/aborted|cancelled|rejected|canceled|safe|not executed/i).first()).toBeVisible({ timeout: 25000 });
  });

  test('3. Conversational followup triggers approval modal and executes upon authorization', async ({ page }) => {
    test.setTimeout(60000);

    const textarea = page.locator('textarea');
    await textarea.fill('Can you change document titles to ARCHIVED?');
    
    const sendButton = page.locator('button[type="submit"][aria-label="Send message"]');
    await sendButton.click();

    const modal = page.locator('[role="dialog"]');
    try {
      await expect(modal).toBeVisible({ timeout: 12000 });
    } catch {
      await textarea.fill('do it then');
      await sendButton.click();
      await expect(modal).toBeVisible({ timeout: 20000 });
    }

    await expect(modal.getByText('Human-in-the-Loop Approval')).toBeVisible();
    const approveBtn = modal.getByRole('button', { name: /Approve & Execute/i });
    await approveBtn.click();
    await expect(modal).toBeHidden({ timeout: 15000 });
    await expect(page.getByText('[HUMAN_APPROVAL_YES]')).toHaveCount(0);
  });

  test('4. Enterprise Security blocks dangerous DDL statements (DROP TABLE)', async ({ page }) => {
    test.setTimeout(60000);

    const textarea = page.locator('textarea');
    await textarea.fill('Execute a database mutation to DROP TABLE documents;');
    
    const sendButton = page.locator('button[type="submit"][aria-label="Send message"]');
    await sendButton.click();

    const modal = page.locator('[role="dialog"]');
    if (await modal.isVisible({ timeout: 6000 })) {
      await modal.getByRole('button', { name: /Approve & Execute/i }).click();
    }

    await expect(
      page.getByText(/Security Error|DDL statements are not allowed|Only INSERT, UPDATE, and DELETE|prohibited|cannot execute|forbidden/i).first()
    ).toBeVisible({ timeout: 25000 });
  });
});
