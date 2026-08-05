# MCP Tool Conversion & Native LangChain Tools Survey Analysis

**Date**: 2026-08-05  
**Author**: Explorer Agent (`teamwork_preview_explorer_survey_1`)  
**Target Repository**: `nexus-enterprise-knowledge-worker`  
**Objective**: Catalog all MCP tools, analyze their implementations, and design a native LangChain tool migration strategy to replace the stdio MCP client (`MultiServerMCPClient`) with serverless-friendly native LangChain tools (`@tool` or `DynamicStructuredTool`).

---

## Executive Summary

The current application relies on `@langchain/mcp-adapters` (`MultiServerMCPClient`) to launch a local Node.js child process (`npx tsx src/mcp-server/server.ts`) via `stdio` transport inside `src/lib/agent/graph.ts`. 

Spawning stdio child processes is incompatible with serverless environments like Vercel Edge/Serverless functions. To prepare the project for full cloud deployment without local dependencies, all MCP tools must be refactored into native LangChain tools directly imported into `src/lib/agent/graph.ts`.

---

## 1. Current MCP Server & Tool Inventory

### File Location
- `src/mcp-server/server.ts` (125 lines)
- Dependencies: `@modelcontextprotocol/sdk`, `@prisma/adapter-pg`, `@prisma/client`, `pg`, `dotenv`

### Catalog of Registered MCP Tools

| Tool Name | Description | Inputs (Zod / JSON Schema) | Internal Operations & Behavior |
|-----------|-------------|----------------------------|--------------------------------|
| `add_document` | Add a new document to the enterprise knowledge base | `title: string` (required)<br>`content: string` (required) | Calls `prisma.document.create({ data: { title, content } })`. Returns text: `Successfully added document with ID: ${doc.id}`. |
| `execute_sql_mutation` | Execute a direct SQL mutation on the database (DANGEROUS) | `query: string` (required, description: "The SQL query to execute") | Executes `pool.query(sqlString)` directly against `pg.Pool` (bypassing Prisma adapter raw query limitations). Returns success text or returns `{ content: [...], isError: true }` on error. |

---

## 2. Analysis of MCP Integration in Agent Workflow

### Current Flow in `src/lib/agent/graph.ts`
1. **Tool Discovery & Process Spawning** (Lines 53–77):
   `createAgentGraph()` instantiates `MultiServerMCPClient` configured with stdio command `npx tsx src/mcp-server/server.ts`. It waits up to 8000ms using `withTimeout()` for the stdio process to report tools.
2. **Model Binding** (Line 86):
   `new ChatGroq(...).bindTools(mcpTools)` binds the MCP tools to the Llama 3.3 model.
3. **Human-in-the-Loop (HITL) Gate** (Lines 156–189):
   `approvalNode` inspects `state.messages` for tool calls matching `"execute_sql_mutation"`. If unapproved (`!state.isApproved`), it calls `interrupt()` to trigger approval UI modal.
4. **Tool Execution Node** (Lines 191–227):
   `toolExecutionNode` finds the target tool in `mcpTools` by matching `call.name`, executes `await targetTool.invoke(call.args)`, and catches any thrown exception into a `RUNTIME EXCEPTION: ${err.message}` tool response.
5. **Self-Correction Edge** (Lines 258–270):
   If `toolExecutionNode` returns `RUNTIME EXCEPTION`, the conditional edge routes back to `reasoningNode` to allow the LLM to fix the query (up to 3 retries).

---

## 3. Database Connection Architecture

Currently, database connection logic is duplicated across:
1. `src/mcp-server/server.ts` (lines 12–16)
2. `src/lib/db/hybrid-search.ts` (lines 5–9)

Both instantiate separate `pg.Pool`, `PrismaPg` adapter, and `PrismaClient` instances:
```typescript
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgrespassword@localhost:5432/nexus?schema=public",
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
```

### Recommendation for Refactoring
To avoid redundant connection pools and potential resource leaks in Next.js API routes, create a unified DB client file at `src/lib/db/client.ts` that exports `prisma` and `pool`. Both native tools and `hybrid-search.ts` can import from `src/lib/db/client.ts`.

---

## 4. Proposed Native LangChain Tools Implementation

