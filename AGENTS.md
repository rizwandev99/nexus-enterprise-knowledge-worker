## Project Overview & State

### Primary Objective
Build an enterprise-grade MVP ("Nexus-Enterprise Knowledge Worker") that integrates advanced AI capabilities, vector databases, and multi-step autonomous workflows. The ultimate goal is to create a high-impact, premium-looking portfolio project that demonstrates senior-level full-stack AI skills to impress interviewers and secure a high-paying remote job.

### Core Architectural Features
- **Hybrid RAG Engine**: PostgreSQL `pgvector` cosine similarity + full-text keyword search (`tsvector`) via Reciprocal Rank Fusion.
- **Stateful Agent Machine**: LangGraph.js directed acyclic/cyclic graph with persistent PostgreSQL state checkpointers.
- **Model Context Protocol (MCP)**: Custom TypeScript MCP server for enterprise database/API actions.
- **Cyclic Self-Correction**: Graph logic that automatically catches and heals from MCP execution exceptions.
- **Human-in-the-Loop (HITL)**: Graph-level interrupt boundaries for dangerous operations (e.g., SQL mutations) awaiting human UI confirmation.
- **Enterprise Telemetry**: OpenTelemetry (OTel) instrumentation for tracing LLM calls and tool executions.

### Tech Stack
- **Framework**: Next.js 15 (App Router, React 19)
- **Client UI**: Vercel AI SDK 6, Tailwind CSS v4, shadcn/ui
- **Agent Orchestration**: LangGraph.js v1.0, `@langchain/core`
- **Database & Vector Store**: PostgreSQL 16+, `pgvector`, Prisma ORM
- **MCP Integration**: `@modelcontextprotocol/sdk`, `@langchain/mcp-adapters`

### Environment
- **OS**: Windows
- **Terminal**: Git Bash (Always provide standard Unix/Linux Bash commands, NEVER PowerShell commands).

### Current Status
- **Phase**: Telemetry Hardening
- **Current Step**: Step 5.2 - Configure OTLP exporters and tracing backend.

### Completed Steps
- [x] Project requirements defined (`prd.md`).
- [x] AI instructions and memory state configured (`AGENTS.md`).
- [x] 1.1: Create `docker-compose.yml` with PostgreSQL `pgvector`.
- [x] 1.2: Initialize Prisma, create `schema.prisma`.
- [x] 1.3: Generate SQL migration for `match_hybrid_chunks` and execute `prisma db push`.
- [x] Step 4.1 - Implement `/src/app/api/chat/route.ts` bridging `streamEvents` to Vercel AI SDK.
- [x] Step 4.2 - Build React 19 Client UI with `useChat`, citations, and approval modals.

### Remaining Steps
- [x] **Step 2: MCP Server Construction**
  - [x] 2.1: Build `src/mcp-server/server.ts` with standard DB/API tools.
  - [x] 2.2: Verify MCP server initialization and stdio transport.
- [x] **Step 3: Orchestration Core**
  - [x] 3.1: Build Agent State interface (`src/lib/agent/state.ts`).
  - [x] 3.2: Build LangGraph workflow (`src/lib/agent/graph.ts`) integrating `MultiServerMCPClient`.
  - [x] 3.3: Implement cyclic self-correction edges and HITL interrupt logic.
- [x] **Step 4: API Route & Next.js Presentation**
  - [x] 4.1: Implement `/src/app/api/chat/route.ts` bridging `streamEvents` to Vercel AI SDK.
  - [x] 4.2: Build React 19 Client UI with `useChat`, citations, and approval modals.
- [ ] **Step 5: Telemetry Hardening**
  - [x] 5.1: Configure `instrumentation.ts` for OpenTelemetry.

---

# Agent Guidelines & Rules

## Strict Versioning & Latest Documentation Protocol
To prevent errors caused by outdated base training data, all agents MUST strictly follow these steps before generating configuration code, installation instructions, or architecture patterns for ANY external library, framework, or API (Prisma, Next.js, Tailwind, LangGraph, etc.):
1. **Always Verify Local Environment:** Use file reading tools to check `package.json` to identify the exact installed version of a library before giving instructions. Never assume a version.
2. **Consult Local Skills First:** Search for and fully read relevant `.agents/skills/` documents (like `prisma-upgrade-v7`, `tailwind-4-docs`) which contain the absolute latest best practices and breaking changes.
3. **Mandatory Context7 MCP Usage:** If a local skill does not exist, you MUST use the Context7 MCP server (`resolve-library-id` followed by `query-docs`) to fetch the current official documentation for that exact version before writing any code. YOU MUST NEVER RELY ON YOUR TRAINING DATA for library syntax or configuration. Web search should only be used as a last resort if Context7 fails.

## Workflow & Collaboration Rules

**CRITICAL OVERRIDE**: The user has explicitly requested to "learn while doing". This means the standard auto-generation workflows (like the Manager Protocol) are suspended. All agents MUST adhere to the following:

