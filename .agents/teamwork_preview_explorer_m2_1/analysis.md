# Specification Report: Milestone 2 — Codebase Purge & Native Test Plan

## Executive Summary
This report defines the exact implementation plan for Milestone 2 (M2: Codebase Purge & Dependency Removal) of the Nexus-Enterprise Knowledge Worker project. Following the successful porting of MCP tools to in-process native LangChain tools in Milestone 1 (`src/lib/agent/tools.ts` and `src/lib/agent/graph.ts`), Milestone 2 removes all obsolete MCP infrastructure, cleans up project dependencies, implements comprehensive unit testing for native tools, and updates the project memory (`AGENTS.md`).

---

## 1. Codebase Purge Inventory

### 1.1 Files and Directories to Delete
The standalone MCP server process files are located in `src/mcp-server/`. They are no longer invoked by `src/lib/agent/graph.ts` and must be permanently removed:

| Item | Path | Type | Action |
|---|---|---|---|
| 1 | `src/mcp-server/server.ts` | File | Delete |
| 2 | `src/mcp-server/__tests__/server.test.ts` | File | Delete |
| 3 | `src/mcp-server/__tests__/` | Directory | Remove directory |
| 4 | `src/mcp-server/` | Directory | Remove root folder |

### 1.2 Package Dependencies to Purge
In `package.json`, under the `"dependencies"` block, the following two MCP-related libraries are no longer needed and must be deleted:

- **Line 27**: `"@langchain/mcp-adapters": "^1.1.3",`
- **Line 29**: `"@modelcontextprotocol/sdk": "^1.30.0",`

#### Exact `package.json` Diff:
```diff
   "dependencies": {
     "@anthropic-ai/claude-agent-sdk": "^0.3.221",
     "@langchain/core": "^1.2.4",
     "@langchain/groq": "^1.3.1",
     "@langchain/langgraph": "^1.4.8",
-    "@langchain/mcp-adapters": "^1.1.3",
     "@langchain/openai": "^1.5.5",
-    "@modelcontextprotocol/sdk": "^1.30.0",
     "@opentelemetry/api": "^1.9.1",
```

---

## 2. Unit Test Suite Specification (`src/lib/agent/__tests__/tools.test.ts`)

A new Vitest test suite will be created at `src/lib/agent/__tests__/tools.test.ts` to test `addDocumentTool`, `executeSqlMutationTool`, and `nativeTools` exported from `src/lib/agent/tools.ts`.

### 2.1 Complete Source Code for `src/lib/agent/__tests__/tools.test.ts`
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { addDocumentTool, executeSqlMutationTool, nativeTools } from '../tools';

// Mock pg module before importing or executing tools
vi.mock('pg', () => {
  const queryMock = vi.fn().mockResolvedValue({ rows: [], rowCount: 1 });
  const PoolMock = vi.fn().mockImplementation(() => ({
    query: queryMock,
  }));
  return {
    default: {
      Pool: PoolMock,
    },
    Pool: PoolMock,
  };
});

// Mock PrismaClient module
vi.mock('../../../generated/prisma/client', () => {
  const mockCreate = vi.fn().mockResolvedValue({
    id: 'test-doc-id-123',
    title: 'Test Title',
    content: 'Test Content',
    createdAt: new Date(),
  });
  return {
    PrismaClient: vi.fn().mockImplementation(() => ({
      document: {
        create: mockCreate,
      },
    })),
  };
});

describe('Native Agent Tools (Milestone 2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addDocumentTool', () => {
    it('should have correct name and description metadata', () => {
      expect(addDocumentTool.name).toBe('add_document');
      expect(addDocumentTool.description).toBe('Add a new document to the enterprise knowledge base');
    });

    it('should successfully invoke and add a document', async () => {
      const result = await addDocumentTool.invoke({
        title: 'Test Document Title',
        content: 'Test Document Content',
      });

      expect(result).toContain('Successfully added document with ID: test-doc-id-123');
    });
  });

  describe('executeSqlMutationTool', () => {
    it('should have correct name and description metadata', () => {
      expect(executeSqlMutationTool.name).toBe('execute_sql_mutation');
      expect(executeSqlMutationTool.description).toBe('Execute a direct SQL mutation on the database (DANGEROUS)');
    });

    it('should successfully invoke and execute a SQL mutation', async () => {
      const result = await executeSqlMutationTool.invoke({
        query: 'UPDATE users SET status = "active" WHERE id = 1',
      });

      expect(result).toBe('Successfully executed mutation: UPDATE users SET status = "active" WHERE id = 1');
    });
  });

  describe('nativeTools array', () => {
    it('should export nativeTools array containing both tools', () => {
      expect(nativeTools).toHaveLength(2);
      expect(nativeTools).toContain(addDocumentTool);
      expect(nativeTools).toContain(executeSqlMutationTool);
    });
  });
});
```

---

## 3. `AGENTS.md` Specification Updates

The workspace memory document `AGENTS.md` must be updated to reflect the transition from stdio MCP server tools to native in-process LangChain tools.

### 3.1 Architectural Features Update (Lines 9-10)
**Existing:**
```markdown
- **Model Context Protocol (MCP)**: Custom TypeScript MCP server for enterprise database/API actions.
- **Cyclic Self-Correction**: Graph logic that automatically catches and heals from MCP execution exceptions.
```
**Replacement:**
```markdown
- **In-Process Agent Tools**: Native LangChain `@tool` definitions (`add_document` and `execute_sql_mutation`) running directly in-process.
- **Cyclic Self-Correction**: Graph logic that automatically catches and heals from tool execution exceptions.
```

### 3.2 Tech Stack Update (Line 19)
**Existing:**
```markdown
- **MCP Integration**: `@modelcontextprotocol/sdk`, `@langchain/mcp-adapters`
```
**Replacement:**
```markdown
- **In-Process Tools**: Native `@langchain/core/tools` (`addDocumentTool`, `executeSqlMutationTool`)
```

### 3.3 Target Directory Structure Update (Lines 122-123)
**Existing:**
```markdown
- `/src/lib/mcp/` - MCP client configurations.
- `/src/mcp-server/` - The standalone TypeScript MCP Server.
```
**Replacement:**
```markdown
- `/src/lib/agent/` - LangGraph state, nodes, native `@tool` definitions (`tools.ts`), and orchestration logic.
```

### 3.4 Execution & Testing Commands Update (Line 129)
**Existing:**
```markdown
- **MCP Server Test**: `npx tsx src/mcp-server/server.ts`
```
**Replacement:**
```markdown
- **Unit Tests**: `npx vitest run`
```

---

## 4. Verification & Test Strategy

To verify Milestone 2 completion:
1. `npx vitest run`: Ensures `src/lib/agent/__tests__/tools.test.ts` and `src/__tests__/instrumentation.test.ts` pass without errors.
2. `npm run build`: Ensures Next.js build succeeds with zero TypeScript or import errors following `src/mcp-server/` deletion and dependency removal.
3. Check `package.json`: Confirm neither `@langchain/mcp-adapters` nor `@modelcontextprotocol/sdk` remain.
