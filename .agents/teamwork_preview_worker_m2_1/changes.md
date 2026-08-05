# Milestone 2 Implementation Changes — Codebase Purge & Dependency Removal

## Summary of Changes
Milestone 2 cleanly removes all legacy MCP server infrastructure, purges obsolete packages from `package.json`, implements unit tests for in-process native LangChain tools, updates Next.js instrumentation tests, and synchronizes `AGENTS.md` project memory.

---

## 1. Directory and File Deletions
- **Deleted `src/mcp-server/`**: Removed standalone stdio MCP server implementation (`src/mcp-server/server.ts`) and its unit test suite (`src/mcp-server/__tests__/server.test.ts`).

---

## 2. Dependency Cleanup (`package.json`)
- Removed `"@langchain/mcp-adapters"` (`^1.1.3`) and `"@modelcontextprotocol/sdk"` (`^1.30.0`) from `dependencies`.

---

## 3. Unit Test Suite Creation (`src/lib/agent/__tests__/tools.test.ts`)
Created Vitest unit test suite covering native tools in `src/lib/agent/tools.ts`:
- `addDocumentTool`: Validates metadata (name, description) and invocation creating a document using mocked PrismaClient.
- `executeSqlMutationTool`: Validates metadata (name, description) and invocation executing SQL queries using mocked `pg.Pool`.
- `nativeTools`: Validates exported array contains both tools.

---

## 4. Test Harness Hardening (`src/__tests__/instrumentation.test.ts`)
- Updated `@vercel/otel` mock to export `OTLPHttpProtoTraceExporter` constructor function to prevent runtime undefined errors during `vitest` execution.

---

## 5. Documentation Update (`AGENTS.md`)
- Updated **Core Architectural Features** to highlight In-Process Agent Tools (`add_document`, `execute_sql_mutation`).
- Updated **Tech Stack** to feature native `@langchain/core/tools`.
- Updated **Target Directory Structure** to remove `/src/lib/mcp/` and `/src/mcp-server/`.
- Updated **Execution & Testing Commands** to reference `npx vitest run`.
