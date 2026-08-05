# Dispatch — Worker M2 (Codebase Purge & Dependency Removal)

**Context**: Implementing Milestone 2 of project specification.
**Working Directory**: `c:\Users\rizwan\Desktop\code\nexus-enterprise-knowledge-worker\.agents\teamwork_preview_worker_m2_1`
**Mandatory Inputs**:
- Read `c:\Users\rizwan\Desktop\code\nexus-enterprise-knowledge-worker\.agents\ORIGINAL_REQUEST.md`.
- Read `c:\Users\rizwan\Desktop\code\nexus-enterprise-knowledge-worker\PROJECT.md`.
- Read Explorer M2 analysis: `c:\Users\rizwan\Desktop\code\nexus-enterprise-knowledge-worker\.agents\teamwork_preview_explorer_m2_1\analysis.md`.

**MANDATORY INTEGRITY WARNING**:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

**Task**:
1. Delete the `src/mcp-server/` directory and all its contents (`src/mcp-server/server.ts` and `src/mcp-server/__tests__/server.test.ts`).
2. Modify `package.json` to remove `"@langchain/mcp-adapters"` and `"@modelcontextprotocol/sdk"`.
3. Create `src/lib/agent/__tests__/tools.test.ts` with unit tests for native tools using Vitest, following the exact code specification in Explorer M2 analysis (`analysis.md`).
4. Update `AGENTS.md` to reflect native tool architecture, updated directory layout, and commands.
5. Verify changes by executing `npm run build` and `npx vitest run` in Git Bash.
6.

## 2026-08-05T10:11:24Z
Execute Worker M2 assignment in c:\Users\rizwan\Desktop\code\nexus-enterprise-knowledge-worker\.agents\teamwork_preview_worker_m2_1\DISPATCH.md. Read ORIGINAL_REQUEST.md at c:\Users\rizwan\Desktop\code\nexus-enterprise-knowledge-worker\.agents\ORIGINAL_REQUEST.md, PROJECT.md at c:\Users\rizwan\Desktop\code\nexus-enterprise-knowledge-worker\PROJECT.md, and Explorer analysis at c:\Users\rizwan\Desktop\code\nexus-enterprise-knowledge-worker\.agents\teamwork_preview_explorer_m2_1\analysis.md. Save outputs to c:\Users\rizwan\Desktop\code\nexus-enterprise-knowledge-worker\.agents\teamwork_preview_worker_m2_1\changes.md and handoff.md.
