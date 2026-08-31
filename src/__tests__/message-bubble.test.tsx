import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MessageBubble from '../components/message-bubble';
import type { UIMessage } from '@ai-sdk/react';

describe('MessageBubble Markdown & Feature Rendering', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve()),
      },
    });
  });

  it('renders bold, inline code, and headers properly', () => {
    const message: UIMessage = {
      id: 'msg-1',
      role: 'assistant',
      parts: [
        {
          type: 'text',
          text: '### System Architecture\nThis is **bold text** with `inline_code()` function.',
        },
      ],
    };

    render(<MessageBubble message={message} isUser={false} />);

    expect(screen.getByText('System Architecture')).toBeDefined();
    expect(screen.getByText('bold text')).toBeDefined();
    expect(screen.getByText('inline_code()')).toBeDefined();
  });

  it('renders fenced code blocks with language header and copy button', () => {
    const message: UIMessage = {
      id: 'msg-2',
      role: 'assistant',
      parts: [
        {
          type: 'text',
          text: '```typescript\nconst enterprise = true;\n```',
        },
      ],
    };

    render(<MessageBubble message={message} isUser={false} />);

    const codeCopyBtn = screen.getByRole('button', { name: /copy code to clipboard/i });
    expect(codeCopyBtn).toBeDefined();
    fireEvent.click(codeCopyBtn);
    expect(codeCopyBtn.textContent).toContain('Copied!');
  });

  it('renders markdown tables cleanly', () => {
    const tableMd = '| Service | Status | Latency |\n|---|---|---|\n| Hybrid RAG | Online | 42ms |\n| SQL HITL | Ready | 18ms |';
    const message: UIMessage = {
      id: 'msg-3',
      role: 'assistant',
      parts: [{ type: 'text', text: tableMd }],
    };

    render(<MessageBubble message={message} isUser={false} />);

    expect(screen.getByText('Service')).toBeDefined();
    expect(screen.getAllByText('Hybrid RAG')[0]).toBeDefined();
    expect(screen.getByText('42ms')).toBeDefined();
    expect(screen.getAllByText('SQL HITL')[0]).toBeDefined();
  });

  it('renders interactive [Doc-X] citation pills and calls onSelectCitation', () => {
    const onSelectCitation = vi.fn();
    const message: UIMessage = {
      id: 'msg-4',
      role: 'assistant',
      parts: [
        {
          type: 'text',
          text: 'According to verified security policies [Doc-1] and [Doc-3], data is encrypted.',
        },
      ],
    };

    render(<MessageBubble message={message} isUser={false} onSelectCitation={onSelectCitation} />);

    const doc1Button = screen.getByRole('button', { name: /Doc-1/i });
    expect(doc1Button).toBeDefined();

    fireEvent.click(doc1Button);
    expect(onSelectCitation).toHaveBeenCalledWith(1);
  });

  it('renders user message with attached document badge', () => {
    const userPrompt = 'Can you analyze this report?\n\n[ATTACHED DOCUMENT: quarterly_report.pdf (24.5 KB)]\n--- ATTACHED DOCUMENT CONTENT\nSales grew 45% YoY.';
    const message: UIMessage = {
      id: 'msg-5',
      role: 'user',
      parts: [{ type: 'text', text: userPrompt }],
    };

    render(<MessageBubble message={message} isUser={true} />);

    expect(screen.getByText('Can you analyze this report?')).toBeDefined();
    expect(screen.getByText('Attached: quarterly_report.pdf (24.5 KB)')).toBeDefined();
  });

  it('handles in-flight streaming markdown tables without crashing or thrashing', () => {
    // In-flight table where row has missing trailing pipe and missing column padding
    const streamingTableMd = 'Paragraph before table\n| Model | Speed | Cost\n|---|---|---\n| Groq LPU | 850 tok/s';
    const message: UIMessage = {
      id: 'msg-stream-table',
      role: 'assistant',
      parts: [{ type: 'text', text: streamingTableMd }],
    };

    render(<MessageBubble message={message} isUser={false} />);

    expect(screen.getByText('Paragraph before table')).toBeDefined();
    expect(screen.getByText('Model')).toBeDefined();
    expect(screen.getByText('Speed')).toBeDefined();
    expect(screen.getByText('Cost')).toBeDefined();
    expect(screen.getByText('Groq LPU')).toBeDefined();
    expect(screen.getByText('850 tok/s')).toBeDefined();
  });

  it('renders high-contrast copy button on user message and toggles Copied! state', () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve()),
      },
    });

    const message: UIMessage = {
      id: 'msg-copy-user',
      role: 'user',
      parts: [{ type: 'text', text: 'Explain PostgreSQL tsvector indexes' }],
    };

    render(<MessageBubble message={message} isUser={true} />);

    const copyBtn = screen.getByRole('button', { name: /copy message/i });
    expect(copyBtn).toBeDefined();
    expect(copyBtn.textContent).toContain('Copy');

    fireEvent.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Explain PostgreSQL tsvector indexes');
    expect(copyBtn.textContent).toContain('Copied!');
  });

  it('renders copy button on assistant message and copies full response content', () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve()),
      },
    });

    const message: UIMessage = {
      id: 'msg-copy-assistant',
      role: 'assistant',
      parts: [{ type: 'text', text: 'Here is the comprehensive response.' }],
    };

    render(<MessageBubble message={message} isUser={false} />);

    const copyBtn = screen.getByRole('button', { name: /copy message/i });
    expect(copyBtn).toBeDefined();

    fireEvent.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Here is the comprehensive response.');
    expect(copyBtn.textContent).toContain('Copied!');
  });
});

