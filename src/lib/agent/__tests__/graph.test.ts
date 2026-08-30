import { describe, it, expect, vi } from 'vitest';
import { MemorySaver } from '@langchain/langgraph';
import { createAgentGraph } from '../graph';

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
  function ChatGroqMock() {
    return {
      bindTools: vi.fn().mockReturnThis(),
      invoke: vi.fn().mockResolvedValue({ content: 'Mocked AI response', tool_calls: [] }),
    };
  }
  return { ChatGroq: ChatGroqMock };
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

describe('Agent Graph Initialization & Structure', () => {
  it('should compile and return a valid StateGraph runnable instance', async () => {
    const graph = await createAgentGraph();
    expect(graph).toBeDefined();
    expect(typeof graph.invoke).toBe('function');
    expect(typeof graph.streamEvents).toBe('function');
  });
});

