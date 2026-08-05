# Analysis Report — MCP Stdio Dependency Purge Survey

## Executive Summary
This analysis details all packages, source files, test suites, and documentation references associated with `@modelcontextprotocol/sdk`, `@langchain/mcp-adapters`, `MultiServerMCPClient`, and `src/mcp-server`. It provides an exhaustive file-by-file purge map to transition the application to 100% in-process native LangChain tools, enabling seamless serverless deployment on Vercel with zero local child process dependencies.

---

## 1. Dependency Inventory (`package.json`)

| Package Name | Type | Current Version | Status | Action Required |
|---|---|---|---|---|
| `@modelcontextprotocol/sdk` | `dependencies` | `^1.30.0` | Active | Remove line 29 from `package.json` |
| `@langchain/mcp-adapters` | `dependencies` | `^1.1.3` | Active | Remove line 27 from `package.json` |

### Package Lock Impact
- `package-lock.json` contains references to `@modelcontextprotocol/sdk` and `@langchain/mcp-adapters`.
- Running `npm install` after removing lines from `package.json` will update `package-lock.json` cleanly.

---

## 2. File Purge & Deletion Map

### A. Files to DELETE

1. **`src/mcp-server/server.ts`** (121 lines)
   - **Description**: Standalone MCP server using `@modelcontextprotocol/sdk/server/index.js` and `StdioServerTransport`.
   - **Reason**: Spawns a Node.js process via `stdio` communicating over JSON-RPC. Replaced by native LangChain tool definitions.
2. **`src/mcp-server/__tests__/server.test.ts`** (37 lines)
   - **Description**: Vitest suite targeting `server.request` with `CallToolRequestSchema`.
   - **Reason**: Tests the deleted MCP server. Replaced by unit tests targeting native LangChain tools.
3. **`src/mcp-server/` Directory**
   - **Reason**: Complete directory purge as required by Acceptance Criteria R2.

---

### B. Files to MODIFY

1. **`package.json`**
   - **Location**: `c:\Users\rizwan\Desktop\code\nexus-enterprise-knowledge-worker\package.json`
   - **Changes**: Remove `"@langchain/mcp-adapters": "^1.1.3"` and `"@modelcontextprotocol/sdk": "^1.30.0"`.

2. **`src/lib/agent/graph.ts`**
   - **Location**: `c:\Users\rizwan\Desktop\code\nexus-enterprise-knowledge-worker\src\lib\agent\graph.ts`
   - **Specific Lines & Modifications**:
     - Line 16: Delete `import { MultiServerMCPClient } from "@langchain/mcp-adapters";`.
     - Lines 37–42: Remove or refactor `withTimeout` helper function if child process timeout is no longer needed.
     - Lines 48–78: Remove `MultiServerMCPClient` initialization block (`new MultiServerMCPClient({ mcpServers: { enterprise: { transport: "stdio", command: "npx", args: ["tsx", "src/mcp-server/server.ts"] } } })`).
     - Line 86: Replace `bindTools(mcpTools)` with `bindTools(nativeTools)` importing in-process native LangChain tools (e.g. from `src/lib/agent/tools.ts`).
     - Line 202: Update `toolExecutionNode` to look up tools in native tools registry rather than `mcpTools`.

3. **`AGENTS.md`**
   - **Location**: `c:\Users\rizwan\Desktop\code\nexus-enterprise-knowledge-worker\AGENTS.md`
   - **Changes**: Update architectural descriptions, folder hierarchy (remove `src/mcp-server/`), and testing commands (`npx tsx src/mcp-server/server.ts`).

---

## 3. Codebase Grep Survey Results

### Search Patterns & Match Counts

| Search Pattern | Scope | Total Match Count | Key Locations |
|---|---|---|---|
| `@modelcontextprotocol/sdk` | Repository | 31 matches | `package.json`, `package-lock.json`, `src/mcp-server/server.ts`, `src/mcp-server/__tests__/server.test.ts`, `prd.md`, `AGENTS.md` |
| `@langchain/mcp-adapters` | Repository | 15 matches | `package.json`, `package-lock.json`, `src/lib/agent/graph.ts`, `prd.md`, `AGENTS.md` |
| `MultiServerMCPClient` | Repository | 15 matches | `src/lib/agent/graph.ts`, `prd.md`, `AGENTS.md` |
| `mcp-server` | `src/` directory | 2 files / 3 matches | `src/lib/agent/graph.ts` (args), `src/mcp-server/server.ts`, `src/mcp-server/__tests__/server.test.ts` |
| `stdio` | `src/` directory | 2 matches | `src/lib/agent/graph.ts:57`, `src/mcp-server/server.ts:121` |

---

## 4. Verification & Build Assessment

- **Current Build Command**: `npm run build` (`next build`).
- **Verified Build Status**: `npm run build` executed and completed successfully with exit code 0 (`✓ Compiled successfully`, `Finished TypeScript`, generated static and dynamic routes: `/`, `/_not-found`, `/api/chat`, `/api/test`, `/api/test_stream`).
- **Child Process Bottleneck**: In the current implementation, `createAgentGraph()` in `src/lib/agent/graph.ts` attempts to spawn `npx tsx src/mcp-server/server.ts` during runtime HTTP requests. On Vercel, this fails with ENOENT or timeout because child process execution over stdio is incompatible with serverless environments.
- **Post-Purge Verification**: Once native tools replace `MultiServerMCPClient` and `src/mcp-server` is deleted, `npm run build` will compile all graph and tool logic into standard Next.js serverless route bundles without any child process overhead.