1. **Mentorship Model (Senior to Junior Developer)**: The AI MUST act as a **Senior Developer** mentoring the user, who should be treated as a **Junior Developer for whom every single technology, stack, and concept is entirely new**. Do NOT write the code into the project files directly. **Crucially, before giving the user any instructions or code, the AI must provide a beginner-friendly overview.** The structure of the response MUST be exactly as follows:
   - **Step 1: The Overview**: Since it is assumed everything is new to the user, the AI must first introduce the technology or concept, explaining what it is at a high, understandable level.
   - **Step 2: The Context**: The AI must explain the common things related to this technology and provide real-world context on how and why it is used.
   - **Step 3: The Instructions**: Only after providing the overview and context, the AI should give a detailed breakdown of how to do the work, providing step-by-step instructions and code snippets in the chat for the user to execute.
2. **User Execution**: The human user is solely responsible for writing/pasting the code, running terminal commands, and testing the implementation. **EXCEPTION**: If the user explicitly instructs the AI to execute a step (e.g., "do this step yourself"), the AI MUST execute the commands and write the code directly for the user. Otherwise, strictly maintain the full learning mode.
3. **Step-by-Step Validation**: Provide only ONE step at a time. Do not proceed to the next step until the user confirms the current step is completed, tested, and they feel confident about it.
4. **Continuous State & Guidelines Tracking**: The AI must automatically keep this entire `AGENTS.md` document up to date. This includes updating the "Current Status", "Completed Steps", and "Remaining Steps" sections whenever a step is completed, as well as continuously reviewing and updating the overall guidelines, rules, and project context as the project's needs evolve, without the user having to manually ask for updates.

## Design & UI Implementation Protocol

When building, designing, or refactoring user interfaces for this project, all agents MUST strictly follow and reference the following core design resources:

1. **Design System Specification (`DESIGN.md`)**:
   - **Location**: [DESIGN.md](file:///c:/Users/rizwan/Desktop/code/agent/DESIGN.md) (Workspace Root)
   - **Requirement**: Adhere strictly to the design system, color palette, typography scales, layout boundaries, and component aesthetic tokens defined in `DESIGN.md`. Do not invent generic or unverified styles.

2. **Tailwind CSS v4 Documentation (`tailwind-4-docs` skill)**:
   - **Location**: [.agents/skills/tailwind-4-docs/SKILL.md](file:///c:/Users/rizwan/Desktop/code/agent/.agents/skills/tailwind-4-docs/SKILL.md)
   - **Requirement**: Use official Tailwind CSS v4 patterns, configuration, utility classes, and variant conventions documented in the `tailwind-4-docs` skill when styling elements.

3. **Web Design & UX Best Practices (`web-design-guidelines` skill)**:
   - **Location**: [.agents/skills/web-design-guidelines/SKILL.md](file:///c:/Users/rizwan/Desktop/code/agent/.agents/skills/web-design-guidelines/SKILL.md)
   - **Requirement**: Implement high-quality UX patterns, accessibility standards (WCAG compliance), responsive layouts, and visual hierarchy as specified in the `web-design-guidelines` skill.

---

### Mandatory Design Workflow Rules

- **Mandatory Pre-Design Review**: Before building or modifying any UI component or page layout, inspect [DESIGN.md](file:///c:/Users/rizwan/Desktop/code/agent/DESIGN.md) alongside the `tailwind-4-docs` and `web-design-guidelines` skills.
- **Strict Visual & Architectural Alignment**: Ensure every component seamlessly integrates the design tokens from `DESIGN.md`, proper utility classes from Tailwind v4, and modern design principles from the guidelines skill.
- **No Generic Placeholders or Arbitrary Styles**: Maintain premium visual aesthetics and consistency across the entire application without using plain browser defaults or uncoordinated styles.

## Coding Standards & Conventions
- **Language**: Use strict TypeScript for all files.
- **Framework conventions**: Strictly follow Next.js 15 App Router conventions (e.g., Server Components by default, `use client` only when necessary).
- **Database**: All standard database interactions must go through the Prisma ORM. Raw SQL is only permitted for vector-specific migrations.

## Target Directory Structure
Agents must strictly adhere to the following folder hierarchy:
- `/src/app/` - Next.js App Router pages and API routes.
- `/src/components/` - Reusable UI components.
- `/src/lib/agent/` - LangGraph state, nodes, and orchestration logic.
- `/src/lib/mcp/` - MCP client configurations.
- `/src/mcp-server/` - The standalone TypeScript MCP Server.
- `/prisma/` - Database schemas and migrations.

## Execution & Testing Commands
- **Database**: `docker compose up -d`
- **Prisma**: `npx prisma db push` and `npx prisma studio`
- **MCP Server Test**: `npx tsx src/mcp-server/server.ts`
- **Next.js Dev Server**: `npm run dev`

## Definition of Done (DoD) & Version Control
Before moving to the next step, ensure:
1. **No Errors**: No TypeScript, ESLint, or runtime errors exist.
2. **User Verified**: The user has successfully tested the step locally.
3. **Aesthetics**: The UI matches the premium `DESIGN.md` guidelines.
4. **Git Commit**: Instruct the user to commit their progress (e.g., `git add .` and `git commit -m "feat: completed step X"`).

## Rule Modification Protocol
- **Local Modifications Only**: Whenever instructed to add, update, or delete rules, these modifications MUST be done locally in the workspace's `AGENTS.md` file. NEVER modify the global Antigravity IDE rules. All rule updates must be contained within this local project scope.
