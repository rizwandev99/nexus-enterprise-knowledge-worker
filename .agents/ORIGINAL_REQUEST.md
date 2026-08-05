# Original User Request

## Initial Request — 2026-08-05T09:52:43Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview

Make the Nexus-Enterprise Knowledge Worker app fully live with zero local dependencies. Interviewers should be able to open the deployed URL and test all features (including the MCP server tools and database) without running anything locally.

Working directory: c:\Users\rizwan\Desktop\code\nexus-enterprise-knowledge-worker
Integrity mode: development

## Requirements

### R1. Migrate MCP Tools to Native LangChain Tools
Refactor the application to eliminate the `MultiServerMCPClient` stdio dependency (which spawns a local child process that isn't viable for Vercel). Port all the database/API tools currently in `src/mcp-server/server.ts` into native LangChain tools (using `@tool` or `DynamicStructuredTool`) directly within the Next.js API route / graph logic.

### R2. Delete the MCP Server
After successfully porting the tools, update the graph in `src/lib/agent/graph.ts` to use these native tools and completely delete the `src/mcp-server` directory as it is no longer needed.

### R3. Maintain All Existing Functionality
The application must continue to execute database searches, SQL mutations, and Human-in-the-Loop workflows identically to how it worked with MCP, just using native LangChain tools instead.

## Acceptance Criteria

### Deployment Readiness
- [ ] The `src/mcp-server` directory is deleted.
- [ ] The application no longer imports or uses `@langchain/mcp-adapters` or `@modelcontextprotocol/sdk` to spawn stdio child processes.
- [ ] `npm run build` completes successfully.

### Tool Functionality
- [ ] Native LangChain tools are successfully provided to the `ChatGroq` model in `src/lib/agent/graph.ts`.
- [ ] The graph can successfully execute the tools (like SQL mutations) directly without process spawn errors.
