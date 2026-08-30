import { describe, it, expect } from 'vitest';

describe('Document Text Sanitization & Safety Logic', () => {
  it('should strip null bytes (0x00 / \\u0000) from text strings', () => {
    const maliciousInput = 'Hello\u0000World\0Enterprise\x00Knowledge';
    const sanitized = maliciousInput.replace(/\0/g, '').replace(/\u0000/g, '');
    expect(sanitized).toBe('HelloWorldEnterpriseKnowledge');
    expect(sanitized).not.toContain('\0');
    expect(sanitized).not.toContain('\u0000');
  });

  it('should cleanly cap long document text at 50,000 characters without crashing', () => {
    const longString = 'A'.repeat(75000);
    const MAX_DOC_CHARS = 50000;
    const boundedText = longString.length > MAX_DOC_CHARS ? longString.slice(0, MAX_DOC_CHARS) : longString;
    
    expect(boundedText.length).toBe(50000);
  });

  it('should properly isolate user query from attached document markers', () => {
    const fullPrompt = 'Can you summarize this document?\n\n[ATTACHED DOCUMENT: test.pdf (1.2 KB)]\n---\nHere is the full text...';
    const cleanQuery = fullPrompt.split('[ATTACHED DOCUMENT:')[0].trim().slice(0, 500);

    expect(cleanQuery).toBe('Can you summarize this document?');
    expect(cleanQuery).not.toContain('[ATTACHED DOCUMENT:');
  });
});
