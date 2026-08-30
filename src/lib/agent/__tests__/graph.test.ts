import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createAgentGraph, resolveModel } from '../graph';
import { estimateTokenCost, estimateTokenCount, MODEL_PRICING } from '../pricing';

// Mock PostgresSaver to avoid live DB connection during graph runnable compilation test
vi.mock('@langchain/langgraph-checkpoint-postgres', () => {
  function PostgresSaverMock() {
    return {
      setup: vi.fn().mockResolvedValue(undefined),
      getTuple: vi.fn().mockResolvedValue(undefined),
      put: vi.fn().mockResolvedValue(undefined),
      putWrites: vi.fn().mockResolvedValue(undefined),
      list: vi.fn().mockReturnValue((async function* () {})()),
    };
  }
  return { PostgresSaver: PostgresSaverMock };
});

// Mock pg module
vi.mock('pg', () => {
  function PoolMock() {
    return {
      query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
      connect: vi.fn().mockResolvedValue({ query: vi.fn(), release: vi.fn() }),
    };
  }
  return {
    default: { Pool: PoolMock },
    Pool: PoolMock,
  };
});

// Mock ChatGroq to avoid network calls during graph instantiation testing
vi.mock('@langchain/groq', () => {
  function ChatGroqMock(config: Record<string, unknown>) {
    return {
      ...config,
      _provider: 'groq',
      bindTools: vi.fn().mockReturnThis(),
      invoke: vi.fn().mockResolvedValue({ content: 'Mocked AI response', tool_calls: [] }),
    };
  }
  return { ChatGroq: ChatGroqMock };
});

// Mock ChatOpenAI to avoid network calls during graph instantiation testing
vi.mock('@langchain/openai', () => {
  function ChatOpenAIMock(config: Record<string, unknown>) {
    return {
      ...config,
      _provider: 'openai',
      bindTools: vi.fn().mockReturnThis(),
      invoke: vi.fn().mockResolvedValue({ content: 'Mocked OpenAI response', tool_calls: [] }),
    };
  }
  return { ChatOpenAI: ChatOpenAIMock };
});

// Mock executeHybridSearch
vi.mock('../../db/hybrid-search', () => {
  return {
    executeHybridSearch: vi.fn().mockResolvedValue([
      {
        content: 'Test Document Content',
        metadata: { id: 'doc-1', title: 'Test Document', uri: 'http://example.com/doc-1' },
      },
    ]),
  };
});

describe('Agent Graph Initialization & Multi-Model Routing', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should compile and return a valid StateGraph runnable instance with default model', async () => {
    const graph = await createAgentGraph();
    expect(graph).toBeDefined();
    expect(typeof graph.invoke).toBe('function');
    expect(typeof graph.streamEvents).toBe('function');
  });

  it('should compile graph for gpt-4o when OPENAI_API_KEY is present', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';
    const graph = await createAgentGraph({ modelId: 'gpt-4o' });
    expect(graph).toBeDefined();
    expect(typeof graph.invoke).toBe('function');
  });

  it('should gracefully fallback gpt-4o to Groq when OPENAI_API_KEY is missing', async () => {
    delete process.env.OPENAI_API_KEY;
    process.env.GROQ_API_KEY = 'test-groq-key';

    const resolution = resolveModel('gpt-4o');
    expect(resolution.resolvedModelId).toBe('groq-llama-3.3-70b');
    expect(resolution.provider).toBe('groq');
  });

  it('should compile graph for claude-3-5-sonnet when ANTHROPIC_API_KEY is present', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
    const resolution = resolveModel('claude-3-5-sonnet');
    expect(resolution.resolvedModelId).toBe('claude-3-5-sonnet');
    expect(resolution.provider).toBe('anthropic');
  });

  it('should gracefully fallback claude-3-5-sonnet to Groq when ANTHROPIC_API_KEY is missing', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    process.env.GROQ_API_KEY = 'test-groq-key';

    const resolution = resolveModel('claude-3-5-sonnet');
    expect(resolution.resolvedModelId).toBe('groq-llama-3.3-70b');
    expect(resolution.provider).toBe('groq');
  });

  it('should compile graph for deepseek-r1 with DEEPSEEK_API_KEY', async () => {
    process.env.DEEPSEEK_API_KEY = 'test-deepseek-key';
    const resolution = resolveModel('deepseek-r1');
    expect(resolution.resolvedModelId).toBe('deepseek-r1');
    expect(resolution.provider).toBe('deepseek');
  });

  it('should fallback deepseek-r1 to Groq when DEEPSEEK_API_KEY is missing and GROQ_API_KEY is present', async () => {
    delete process.env.DEEPSEEK_API_KEY;
    process.env.GROQ_API_KEY = 'test-groq-key';

    const resolution = resolveModel('deepseek-r1');
    expect(resolution.resolvedModelId).toBe('deepseek-r1');
    expect(resolution.provider).toBe('groq');
  });

  it('should never crash when all API keys are missing', async () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.GROQ_API_KEY;

    const graph = await createAgentGraph({ modelId: 'groq-llama-3.3-70b' });
    expect(graph).toBeDefined();
  });
});

describe('Pricing Table & Token Telemetry Estimations', () => {
  it('should correctly estimate token counts for given text strings', () => {
    expect(estimateTokenCount('')).toBe(0);
    expect(estimateTokenCount('    ')).toBe(0);
    expect(estimateTokenCount('Hello world')).toBe(3);
    expect(estimateTokenCount('a'.repeat(400))).toBe(100);
  });

  it('should correctly estimate costs for groq-llama-3.3-70b', () => {
    const cost = estimateTokenCost('groq-llama-3.3-70b', 1_000_000, 1_000_000);
    expect(cost.promptCost).toBe(0.59);
    expect(cost.completionCost).toBe(0.79);
    expect(cost.totalCost).toBe(1.38);
  });

  it('should correctly estimate costs for gpt-4o', () => {
    const cost = estimateTokenCost('gpt-4o', 1_000_000, 1_000_000);
    expect(cost.promptCost).toBe(2.50);
    expect(cost.completionCost).toBe(10.00);
    expect(cost.totalCost).toBe(12.50);
  });

  it('should correctly estimate costs for claude-3-5-sonnet', () => {
    const cost = estimateTokenCost('claude-3-5-sonnet', 1_000_000, 1_000_000);
    expect(cost.promptCost).toBe(3.00);
    expect(cost.completionCost).toBe(15.00);
    expect(cost.totalCost).toBe(18.00);
  });

  it('should correctly estimate costs for deepseek-r1', () => {
    const cost = estimateTokenCost('deepseek-r1', 1_000_000, 1_000_000);
    expect(cost.promptCost).toBe(0.55);
    expect(cost.completionCost).toBe(2.19);
    expect(cost.totalCost).toBe(2.74);
  });

  it('should include all required model pricing configurations in MODEL_PRICING', () => {
    expect(MODEL_PRICING['groq-llama-3.3-70b']).toBeDefined();
    expect(MODEL_PRICING['gpt-4o']).toBeDefined();
    expect(MODEL_PRICING['claude-3-5-sonnet']).toBeDefined();
    expect(MODEL_PRICING['deepseek-r1']).toBeDefined();
  });
});
