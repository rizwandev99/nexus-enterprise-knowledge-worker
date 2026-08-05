# Handoff Report — Explorer Survey 3 (MCP Package & File Purge Mapping)

## 1. Observation
- **Package Dependencies (`package.json`)**:
  - Line 27: `"@langchain/mcp-adapters": "^1.1.3"`
  - Line 29: `"@modelcontextprotocol/sdk": "^1.30.0"`
- **Files to Delete**:
  - `c:\Users\rizwan\Desktop\code\nexus-enterprise-knowledge-worker\src\mcp-server\server.ts` (121 lines)
  - `c:\Users\rizwan\Desktop\code\nexus-enterprise-knowledge-worker\src\mcp-server\__tests__\server.test.ts` (37 lines)
  - Directory: `c:\Users\rizwan\Desktop\code\nexus-enterprise-knowledge-worker\src\mcp-server`
- **Files to Modify**:
  - `src/lib/agent/graph.ts`: Line 16 (`import { MultiServerMCPClient }`), Lines 54–62 (`new MultiServerMCPClient(...)`), Line 86 (`.bindTools(mcpTools)`), Line 202 (`mcpTools.find(...)`).
  - `package.json`: Lines 27 & 29 (Remove MCP dependencies).
  - `AGENTS.md`: Update architectural notes, folder structure, and testing scripts mentioning MCP.
- **Repository Search Findings**:
  - `@modelcontextprotocol/sdk`: 31 occurrences across `package.json`, `package-lock.json`, `src/mcp-server/server.ts`, `src/mcp-server/__tests__/server.test.ts`, `prd.md`, `AGENTS.md`.
  - `@langchain/mcp-adapters`: 15 occurrences across `package.json`, `package-lock.json`, `src/lib/agent/graph.ts`, `prd.md`, `AGENTS.md`.
  - `MultiServerMCPClient`: 15 occurrences across `src/lib/agent/graph.ts`, `prd.md`, `AGENTS.md`.
- **Build & Runtime Verification**:
  - `cmd.exe /c "npm run build"` completed with exit code 0 (`✓ Compiled successfully in 33.1s`, TypeScript check passed in 21.6s, routes generated: `/`, `/_not-found`, `/api/chat`, `/api/test`, `/api/test_stream`).
  - Spawning `npx tsx src/mcp-server/server.ts` via stdio at graph execution time requires `child_process.spawn` and local Node binaries which are unavailable on Vercel Edge/Serverless environments.

---

## 2. Logic Chain
1. **Observation**: `package.json` includes `@modelcontextprotocol/sdk` and `@langchain/mcp-adapters`. `src/lib/agent/graph.ts` instantiates `MultiServerMCPClient` which launches `src/mcp-server/server.ts` via stdio child process spawning (`args: ["tsx", "src/mcp-server/server.ts"]`).
2. **Reasoning Step 1**: Stdio child process spawning is not supported or viable in Vercel Serverless environment.
3. **Reasoning Step 2**: Porting all tools to native in-process LangChain tools allows removing `MultiServerMCPClient`, `@langchain/mcp-adapters`, and `@modelcontextprotocol/sdk` completely.
4. **Reasoning Step 3**: Deleting `src/mcp-server/server.ts` and `src/mcp-server/__tests__/server.test.ts` eliminates all dead MCP server code.
5. **Conclusion**: Eliminating these packages and deleting `src/mcp-server/` cleanses the dependency tree and enables smooth, fast Next.js production builds on Vercel.

---

## 3. Caveats
- `package-lock.json` will require `npm install` after editing `package.json` to lock updated dependencies.
- `prd.md` contains historical documentation referencing MCP. `prd.md` is documentation only and does not impact runtime or build behavior.

---

## 4. Conclusion
The repository has been fully surveyed. Deleting `src/mcp-server/` (and its test file), removing `@langchain/mcp-adapters` and `@modelcontextprotocol/sdk` from `package.json`, and updating `src/lib/agent/graph.ts` to bind in-process native LangChain tools will achieve 100% compliance with R1, R2, and R3 requirements.

---

## 5. Verification Method
- **Command 1**: `grep -rn "@modelcontextprotocol" src/` (Must return 0 results).
- **Command 2**: `grep -rn "@langchain/mcp-adapters" src/` (Must return 0 results).
- **Command 3**: `grep -rn "MultiServerMCPClient" src/` (Must return 0 results).
- **Command 4**: `cmd.exe /c "npm run build"` (Must complete with exit code 0).
