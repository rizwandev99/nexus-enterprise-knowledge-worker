# BRIEFING — 2026-08-05T15:27:00Z

## Mission
Analyze codebase and produce full, exact TypeScript specifications for porting MCP tools to native LangChain tools (`src/lib/agent/tools.ts`) and refactoring `src/lib/agent/graph.ts` for Milestone 1.

## 🔒 My Identity
- Archetype: Explorer
- Roles: Read-only investigator & technical spec synthesizer
- Working directory: c:\Users\rizwan\Desktop\code\nexus-enterprise-knowledge-worker\.agents\teamwork_preview_explorer_m1_1
- Original parent: 18e2b425-90db-4f8d-a017-73ae356b2958
- Milestone: M1 (Native Tool & Graph Integration Plan)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement code fixes directly in `src/`.
- Must preserve 100% HITL interrupt behavior in `approvalNode` for `execute_sql_mutation`.
- Must preserve cyclic self-correction error formatting (`RUNTIME EXCEPTION: ...`) in `toolExecutionNode`.

## Current Parent
- Conversation ID: 18e2b425-90db-4f8d-a017-73ae356b2958
- Updated: 2026-08-05T15:27:00Z

## Investigation State
- **Explored paths**:
  - `src/mcp-server/server.ts`
  - `src/lib/agent/graph.ts`
  - `src/lib/agent/state.ts`
  - `src/lib/db/hybrid-search.ts`
  - `src/app/api/chat/route.ts`
  - `package.json`
  - `PROJECT.md`
  - `ORIGINAL_REQUEST.md`
- **Key findings**:
  - `src/mcp-server/server.ts` uses Prisma v7 (`PrismaClient` with `@prisma/adapter-pg` and `pg.Pool`) for `add_document` and direct `pool.query()` for `execute_sql_mutation`.
  - Native tools can be implemented in `src/lib/agent/tools.ts` using `tool()` from `@langchain/core/tools` with Zod schemas matching `server.ts` schemas (`add_document` and `execute_sql_mutation`).
  - `src/lib/agent/graph.ts` currently spawns stdio subprocess `npx tsx src/mcp-server/server.ts` inside `createAgentGraph()` via `MultiServerMCPClient`. Removing MCP eliminates stdio subprocess overhead, timeouts, and Vercel edge/serverless compatibility issues.
  - `approvalNode` checks `tc.name.includes("execute_sql_mutation")` and calls `interrupt({ type: "HUMAN_APPROVAL_REQUEST", toolCall: sensitiveCall })`. Native tool names match (`"execute_sql_mutation"`), preserving 100% compatibility with `route.ts` and `page.tsx`.
  - `toolExecutionNode` calls `targetTool.invoke(call.args)` on `nativeTools`. If execution throws, it formats content as `RUNTIME EXCEPTION: ${err.message}` with `isError: true`, preserving cyclic self-correction in graph conditional edges.
- **Unexplored areas**: None for M1 scope.

## Key Decisions Made
- `src/lib/agent/tools.ts` will export shared `pool` and `prisma` client instances or initialize adapter setup matching `server.ts` / `hybrid-search.ts`.
- `addDocumentTool` (`"add_document"`) will create document via Prisma (`prisma.document.create`).
- `executeSqlMutationTool` (`"execute_sql_mutation"`) will execute raw SQL via `pool.query(sqlString)`.
- `nativeTools` array will export `[addDocumentTool, executeSqlMutationTool]`.
- `src/lib/agent/graph.ts` will import `nativeTools` directly from `./tools`, removing `MultiServerMCPClient`, `StdioServerTransport`, and stdio timeout fallback code.

## Artifact Index
- `analysis.md` — Detailed analysis and exact TypeScript code specifications for `tools.ts` and `graph.ts`.
- `handoff.md` — Structured 5-component handoff report for M1 implementer.
