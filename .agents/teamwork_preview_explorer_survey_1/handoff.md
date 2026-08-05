# Handoff Report — Explorer Survey 1

**Agent**: `teamwork_preview_explorer_survey_1`  
**Date**: 2026-08-05  
**Working Directory**: `c:\Users\rizwan\Desktop\code\nexus-enterprise-knowledge-worker\.agents\teamwork_preview_explorer_survey_1`  

---

## 1. Observation

Direct code observations from inspection of the workspace:

1. **MCP Server Implementation** (`src/mcp-server/server.ts`):
   - Lines 2–4: Imports `@modelcontextprotocol/sdk/server/index.js`, `StdioServerTransport`, and request schemas.
   - Lines 31–60: Registers two tools via `ListToolsRequestSchema`:
     - `add_document`: properties `title` (string) and `content` (string).
     - `execute_sql_mutation`: properties `query` (string).
   - Lines 63–115: Handles tool calls via `CallToolRequestSchema`:
     - `add_document` executes `await prisma.document.create({ data: { title, content } })`.
     - `execute_sql_mutation` executes `await pool.query(sqlString)` directly on a `pg.Pool` instance.
   - Lines 118–124: Starts the server using `StdioServerTransport` connected to `process.stdin` / `process.stdout`.

2. **Graph MCP Connection** (`src/lib/agent/graph.ts`):
   - Line 16: `import { MultiServerMCPClient } from "@langchain/mcp-adapters";`
   - Lines 54–62: Spawns stdio child process using command `npx` and args `["tsx", "src/mcp-server/server.ts"]`.
   - Line 67: `mcpTools = await withTimeout(mcpClient.getTools(), 8000, []);`
   - Line 86: `.bindTools(mcpTools)`
   - Line 163: `const sensitiveCall = toolCalls.find((tc: any) => tc.name.includes("execute_sql_mutation"));`
   - Line 202: `const targetTool = mcpTools.find((t) => t.name === call.name);`

3. **Project Dependencies** (`package.json`):
   - Line 24: `"@langchain/core": "^1.2.4"`
   - Line 27: `"@langchain/mcp-adapters": "^1.1.3"`
   - Line 29: `"@modelcontextprotocol/sdk": "^1.30.0"`
   - Line 46: `"zod": "^4.4.3"`

4. **Existing Tests & Utilities**:
   - `src/mcp-server/__tests__/server.test.ts` tests MCP request schema handling for `execute_sql_mutation`.
   - `src/lib/db/hybrid-search.ts` initializes a separate `pg.Pool` and `PrismaPg` adapter instance.

---

## 2. Logic Chain

1. **Observation 1 & 2** show that `createAgentGraph()` relies on `MultiServerMCPClient` spawning `npx tsx src/mcp-server/server.ts` via stdio. Spawning local OS child processes fails in serverless deployment environments (e.g. Vercel Edge/Serverless functions) where long-lived background processes and stdio streams are restricted.
2. **Observation 1 & 3** show that `add_document` and `execute_sql_mutation` have simple TypeScript implementations backed by Prisma and `pg.Pool`, while `@langchain/core` (v1.2.4) and `zod` (v4.4.3) are installed.
3. Therefore, both MCP tools can be rewritten as native LangChain tools using `tool()` from `@langchain/core/tools` with Zod schemas in a new file `src/lib/agent/tools.ts`.
4. **Observation 2** shows that `approvalNode` checks `tc.name.includes("execute_sql_mutation")` and `toolExecutionNode` looks up tool by name (`targetTool.name === call.name`). Using native LangChain tools with identical tool names (`add_document` and `execute_sql_mutation`) ensures that Human-in-the-Loop approval and cyclic self-correction error handling work seamlessly without changing graph node logic.
5. **Observation 1 & 4** show duplicate `pg.Pool` instances in `server.ts` and `hybrid-search.ts`. Consolidating DB client creation into `src/lib/db/client.ts` will optimize database connections for the native tools and search functions.
6. Once native tools are imported directly into `graph.ts`, `MultiServerMCPClient` and `src/mcp-server/` can be safely removed, satisfying all requirements in `ORIGINAL_REQUEST.md`.

---

## 3. Caveats

- **Database Connection Pooling**: Ensure that `src/lib/db/client.ts` reuses a single `pg.Pool` instance across requests during Next.js hot-reloading/dev mode to prevent connection exhaustion.
- **Environment Dependencies**: Native tool execution requires valid `DATABASE_URL` set in environment variables when executing queries against PostgreSQL.

---

## 4. Conclusion

Replacing the stdio MCP server with native LangChain tools (`@tool`) in `src/lib/agent/tools.ts` is completely feasible, preserves 100% of agent functionality (HITL and self-correction), eliminates the 8-second startup delay, and prepares the app for Vercel production deployment. The `src/mcp-server` directory can be deleted once `graph.ts` is updated.

---

## 5. Verification Method

To verify the migration plan:
1. **File Existence & Code Inspection**:
   - Inspect `src/lib/agent/tools.ts` to confirm native tools `addDocumentTool` and `executeSqlMutationTool` are exported with names `add_document` and `execute_sql_mutation`.
   - Inspect `src/lib/agent/graph.ts` to verify `MultiServerMCPClient` import and stdio subprocess spawn code are removed.
2. **Build Verification**:
   - Run `npm run build` in standard terminal to confirm zero TypeScript compilation errors or missing module issues after deleting `src/mcp-server/`.
3. **Unit / Integration Test Verification**:
   - Run `npx vitest run` to verify remaining test suites pass.