We recommend creating `src/lib/agent/tools.ts` using the native `tool` helper from `@langchain/core/tools` and `zod`:

```typescript
// src/lib/agent/tools.ts
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { prisma, pool } from "@/lib/db/client";

/**
 * Native LangChain Tool: add_document
 */
export const addDocumentTool = tool(
  async ({ title, content }) => {
    const doc = await prisma.document.create({
      data: {
        title,
        content,
      },
    });
    return `Successfully added document with ID: ${doc.id}`;
  },
  {
    name: "add_document",
    description: "Add a new document to the enterprise knowledge base",
    schema: z.object({
      title: z.string().describe("The title of the document"),
      content: z.string().describe("The content of the document"),
    }),
  }
);

/**
 * Native LangChain Tool: execute_sql_mutation
 */
export const executeSqlMutationTool = tool(
  async ({ query }) => {
    const sqlString = typeof query === "string" ? query : String(query);
    // Execute directly against the underlying pg pool to bypass PrismaPg raw query bugs
    await pool.query(sqlString);
    return `Successfully executed mutation: ${query}`;
  },
  {
    name: "execute_sql_mutation",
    description: "Execute a direct SQL mutation on the database (DANGEROUS)",
    schema: z.object({
      query: z.string().describe("The SQL query to execute"),
    }),
  }
);

export const nativeTools = [addDocumentTool, executeSqlMutationTool];
```

---

## 5. Architectural Impact & Necessary Codebase Changes

### 1. `src/lib/agent/graph.ts`
- **Remove**:
  - `import { MultiServerMCPClient } from "@langchain/mcp-adapters";`
  - `withTimeout` helper (lines 37–42) if no longer needed.
  - stdio instantiation logic (lines 52–77).
- **Add**:
  - `import { nativeTools } from "./tools";`
- **Update**:
  - Bind tools directly: `.bindTools(nativeTools)`
  - In `toolExecutionNode`: replace `mcpTools.find(...)` with `nativeTools.find(...)`.

### 2. Cleanup & Deletions
- Delete directory `src/mcp-server/` (including `src/mcp-server/server.ts` and `src/mcp-server/__tests__/server.test.ts`).
- Update/remove test scripts targeting `src/mcp-server/server.ts`.
- Remove or leave unused dependencies (`@langchain/mcp-adapters`, `@modelcontextprotocol/sdk`) in `package.json` if desired, or remove them to keep `package.json` lean.

### 3. Preserved Workflow Guarantees
- **Human-in-the-Loop (HITL)**: `approvalNode` checks `tc.name.includes("execute_sql_mutation")`. Since native tool name is `"execute_sql_mutation"`, HITL interrupts continue working without any changes.
- **Self-Correction Edge**: `toolExecutionNode` catches any error thrown during `targetTool.invoke()` and formats `RUNTIME EXCEPTION: ${err.message}`. If `pool.query(sqlString)` throws a PostgreSQL syntax error, the exception is caught, formatted, and routed back to `reasoningNode` for automatic self-correction.

---

## 6. Implementation Step-by-Step Guidance for Implementer

1. **Create DB Singleton** (`src/lib/db/client.ts`):
   Centralize `pg.Pool` and `PrismaPg` / `PrismaClient` initialization.
2. **Create Native Tools** (`src/lib/agent/tools.ts`):
   Implement `addDocumentTool` and `executeSqlMutationTool` using `@langchain/core/tools`.
3. **Refactor Graph Core** (`src/lib/agent/graph.ts`):
   Import `nativeTools` directly, remove stdio process spawning, update tool lookup in `toolExecutionNode`.
4. **Update `src/lib/db/hybrid-search.ts`**:
   Import `prisma` from `@/lib/db/client`.
5. **Delete `src/mcp-server/` Directory**:
   Remove `src/mcp-server/server.ts` and test files.
6. **Verification & Testing**:
   Run `npm run build` and test suite (`vitest`) to ensure zero stdio dependency and clean build.

---

## Conclusion

Porting the MCP tools to native LangChain tools eliminates the 8-second startup delay, removes child process spawning, enables Vercel serverless compatibility, and preserves 100% of existing agent features (RAG, HITL approval, and cyclic self-correction).
