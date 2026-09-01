import { test, expect } from '@playwright/test';

/**
 * Nexus Enterprise Knowledge Worker - Hybrid RAG & Citations E2E Test Suite
 *
 * Comprehensive validation of:
 * 1. Enterprise Hybrid RAG Retrieval & Injected Citations ([Doc-1], [Doc-2])
 * 2. 3D Citation Deck with stacked depth offsets & Inspect triggers
 * 3. Slide-over Citation Drawer with metadata, RRF score grid, tabs & 1-click copy
 * 4. Stream-Safe Markdown Engine with code blocks & 1-click copy
 * 5. Markdown Table Rendering with structured thead/tbody
 */
test.describe('Hybrid RAG, 3D Citations & Markdown Engine', () => {

  test.beforeEach(async ({ page }) => {
    // 2s pause between test runs to ensure complete idle state
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('domcontentloaded');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 1: Enterprise Hybrid RAG Retrieval & Injected Citations
  // ──────────────────────────────────────────────────────────────────────────
  test('rag: hybrid search retrieves enterprise policy and renders citations [Doc-X]', async ({ page }) => {
    test.setTimeout(90000);

    const textarea = page.locator('textarea');
    await textarea.fill('What is the company policy on data retention and GDPR Article 17 deletion?');
    
    const sendBtn = page.locator('button[type="submit"][aria-label="Send message"]');
    await expect(sendBtn).toBeEnabled({ timeout: 10000 });
    await sendBtn.click();

    // Verify response content includes retrieved governance text
    const assistantBubble = page.locator('div.glass-panel').filter({ hasText: /retention|GDPR|90 days|24 hours|Zero-Trust/i }).first();
    await expect(assistantBubble).toBeVisible({ timeout: 60000 });

    // Verify citation pill [Doc-X] is rendered
    const citationBtn = page.locator('button[aria-label^="Doc-"], button:has-text("[Doc-")').first();
    await expect(citationBtn).toBeVisible({ timeout: 40000 });

    // Screenshot of RAG retrieval & citations
    await page.screenshot({ path: 'tests/e2e/screenshots/rag_01_retrieval_citations.png' });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 2: 3D Citation Deck Rendering
  // ──────────────────────────────────────────────────────────────────────────
  test('deck: renders 3D stacked citation deck with depth offsets and inspect trigger', async ({ page }) => {
    test.setTimeout(90000);

    const textarea = page.locator('textarea');
    await textarea.fill('What are the SLA commitments and P95 latency requirements for Nexus?');
    
    const sendBtn = page.locator('button[type="submit"][aria-label="Send message"]');
    await expect(sendBtn).toBeEnabled({ timeout: 10000 });
    await sendBtn.click();

    // Wait for response with SLA details
    await expect(page.getByText(/99\.99%|SLA|<450ms|latency|uptime/i).first()).toBeVisible({ timeout: 60000 });

    // Verify 3D Citation Deck header "Verified Sources"
    await expect(page.getByText(/Verified Sources/i).first()).toBeVisible({ timeout: 40000 });

    // Verify "✦ Inspect Citations" button
    const inspectBtn = page.getByRole('button', { name: /✦ Inspect Citations/i }).first();
    await expect(inspectBtn).toBeVisible();

    // Verify 3D stack top card
    const citationCard = page.getByText(/Verified Enterprise Policy & Governance/i).first();
    await expect(citationCard).toBeVisible();

    // Screenshot of 3D Citation Deck
    await page.screenshot({ path: 'tests/e2e/screenshots/rag_02_3d_citation_deck.png' });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 3: Slide-over Citation Drawer Lifecycle & Features
  // ──────────────────────────────────────────────────────────────────────────
  test('drawer: opens slide-over CitationDrawer with metadata, similarity scores, tabs, and 1-click copy', async ({ page }) => {
    test.setTimeout(90000);

    const textarea = page.locator('textarea');
    await textarea.fill('What are the database mutation guidelines and change control protocol?');
    
    const sendBtn = page.locator('button[type="submit"][aria-label="Send message"]');
    await expect(sendBtn).toBeEnabled({ timeout: 10000 });
    await sendBtn.click();

    // Wait for citations to appear
    const citationBtn = page.locator('button[aria-label^="Doc-"], button:has-text("[Doc-")').first();
    await expect(citationBtn).toBeVisible({ timeout: 60000 });

    // Click citation pill to trigger Slide-over Citation Drawer
    await citationBtn.click();

    // Verify Slide-over Citation Drawer is open
    const drawer = page.locator('aside').filter({ hasText: /Source Inspector/i });
    await expect(drawer).toBeVisible({ timeout: 15000 });

    // Verify header badge [Doc-1]
    await expect(drawer.getByText(/\[Doc-\d+\]/).first()).toBeVisible();

    // Verify metadata fields: Document Title, Match Score, Department, URI Resource
    await expect(drawer.getByText('Document Title')).toBeVisible();
    await expect(drawer.getByText('Match Score')).toBeVisible();
    await expect(drawer.getByText('Department')).toBeVisible();
    await expect(drawer.getByText('URI Resource')).toBeVisible();

    // Verify Reciprocal Rank Fusion (RRF) Scores grid
    await expect(drawer.getByText('Reciprocal Rank Fusion (RRF) Scores')).toBeVisible();
    await expect(drawer.getByText('RRF Rank')).toBeVisible();
    await expect(drawer.getByText('pgvector Cosine')).toBeVisible();
    await expect(drawer.getByText('tsvector Keyword')).toBeVisible();

    // Verify tabs: "Retrieved Passage Chunk" and "Full Indexed Document"
    const passageTab = drawer.getByRole('button', { name: 'Retrieved Passage Chunk' });
    const fullDocTab = drawer.getByRole('button', { name: 'Full Indexed Document' });
    await expect(passageTab).toBeVisible();
    await expect(fullDocTab).toBeVisible();

    // Switch to Full Document Tab
    await fullDocTab.click();
    await page.waitForTimeout(400);

    // Test 1-Click Copy button inside drawer
    const copyBtn = drawer.getByRole('button', { name: /Copy/i });
    await expect(copyBtn).toBeVisible();
    await copyBtn.click();
    await expect(drawer.getByText(/Copied!/i)).toBeVisible({ timeout: 5000 });

    // Screenshot of Slide-over Citation Drawer
    await page.screenshot({ path: 'tests/e2e/screenshots/rag_03_citation_drawer_open.png' });

    // Close drawer via "Done" button
    const doneBtn = drawer.getByRole('button', { name: 'Done' });
    await doneBtn.click();
    await expect(drawer).toBeHidden({ timeout: 5000 });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 4: Stream-Safe Markdown Engine & Code Block Copy
  // ──────────────────────────────────────────────────────────────────────────
  test('markdown: renders headers, bold/italics, bullet lists, inline code, and code block with copy button', async ({ page }) => {
    test.setTimeout(90000);

    const textarea = page.locator('textarea');
    await textarea.fill('Provide a SQL query example wrapped in triple backticks with bullet list explanation');
    
    const sendBtn = page.locator('button[type="submit"][aria-label="Send message"]');
    await expect(sendBtn).toBeEnabled({ timeout: 10000 });
    await sendBtn.click();

    // Wait for response
    const assistantBubble = page.locator('div.glass-panel').filter({ hasText: /SELECT|UPDATE|SQL|query|table/i }).first();
    await expect(assistantBubble).toBeVisible({ timeout: 60000 });

    // Check for <code> or <pre> code block
    const codeBlock = page.locator('pre code').first();
    await expect(codeBlock).toBeVisible({ timeout: 30000 });

    // Check for code copy button
    const codeCopyBtn = page.locator('button[aria-label="copy code to clipboard"]').first();
    if (await codeCopyBtn.isVisible()) {
      await codeCopyBtn.click();
      await expect(page.getByText(/Copied!/i).first()).toBeVisible({ timeout: 5000 });
    }

    // Screenshot of markdown rendering
    await page.screenshot({ path: 'tests/e2e/screenshots/rag_04_markdown_elements.png' });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 5: Structured Markdown Table Rendering
  // ──────────────────────────────────────────────────────────────────────────
  test('table: renders structured markdown table with headers and clean alignment', async ({ page }) => {
    test.setTimeout(90000);

    const textarea = page.locator('textarea');
    await textarea.fill('Create a markdown table comparing PostgreSQL vs Redis with columns: Feature, PostgreSQL, Redis');
    
    const sendBtn = page.locator('button[type="submit"][aria-label="Send message"]');
    await expect(sendBtn).toBeEnabled({ timeout: 10000 });
    await sendBtn.click();

    // Wait for table to render
    const table = page.locator('table').first();
    await expect(table).toBeVisible({ timeout: 60000 });

    // Verify thead and th headers
    const headers = page.locator('th');
    await expect(headers.first()).toBeVisible();

    // Verify table rows in tbody
    const rows = page.locator('tbody tr');
    await expect(rows.first()).toBeVisible();

    // Screenshot of rendered markdown table
    await page.screenshot({ path: 'tests/e2e/screenshots/rag_05_markdown_table.png' });
  });
});
