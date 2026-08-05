# Dispatch — Explorer Survey 2

**Context**: Surveying agent graph tool integration and HITL interrupt logic in `src/lib/agent/graph.ts`.
**Working Directory**: `c:\Users\rizwan\Desktop\code\nexus-enterprise-knowledge-worker\.agents\teamwork_preview_explorer_survey_2`
**Mandatory Input**: Read `c:\Users\rizwan\Desktop\code\nexus-enterprise-knowledge-worker\.agents\ORIGINAL_REQUEST.md`.

**Task**:
1. Examine `src/lib/agent/graph.ts`, `src/lib/agent/state.ts`, `src/app/api/chat/route.ts`, and any client/server orchestration files.
2. Trace how MCP tools are currently fetched via `MultiServerMCPClient` / `@langchain/mcp-adapters` and bound to `ChatGroq`.
3. Analyze how native LangChain tools should be imported, bound to `ChatGroq`, and executed within `graph.ts` or `ToolNode`.
4. Check how Human-in-the-Loop (HITL) interrupts (e.g. for SQL mutations or dangerous tools) work in the existing graph and ensure native tools preserve exact interrupt behavior.
5. Write your detailed analysis to `c:\Users\rizwan\Desktop\code\nexus-enterprise-knowledge-worker\.agents\teamwork_preview_explorer_survey_2\analysis.md` and produce `c:\Users\rizwan\Desktop\code\nexus-enterprise-knowledge-worker\.agents\teamwork_preview_explorer_survey_2\handoff.md`.

## 2026-08-05T09:54:04Z
Execute survey assignment in c:\Users\rizwan\Desktop\code\nexus-enterprise-knowledge-worker\.agents\teamwork_preview_explorer_survey_2\DISPATCH.md. Read ORIGINAL_REQUEST.md at c:\Users\rizwan\Desktop\code\nexus-enterprise-knowledge-worker\.agents\ORIGINAL_REQUEST.md. Save outputs to c:\Users\rizwan\Desktop\code\nexus-enterprise-knowledge-worker\.agents\teamwork_preview_explorer_survey_2\analysis.md and handoff.md.
