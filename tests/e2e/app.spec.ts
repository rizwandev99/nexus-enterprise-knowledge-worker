import { test, expect } from '@playwright/test';

/**
 * Nexus Enterprise Knowledge Worker - Playwright E2E Test Suite
 *
 * Comprehensive validation of:
 * - Smoke & Core Navigation UI
 * - Feature Bento Cards
 * - HITL Direct SQL Mutation & Approval Flow (No [HUMAN_APPROVAL_YES] bubble leaks)
 * - HITL Rejection Workflow (No [HUMAN_APPROVAL_NO] bubble leaks)
 * - HITL Conversational Followups ("Can you change...?" -> "do it then")
 * - Sequential Multi-Turn Chained Mutations in Same Thread
 * - DDL Security Blocking (DROP TABLE prevention)
 * - Suggestion Chips, Telemetry Modal, Sidebar, and Bubble Copy Actions
 */
test.describe('Nexus Enterprise Knowledge Worker', () => {
  // ──────────────────────────────────────────────────────────────────────────
  // TEST 1: Smoke Test — Page loads and core UI elements render
  // ──────────────────────────────────────────────────────────────────────────
  test('smoke test: homepage loads and renders core UI elements', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('domcontentloaded');

    // 1. Page title should contain "Nexus"
    await expect(page).toHaveTitle(/Nexus/);

    // 2. The chat textarea (primary input) must be visible
    await expect(
      page.locator('textarea[aria-label="Ask me anything, search knowledge base, or run SQL mutations..."]')
    ).toBeVisible();

    // 3. Sidebar / navigation rail must be present
    await expect(page.locator('nav, aside, [role="navigation"]').first()).toBeVisible();

    // 4. Send button must exist
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
    await page.waitForLoadState('domcontentloaded');

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
  // TEST 3: HITL Direct Flow — Submit SQL Mutation, Verify Approval Modal, and Approve
  // ──────────────────────────────────────────────────────────────────────────
  test('hitl: direct mutation triggers approval modal, displays SQL payload, and approves cleanly without showing approval text tags', async ({ page }) => {
    test.setTimeout(45000);

    await page.goto('http://localhost:3000');
    await page.waitForLoadState('domcontentloaded');

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
    await expect(modal.getByText(/UPDATE documents SET title/i)).toBeVisible();

    // Take screenshot with modal open
    await page.screenshot({ path: 'tests/e2e/screenshots/02_approval_modal_active.png' });

    // 4. Click "Approve & Execute"
    const approveBtn = modal.getByRole('button', { name: /Approve & Execute/i });
    await approveBtn.click();

    // 5. Modal should dismiss cleanly
    await expect(modal).toBeHidden({ timeout: 15000 });

    // 6. Verify [HUMAN_APPROVAL_YES] tag is NEVER visible in user bubbles
    await expect(page.getByText('[HUMAN_APPROVAL_YES]')).toHaveCount(0);

    // 7. Assistant response should confirm the execution
    await expect(page.getByText(/ARCHIVED|executed|mutation|updated/i).first()).toBeVisible({ timeout: 20000 });
    await page.screenshot({ path: 'tests/e2e/screenshots/03_mutation_executed.png' });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 4: HITL Rejection Workflow — Reject Operation cleanly cancels mutation
  // ──────────────────────────────────────────────────────────────────────────
  test('hitl: rejection workflow cleanly cancels mutation and streams cancellation notice without showing rejection text tags', async ({ page }) => {
    test.setTimeout(45000);

    await page.goto('http://localhost:3000');
    await page.waitForLoadState('domcontentloaded');

    const textarea = page.locator('textarea');
    await textarea.fill('Execute a database mutation to delete all records from document_chunks table');
    await page.keyboard.press('Enter');

    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 20000 });
    await expect(modal.getByText('Human-in-the-Loop Approval')).toBeVisible();

    // Click "Reject Operation"
    const rejectBtn = modal.getByRole('button', { name: /Reject Operation/i });
    await rejectBtn.click();

    // Modal should dismiss cleanly
    await expect(modal).toBeHidden({ timeout: 15000 });

    // Verify [HUMAN_APPROVAL_NO] is NEVER displayed in user bubbles
    await expect(page.getByText('[HUMAN_APPROVAL_NO]')).toHaveCount(0);

    // Assistant response should confirm cancellation
    await expect(page.getByText(/aborted|cancelled|rejected|canceled/i).first()).toBeVisible({ timeout: 20000 });
    await page.screenshot({ path: 'tests/e2e/screenshots/04_mutation_rejected.png' });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 5: Conversational Followup — "do it then" triggers HITL Approval Modal
  // ──────────────────────────────────────────────────────────────────────────
  test('hitl: handles conversational followups like "do it then" by triggering approval modal', async ({ page }) => {
    test.setTimeout(45000);
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('domcontentloaded');

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
    await expect(page.getByText('[HUMAN_APPROVAL_YES]')).toHaveCount(0);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 6: Sequential Chained HITL Mutations in Same Session
  // ──────────────────────────────────────────────────────────────────────────
  test('hitl: supports sequential chained mutations and approvals in the same session', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('domcontentloaded');

    const textarea = page.locator('textarea');
    const modal = page.locator('[role="dialog"]');

    // ── First Mutation ──
    await textarea.fill('Execute a database mutation to update document title in documents table to ARCHIVED');
    await page.keyboard.press('Enter');

    await expect(modal).toBeVisible({ timeout: 20000 });
    await expect(modal.getByText('Human-in-the-Loop Approval')).toBeVisible();
    await modal.getByRole('button', { name: /Approve & Execute/i }).click();
    await expect(modal).toBeHidden({ timeout: 15000 });

    // Wait for the first mutation confirmation response to stream in
    await expect(page.getByText(/ARCHIVED/i).first()).toBeVisible({ timeout: 15000 });

    // ── Second Chained Mutation ("delete it now") ──
    await textarea.fill('delete it now');
    const sendButton = page.locator('button[type="submit"][aria-label="Send message"]');
    await expect(sendButton).toBeEnabled({ timeout: 15000 });
    await page.keyboard.press('Enter');

    // Modal MUST appear a second time for the delete operation!
    await expect(modal).toBeVisible({ timeout: 25000 });
    await expect(modal.getByText('Human-in-the-Loop Approval')).toBeVisible();
    await expect(modal.getByText(/DELETE FROM documents/i)).toBeVisible();

    await modal.getByRole('button', { name: /Approve & Execute/i }).click();
    await expect(modal).toBeHidden({ timeout: 15000 });
    await expect(page.getByText('[HUMAN_APPROVAL_YES]')).toHaveCount(0);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 7: DDL Security — Dangerous DDL like DROP TABLE is rejected
  // ──────────────────────────────────────────────────────────────────────────
  test('hitl security: blocks dangerous DDL statements like DROP TABLE', async ({ page }) => {
    test.setTimeout(45000);
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('domcontentloaded');

    const textarea = page.locator('textarea');
    await textarea.fill('Execute a database mutation to DROP TABLE documents;');
    await page.keyboard.press('Enter');

    // The modal or agent should reject DDL
    const modal = page.locator('[role="dialog"]');
    if (await modal.isVisible({ timeout: 5000 })) {
      // If tool was proposed, verify approving it triggers security block or error message
      await modal.getByRole('button', { name: /Approve & Execute/i }).click();
    }

    // Expect security error / DDL rejection message
    await expect(page.getByText(/Security Error|DDL statements are not allowed|Only INSERT, UPDATE, and DELETE/i).first()).toBeVisible({ timeout: 25000 });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 8: Suggestion Chips — All 4 Chips Execute Workflows
  // ──────────────────────────────────────────────────────────────────────────
  test('chips: all 4 suggestion chips populate queries and execute workflows with citations & HITL', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('domcontentloaded');

    // 1. Chip 1: "Search documents"
    const searchDocsChip = page.getByRole('button', { name: 'Search documents' });
    await expect(searchDocsChip).toBeVisible();
    await searchDocsChip.click();

    // Verify textarea populated with security compliance prompt
    const textarea = page.locator('textarea');
    await expect(textarea).toHaveValue(/Search documents for enterprise security compliance/i);

    // Send the query
    const sendButton = page.locator('button[type="submit"][aria-label="Send message"]');
    await sendButton.click();

    // Verify assistant responds with enterprise security & compliance policies and citations
    await expect(page.getByText(/Zero-Trust|Security|Compliance|RBAC|Policy/i).first()).toBeVisible({ timeout: 25000 });
    await expect(page.getByText(/\[Doc-\d+\]/i).first()).toBeVisible({ timeout: 25000 });

    // 2. Start a fresh chat session for next chip test
    const newChatBtn = page.locator('button[title*="Start New Chat Session"]').first();
    await newChatBtn.click();
    await expect(page.getByText('Hi, User')).toBeVisible();

    // 3. Chip 4: "System SLA"
    const slaChip = page.getByRole('button', { name: 'System SLA' });
    await expect(slaChip).toBeVisible();
    await slaChip.click();
    await expect(textarea).toHaveValue(/Check system SLA, uptime metrics and telemetry status/i);
    await sendButton.click();

    // Verify response contains 99.99% uptime, <450ms P95 latency, or OpenTelemetry
    await expect(page.getByText(/99\.99%|uptime|SLA|<450ms|latency|OpenTelemetry/i).first()).toBeVisible({ timeout: 25000 });
    await expect(page.getByText(/\[Doc-\d+\]/i).first()).toBeVisible({ timeout: 25000 });

    // 4. Start fresh chat session for Chip 3: "Audit Logs"
    await newChatBtn.click();
    await expect(page.getByText('Hi, User')).toBeVisible();

    const auditChip = page.getByRole('button', { name: 'Audit Logs' });
    await expect(auditChip).toBeVisible();
    await auditChip.click();
    await expect(textarea).toHaveValue(/Review system audit logs and recent agent mutations/i);
    await sendButton.click();

    // Verify audit logs / governance policy response
    await expect(page.getByText(/Audit|Mutation|Governance|Change Control|Protocol/i).first()).toBeVisible({ timeout: 25000 });

    // 5. Start fresh chat session for Chip 2: "SQL Mutation"
    await newChatBtn.click();
    await expect(page.getByText('Hi, User')).toBeVisible();

    const sqlChip = page.getByRole('button', { name: 'SQL Mutation' });
    await expect(sqlChip).toBeVisible();
    await sqlChip.click();
    await expect(textarea).toHaveValue(/Execute SQL Mutation: UPDATE documents SET title/i);
    await sendButton.click();

    // Verify HITL Approval Modal pops up
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible({ timeout: 25000 });
    await expect(modal.getByText('Human-in-the-Loop Approval')).toBeVisible();
    await modal.getByRole('button', { name: /Approve & Execute/i }).click();
    await expect(modal).toBeHidden({ timeout: 15000 });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 9: Telemetry Modal — Header Trigger, Rail Trigger, DAG & P95 Latency
  // ──────────────────────────────────────────────────────────────────────────
  test('telemetry: opens from header and rail, displays DAG flow, checkpointer state and P95 latency', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('domcontentloaded');

    // 1. Click header 'Telemetry' button
    const telemetryBtn = page.getByRole('button', { name: /Telemetry/i }).first();
    await expect(telemetryBtn).toBeVisible();
    await telemetryBtn.click();

    // 2. Modal should appear with dark frosted glass backdrop
    const modal = page.locator('div.glass-panel').filter({ hasText: /Live Agent Telemetry & Tracing/i });
    await expect(modal).toBeVisible();

    // 3. Verify LangGraph cyclic DAG flow nodes
    await expect(modal.getByText('ragNode')).toBeVisible();
    await expect(modal.getByText('reasoningNode')).toBeVisible();
    await expect(modal.getByText('approvalNode')).toBeVisible();
    await expect(modal.getByText('toolsNode')).toBeVisible();

    // 4. Verify P95 latency and checkpointer specs
    await expect(modal.getByText('P95 RAG Latency')).toBeVisible();
    await expect(modal.getByText('Orchestration & State Checkpointer')).toBeVisible();
    await expect(modal.getByText('PostgresSaver', { exact: false }).first()).toBeVisible();

    // Screenshot of open Telemetry Modal
    await page.screenshot({ path: 'tests/e2e/screenshots/telemetry_modal_open.png' });

    // 5. Close modal via "Done" button
    const doneBtn = modal.getByRole('button', { name: 'Done' });
    await doneBtn.click();
    await expect(modal).toBeHidden();

    // 6. Test rail activity icon trigger
    const railTelemetryBtn = page.locator('button[title*="LangGraph State Machine"]').first();
    await expect(railTelemetryBtn).toBeVisible();
    await railTelemetryBtn.click();
    await expect(modal).toBeVisible();

    // 7. Click close button to dismiss
    const closeBtn = modal.locator('button[aria-label="Close modal"]');
    await closeBtn.click();
    await expect(modal).toBeHidden();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 10: Sidebar — Drawer Toggle, New Thread (+), and Two-Tap Deletion Modal
  // ──────────────────────────────────────────────────────────────────────────
  test('sidebar: toggles drawer, starts new thread, and displays two-tap delete modal', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('domcontentloaded');

    // 1. Toggle sessions drawer using brand squircle in rail
    const toggleDrawerBtn = page.locator('button[title*="Toggle Sessions Drawer"]').first();
    await expect(toggleDrawerBtn).toBeVisible();
    await toggleDrawerBtn.click();

    // Sessions drawer heading should be visible
    await expect(page.getByText('Chat Sessions').first()).toBeVisible();

    // 2. Click '+' New Thread icon in rail
    const newChatBtn = page.locator('button[title*="Start New Chat Session"]').first();
    await expect(newChatBtn).toBeVisible();
    await newChatBtn.click();

    // Verify empty state is rendered
    await expect(page.getByText('Hi, User')).toBeVisible();
    await expect(page.getByText('Can I help you with anything?')).toBeVisible();

    // Screenshot of sidebar drawer
    await page.screenshot({ path: 'tests/e2e/screenshots/sidebar_drawer_open.png' });

    // 3. Check Clear All delete modal lifecycle if sessions exist
    const clearAllBtn = page.getByRole('button', { name: /Clear all/i });
    if (await clearAllBtn.isVisible()) {
      await clearAllBtn.click();

      // Modal appears
      const deleteModal = page.locator('div').filter({ hasText: /Clear All Conversations\?/i }).first();
      await expect(deleteModal).toBeVisible();

      // Click Cancel
      const cancelBtn = deleteModal.getByRole('button', { name: 'Cancel' });
      await cancelBtn.click();
      await expect(deleteModal).toBeHidden();
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 11: Message Bubble — User Copy Button, Citation Inspect Popovers
  // ──────────────────────────────────────────────────────────────────────────
  test('bubble: user message renders high-contrast copy button with copied state', async ({ page }) => {
    test.setTimeout(45000);
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('domcontentloaded');

    // 1. Send user message
    const textarea = page.locator('textarea');
    await textarea.fill('What is the data retention and GDPR policy?');
    const sendButton = page.locator('button[type="submit"][aria-label="Send message"]');
    await sendButton.click();

    // 2. Message bubble should render
    const userBubble = page.getByText('What is the data retention and GDPR policy?');
    await expect(userBubble).toBeVisible({ timeout: 10000 });

    // 3. User message copy button
    const copyBtns = page.locator('button[aria-label="Copy message"]');
    await expect(copyBtns.first()).toBeVisible();

    // Click copy button
    await copyBtns.first().click();
    await expect(page.getByText(/Copied!/i).first()).toBeVisible();

    // Screenshot of message bubbles
    await page.screenshot({ path: 'tests/e2e/screenshots/message_bubbles_rendered.png' });
  });
});
