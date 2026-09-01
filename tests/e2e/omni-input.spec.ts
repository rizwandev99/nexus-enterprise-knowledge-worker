import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

test.describe('Omni-Input Bar & Enterprise Controls E2E Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await expect(page.locator('textarea')).toBeVisible();
  });

  test('1. Omni-input controls and icons render correctly', async ({ page }) => {
    const textarea = page.locator('textarea');
    await expect(textarea).toBeVisible();

    const chips = ['Search documents', 'SQL Mutation', 'Audit Logs', 'System SLA'];
    for (const chip of chips) {
      await expect(page.getByRole('button', { name: chip })).toBeVisible();
    }

    const attachBtn = page.locator('button[aria-label="Attach Document"]');
    await expect(attachBtn).toBeVisible();

    const toolsBtn = page.locator('button[aria-label="Enterprise Tools & Integrations"]');
    await expect(toolsBtn).toBeVisible();

    const modelBtn = page.locator('button[title="Select AI Inference Engine"]');
    await expect(modelBtn).toBeVisible();

    const sendBtn = page.locator('button[aria-label="Send message"]');
    await expect(sendBtn).toBeVisible();
    await expect(sendBtn).toBeDisabled();
  });

  test('2. Enterprise Tools & Integrations popover opens and displays all 3 active tools', async ({ page }) => {
    const toolsBtn = page.locator('button[aria-label="Enterprise Tools & Integrations"]');
    await toolsBtn.click();

    await expect(page.getByText('3 Active')).toBeVisible();

    await expect(page.getByText('PostgreSQL pgvector')).toBeVisible();
    await expect(page.getByText('Hybrid RAG • RRF Ranked')).toBeVisible();

    await expect(page.getByText('SQL Mutation Engine')).toBeVisible();
    await expect(page.getByText('Document Parser Engine')).toBeVisible();

    await page.screenshot({ path: 'tests/e2e/screenshots/omni_02_tools_popover_open.png' });

    await page.keyboard.press('Escape');
    await expect(page.getByText('3 Active')).toBeHidden();
  });

  test('3. Model Selector dropdown displays multi-provider models and updates selection', async ({ page }) => {
    const modelBtn = page.locator('button[title="Select AI Inference Engine"]');
    await modelBtn.click();

    await expect(page.locator('[role="listbox"]')).toBeVisible();
    await expect(page.locator('[role="listbox"]').getByText('Inference Model')).toBeVisible();
    await expect(page.locator('[role="listbox"]').getByText('Enterprise Multi-Provider')).toBeVisible();

    await expect(page.locator('[role="listbox"]').getByText('Groq GPT-OSS 120B')).toBeVisible();
    await expect(page.locator('[role="listbox"]').getByText('OpenAI GPT-4o')).toBeVisible();
    await expect(page.locator('[role="listbox"]').getByText('Claude 3.5 Sonnet')).toBeVisible();

    await page.screenshot({ path: 'tests/e2e/screenshots/omni_03_model_selector_open.png' });

    // Select OpenAI GPT-4o
    await page.locator('[role="listbox"]').getByText('OpenAI GPT-4o').click();
    await expect(modelBtn).toContainText('OpenAI GPT-4o');

    // Switch back to Groq GPT-OSS 120B
    await modelBtn.click();
    await expect(page.locator('[role="listbox"]')).toBeVisible();
    await page.locator('[role="listbox"]').getByText('Groq GPT-OSS 120B').click();
    await expect(modelBtn).toContainText('Groq GPT-OSS 120B');
  });

  test('4. File attachment workflow: upload, preview pill, remove, and submit', async ({ page }) => {
    test.setTimeout(60000);

    const tempFilePath = path.join(process.cwd(), 'temp-qa-spec.md');
    fs.writeFileSync(tempFilePath, '# Enterprise Architecture QA Policy\n\nAll services must maintain 99.99% availability and distributed logging.');

    try {
      const fileChooserPromise = page.waitForEvent('filechooser');
      const attachBtn = page.locator('button[aria-label="Attach Document"]');
      await attachBtn.click();
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles(tempFilePath);

      await expect(page.locator('form').getByText('temp-qa-spec.md')).toBeVisible({ timeout: 15000 });
      await page.screenshot({ path: 'tests/e2e/screenshots/omni_04_file_attached.png' });

      const sendBtn = page.locator('button[aria-label="Send message"]');
      await expect(sendBtn).toBeEnabled();

      const removeBtn = page.locator('button[aria-label="Remove attachment"]');
      await removeBtn.click();
      await expect(page.locator('form').getByText('temp-qa-spec.md')).toBeHidden();
      await expect(sendBtn).toBeDisabled();

      const fileChooserPromise2 = page.waitForEvent('filechooser');
      await attachBtn.click();
      const fileChooser2 = await fileChooserPromise2;
      await fileChooser2.setFiles(tempFilePath);
      await expect(page.locator('form').getByText('temp-qa-spec.md')).toBeVisible({ timeout: 15000 });

      const textarea = page.locator('textarea');
      await textarea.fill('Summarize this uploaded architecture document:');
      await page.keyboard.press('Enter');

      // Attachment pill in the input form should be cleared
      await expect(page.locator('button[aria-label="Remove attachment"]')).toBeHidden();
      await expect(page.getByText(/Enterprise Architecture|99\.99%|availability|document/i).first()).toBeVisible({ timeout: 35000 });
      await page.screenshot({ path: 'tests/e2e/screenshots/omni_05_attachment_submitted.png' });
    } finally {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
  });
});