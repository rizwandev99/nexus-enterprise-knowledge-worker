# Dispatch — Explorer M1 (Native Tool & Graph Integration Plan)

**Context**: Planning implementation details for Milestone 1: Porting MCP tools to native LangChain tools and updating `src/lib/agent/graph.ts`.
**Working Directory**: `c:\Users\rizwan\Desktop\code\nexus-enterprise-knowledge-worker\.agents\teamwork_preview_explorer_m1_1`
**Mandatory Inputs**:
- Read `c:\Users\rizwan\Desktop\code\nexus-enterprise-knowledge-worker\.agents\ORIGINAL_REQUEST.md`.
- Read `c:\Users\rizwan\Desktop\code\nexus-enterprise-knowledge-worker\PROJECT.md`.

**Task**:
1. Inspect `src/mcp-server/server.ts` for exact DB queries (Prisma and `pg.Pool`).
2. Inspect `src/lib/agent/graph.ts` for exact tool binding, `approvalNode` HITL check, and `toolExecutionNode` error formatting.
3. Provide the full, exact TypeScript code specification for:
   - `src/lib/agent/tools.ts`: exporting `addDocumentTool`, `executeSqlMutationTool`, and `nativeTools` using `tool()` from `@langchain/core/tools` and Zod.
   - `src/lib/agent/graph.ts`: refactored without `MultiServerMCPClient`, using `nativeTools`.
4. Confirm how `approvalNode` and `toolExecutionNode` preserve 100% HITL interrupt and graph self-correction behavior.
5. Save your report to `c:\Users\rizwan\Desktop\code\nexus-enterprise-knowledge-worker\.agents\teamwork_preview_explorer_m1_1\analysis.md` and handoff report `handoff.md`.
