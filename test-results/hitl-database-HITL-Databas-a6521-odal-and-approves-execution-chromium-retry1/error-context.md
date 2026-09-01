# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: hitl-database.spec.ts >> HITL Database Mutation & Security Engine >> 1. Direct mutation triggers LangGraph interrupt, renders ApprovalModal, and approves execution
- Location: tests\e2e\hitl-database.spec.ts:11:7

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
  3   | test.describe('HITL Database Mutation & Security Engine', () => {
  4   |   test.beforeEach(async ({ page }) => {
  5   |     // 3s breather to respect API rate limits
  6   |     await new Promise((resolve) => setTimeout(resolve, 3000));
> 7   |     await page.goto('http://localhost:3000');
      |                ^ Error: page.goto: Test ended.
  8   |     await page.waitForLoadState('domcontentloaded');
  9   |   });
  10  | 
  11  |   test('1. Direct mutation triggers LangGraph interrupt, renders ApprovalModal, and approves execution', async ({ page }) => {
  12  |     test.setTimeout(60000);
  13  | 
  14  |     const textarea = page.locator('textarea');
  15  |     await textarea.fill('Execute a database mutation to update document title in documents table to ARCHIVED');
  16  |     
  17  |     const sendButton = page.locator('button[type="submit"][aria-label="Send message"]');
  18  |     await sendButton.click();
  19  | 
  20  |     // 1. Verify LangGraph interrupt renders ApprovalModal
  21  |     const modal = page.locator('[role="dialog"]');
  22  |     await expect(modal).toBeVisible({ timeout: 25000 });
  23  |     await expect(modal.getByText('Human-in-the-Loop Approval')).toBeVisible();
  24  | 
  25  |     // 2. Approve and execute
  26  |     const approveBtn = modal.getByRole('button', { name: /Approve & Execute/i });
  27  |     await approveBtn.click();
  28  | 
  29  |     // 3. Modal must dismiss cleanly
  30  |     await expect(modal).toBeHidden({ timeout: 15000 });
  31  | 
  32  |     // 4. Verify [HUMAN_APPROVAL_YES] is never exposed in user chat bubbles
  33  |     await expect(page.getByText('[HUMAN_APPROVAL_YES]')).toHaveCount(0);
  34  | 
  35  |     // 5. Assistant response must confirm execution
  36  |     await expect(page.getByText(/ARCHIVED|executed|mutation|updated/i).first()).toBeVisible({ timeout: 25000 });
  37  |   });
  38  | 
  39  |   test('2. Rejection flow closes modal, sends cancellation, and streams notice without leaking internal tags', async ({ page }) => {
  40  |     test.setTimeout(60000);
  41  | 
  42  |     const textarea = page.locator('textarea');
  43  |     await textarea.fill('Execute a database mutation to update document title in documents table to CANCELLED_OP');
  44  |     
  45  |     const sendButton = page.locator('button[type="submit"][aria-label="Send message"]');
  46  |     await sendButton.click();
  47  | 
  48  |     const modal = page.locator('[role="dialog"]');
  49  |     await expect(modal).toBeVisible({ timeout: 25000 });
  50  |     await expect(modal.getByText('Human-in-the-Loop Approval')).toBeVisible();
  51  | 
  52  |     // Click "Reject Operation"
  53  |     const rejectBtn = modal.getByRole('button', { name: /Reject Operation/i });
  54  |     await rejectBtn.click();
  55  | 
  56  |     // Modal dismisses cleanly
  57  |     await expect(modal).toBeHidden({ timeout: 15000 });
  58  | 
  59  |     // Verify [HUMAN_APPROVAL_NO] is NOT displayed
  60  |     await expect(page.getByText('[HUMAN_APPROVAL_NO]')).toHaveCount(0);
  61  | 
  62  |     // Assistant response streams cancellation notice
  63  |     await expect(page.getByText(/aborted|cancelled|rejected|canceled|safe|not executed/i).first()).toBeVisible({ timeout: 25000 });
  64  |   });
  65  | 
  66  |   test('3. Conversational followup triggers approval modal and executes upon authorization', async ({ page }) => {
  67  |     test.setTimeout(60000);
  68  | 
  69  |     const textarea = page.locator('textarea');
  70  |     await textarea.fill('Can you change document titles to ARCHIVED?');
  71  |     
  72  |     const sendButton = page.locator('button[type="submit"][aria-label="Send message"]');
  73  |     await sendButton.click();
  74  | 
  75  |     const modal = page.locator('[role="dialog"]');
  76  |     try {
  77  |       await expect(modal).toBeVisible({ timeout: 12000 });
  78  |     } catch {
  79  |       await textarea.fill('do it then');
  80  |       await sendButton.click();
  81  |       await expect(modal).toBeVisible({ timeout: 20000 });
  82  |     }
  83  | 
  84  |     await expect(modal.getByText('Human-in-the-Loop Approval')).toBeVisible();
  85  |     const approveBtn = modal.getByRole('button', { name: /Approve & Execute/i });
  86  |     await approveBtn.click();
  87  |     await expect(modal).toBeHidden({ timeout: 15000 });
  88  |     await expect(page.getByText('[HUMAN_APPROVAL_YES]')).toHaveCount(0);
  89  |   });
  90  | 
  91  |   test('4. Enterprise Security blocks dangerous DDL statements (DROP TABLE)', async ({ page }) => {
  92  |     test.setTimeout(60000);
  93  | 
  94  |     const textarea = page.locator('textarea');
  95  |     await textarea.fill('Execute a database mutation to DROP TABLE documents;');
  96  |     
  97  |     const sendButton = page.locator('button[type="submit"][aria-label="Send message"]');
  98  |     await sendButton.click();
  99  | 
  100 |     const modal = page.locator('[role="dialog"]');
  101 |     if (await modal.isVisible({ timeout: 6000 })) {
  102 |       await modal.getByRole('button', { name: /Approve & Execute/i }).click();
  103 |     }
  104 | 
  105 |     await expect(
  106 |       page.getByText(/Security Error|DDL statements are not allowed|Only INSERT, UPDATE, and DELETE|prohibited|cannot execute|forbidden/i).first()
  107 |     ).toBeVisible({ timeout: 25000 });
```