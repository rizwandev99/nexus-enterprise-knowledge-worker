# Dispatch — Worker M1 (Native Tools & Graph Refactoring)

**Context**: Implementing Milestone 1 of project specification.
**Working Directory**: `c:\Users\rizwan\Desktop\code\nexus-enterprise-knowledge-worker\.agents\teamwork_preview_worker_m1_1`
**Mandatory Inputs**:
- Read `c:\Users\rizwan\Desktop\code\nexus-enterprise-knowledge-worker\.agents\ORIGINAL_REQUEST.md`.
- Read `c:\Users\rizwan\Desktop\code\nexus-enterprise-knowledge-worker\PROJECT.md`.
- Read Explorer M1 analysis: `c:\Users\rizwan\Desktop\code\nexus-enterprise-knowledge-worker\.agents\teamwork_preview_explorer_m1_1\analysis.md`.

**MANDATORY INTEGRITY WARNING**:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

**Task**:
1. Create `src/lib/agent/tools.ts`:
   - Define `addDocumentTool` (`"add_document"`) with Zod schema `{ title: z.string(), content: z.string() }` creating Prisma Document record.
   - Define `executeSqlMutationTool` (`"execute_sql_mutation"`) with Zod schema `{ query: z.string() }` executing raw SQL query using `pg.Pool`.
   - Export `nativeTools = [addDocumentTool, executeSqlMutationTool]`.
2. Refactor `src/lib/agent/graph.ts`:
   - Import `nativeTools` from `./tools`.
   - Remove `MultiServerMCPClient` import and stdio subprocess spawn logic.
   - Bind `nativeTools` to `ChatGroq` model.
   - Execute `nativeTools` in `toolExecutionNode`, catching exceptions and emitting `RUNTIME EXCEPTION: ${err.message}`.
   - Maintain `approvalNode` check for `execute_sql_mutation` triggering `interrupt()`.
3. Verify your implementation by running TypeScript check / build: `npm run build` in Git Bash.
4. Output your implementation report to `c:\Users\rizwan\Desktop\code\nexus-enterprise-knowledge-worker\.agents\teamwork_preview_worker_m1_1\changes.md` and produce `handoff.md`.
