# Project: Nexus-Enterprise Knowledge Worker — Native Tool Migration

## Architecture
Refactor the agent tools from a local stdio MCP child process server (`src/mcp-server/server.ts`) to in-process native LangChain tools (`@tool`) in `src/lib/agent/tools.ts`. Update `src/lib/agent/graph.ts` to bind and execute these native tools directly with `ChatGroq`, preserving Human-in-the-Loop (HITL) interrupt boundaries for `execute_sql_mutation` and runtime exception formatting for graph self-correction. Delete `src/mcp-server/` directory and purge all `@modelcontextprotocol/sdk` and `@langchain/mcp-adapters` dependencies.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Native Tools Definition | Implement `add_document` and `execute_sql_mutation` using `@tool` from `@langchain/core/tools` in `src/lib/agent/tools.ts` | M1 | survey |
| 2 | Graph Tool Binding | Update `src/lib/agent/graph.ts` to bind `nativeTools` to `ChatGroq` and execute them directly in `toolExecutionNode` | M1 | survey |
| 3 | Preserve HITL Interrupts | Maintain `approvalNode` interrupt logic for `execute_sql_mutation` with 100% compatibility for `route.ts` and `page.tsx` | M1 | survey |
| 4 | Delete MCP Directory | Delete `src/mcp-server/` directory and remove MCP dependencies from `package.json` | M2 | survey |
| 5 | Native Tool Unit Tests | Add Vitest tests for `tools.ts` in `src/lib/agent/__tests__/tools.test.ts` | M2 | survey |
| 6 | Build & Integrity Verification | Verify `npm run build`, `vitest` pass, perform Forensic Audit, and send victory notice | M3 | survey |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Native Tool Porting & Graph Integration | Implement `src/lib/agent/tools.ts` with native `@tool` functions (`add_document` & `execute_sql_mutation`). Update `src/lib/agent/graph.ts` to remove `MultiServerMCPClient` stdio child process spawning and use native tools in-process, preserving HITL interrupt logic. | none | DONE |
| 2 | M2: Codebase Purge & Dependency Removal | Delete `src/mcp-server/` directory and test suite, update `package.json` to remove `@langchain/mcp-adapters` and `@modelcontextprotocol/sdk`, add `src/lib/agent/__tests__/tools.test.ts`, and update `AGENTS.md`. | M1 | DONE |
| 3 | M3: Verification, E2E Build Audit & Victory Claim | Run build verification (`npm run build`, `npx vitest run`), run Forensic Integrity Audit, and report completion to Sentinel. | M2 | DONE |

## Interface Contracts
### `src/lib/agent/tools.ts` ↔ `src/lib/agent/graph.ts`
- Export `addDocumentTool`: tool name `"add_document"`, Zod schema `{ title: z.string(), content: z.string() }`, creates Prisma Document record.
- Export `executeSqlMutationTool`: tool name `"execute_sql_mutation"`, Zod schema `{ query: z.string() }`, executes SQL query on PostgreSQL via `pg.Pool`.
- Export `nativeTools`: array `[addDocumentTool, executeSqlMutationTool]`.

## Code Layout
- `src/lib/agent/tools.ts`: Native LangChain tools.
- `src/lib/agent/graph.ts`: Agent state graph with native tool binding, HITL interrupt, and cyclic self-correction.
- `src/lib/agent/__tests__/tools.test.ts`: Vitest test suite for native tools.
