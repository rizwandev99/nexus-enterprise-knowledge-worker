## Project Overview & State

### Primary Objective
Build an enterprise-grade MVP ("Nexus-Enterprise Knowledge Worker") that integrates advanced AI capabilities, vector databases, and multi-step autonomous workflows. The ultimate goal is to create a high-impact, premium-looking portfolio project that demonstrates senior-level full-stack AI skills to impress interviewers and secure a high-paying remote job.

### Core Architectural Features
- **Hybrid RAG Engine**: PostgreSQL `pgvector` cosine similarity + full-text keyword search (`tsvector`) via Reciprocal Rank Fusion.
- **Stateful Agent Machine**: LangGraph.js directed acyclic/cyclic graph with persistent PostgreSQL state checkpointers.
- **In-Process Agent Tools**: Native LangChain `@tool` definitions (`add_document` and `execute_sql_mutation`) running directly in-process.
- **Cyclic Self-Correction**: Graph logic that automatically catches and heals from tool execution exceptions.
- **Human-in-the-Loop (HITL)**: Graph-level interrupt boundaries for dangerous operations (e.g., SQL mutations) awaiting human UI confirmation.
- **Enterprise Telemetry**: OpenTelemetry (OTel) instrumentation for tracing LLM calls and tool executions.

### Tech Stack
- **Framework**: Next.js 15 (App Router, React 19)
- **Client UI**: Vercel AI SDK 6, Tailwind CSS v4, shadcn/ui
- **Agent Orchestration**: LangGraph.js v1.0, `@langchain/core`
- **Database & Vector Store**: PostgreSQL 16+, `pgvector`, Prisma ORM
- **In-Process Tools**: Native `@langchain/core/tools` (`addDocumentTool`, `executeSqlMutationTool`)

### Environment
- **OS**: Windows
- **Terminal**: Git Bash (Always provide standard Unix/Linux Bash commands, NEVER PowerShell commands).

### Current Status
- **Phase**: Production Live — Portfolio Grade
- **Current Step**: Step 11 complete. Real document parsing & full text attachment ingestion engine implemented and synced to git.

### Completed Steps
- [x] Project requirements defined (`prd.md`).
- [x] AI instructions and memory state configured (`AGENTS.md`).
- [x] 1.1: Create `docker-compose.yml` with PostgreSQL `pgvector`.
- [x] 1.2: Initialize Prisma, create `schema.prisma`.
- [x] 1.3: Generate SQL migration for `match_hybrid_chunks` and execute `prisma db push`.
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
- [x] **Step 5: Telemetry Hardening**
  - [x] 5.1: Configure `instrumentation.ts` for OpenTelemetry.
  - [x] 5.2: Configure OTLP exporters and tracing backend.
- [x] **Step 6: Production Deployment & E2E Testing**
  - [x] 6.1: Provision cloud database (Prisma Postgres).
  - [x] 6.2: Link and deploy application to Vercel global edge network.
  - [x] 6.3: Perform E2E Live Testing via Playwright to verify UI, DB, and AI tracing integrations.
- [x] **Step 7: Production Stabilization & Bug Fixes**
  - [x] 7.1: Fix `useChat` append deprecation by migrating to `sendMessage` (v4+ API).
  - [x] 7.2: Update message fetching to map DB messages to `UIMessage` payload format with `parts` array to prevent rendering hydration failures.
  - [x] 7.3: Fix HITL graph resumption by ensuring `chatId` is passed in the request body during approval/rejection.
- [x] **Step 8: Portfolio Hardening (Comprehensive Code Quality)**
  - [x] 8.1: Implement real Hybrid RAG in `hybrid-search.ts` — pgvector cosine similarity + PostgreSQL `tsvector` full-text search + Reciprocal Rank Fusion (RRF).
  - [x] 8.2: Replace in-memory `MemorySaver` with `@langchain/langgraph-checkpoint-postgres` for true persistent state across serverless requests.
  - [x] 8.3: Add SQL validation/allowlisting to `execute_sql_mutation` tool (DML-only, blocks DDL and injection patterns).
  - [x] 8.4: Remove all debug/test routes (`/api/debug`, `/api/test`, `/api/test_stream`) and the `seedDummyData` server action.
  - [x] 8.5: Eliminate all `any` types across the entire codebase — backend (graph, tools, route, chat-actions) and frontend (page, sidebar, components).
  - [x] 8.6: Break `page.tsx` god component into 6 focused components: `ChatInput`, `MessageList`, `MessageBubble`, `ApprovalModal`, `Toast`, and a lean `page.tsx`.
  - [x] 8.7: Replace 5-second `setInterval` polling in sidebar with optimistic mutation-driven updates.
  - [x] 8.8: Replace all `window.alert/confirm` with custom `Toast` and inline confirmation UI.
  - [x] 8.9: Apply design system tokens (`bg-primary`, `text-ink`, etc.) consistently across all components.
  - [x] 8.10: Add proper `<form>` semantics, `aria-label` attributes, and `useCallback` memoization to input components.
  - [x] 8.11: Create premium `README.md` with shields.io badges, Mermaid architecture diagram, setup guide.
  - [x] 8.12: Add `.env.example`, MIT `LICENSE`, and GitHub Actions CI workflow.
- [x] **Step 9: Premium UI Redesign (Linear.app-Style Dark Glassmorphism)**
  - [x] 9.1: Full dark design system in `globals.css` — `#0a0a0f` base, `#6366f1` brand, glass surfaces, noise texture overlay, ambient glow layers.
  - [x] 9.2: Redesigned `ChatInput` — auto-resize textarea, focus ring glow, animated loading dots, char counter, keyboard hint.
  - [x] 9.3: Redesigned `MessageBubble` — gradient user bubble, branded AI avatar with glow, tool-invocation cards, fade-up entry animation.
  - [x] 9.4: Redesigned `MessageList` — bento quick-start cards, branded logo mark, gradient welcome heading.
  - [x] 9.5: Redesigned `Sidebar` — glass surface, brand logo, Linear-style active pill indicator, hover icon reveal, rotating `+` icon.
  - [x] 9.6: Redesigned `ApprovalModal` — warning header stripe, dark frosted backdrop, brand gradient approve button, spring animation.
  - [x] 9.7: Redesigned `Toast` — glass card, left accent bar, icon, dismiss button, spring slide-in animation.
  - [x] 9.8: Redesigned `page.tsx` — ambient glow layers, glass header, status streaming pill, message count, sidebar toggle tooltip.
  - [x] 9.9: Zero TypeScript errors confirmed after redesign.
- [x] **Step 10: Inspiration Design Match & Interactive Feature Showcase**
  - [x] 10.1: Fluid glass orb background animation + subtle dark grid overlay (`bg-grid-pattern`).
  - [x] 10.2: Typography hero greeting ("Hey! Enterprise Worker / What can I help with?").
  - [x] 10.3: 4 Feature Bento cards with colorful pill badges showcasing all capabilities (Hybrid RAG, SQL HITL, Self-Correction Graph, OTel Telemetry) — clicking populates prompt automatically.
  - [x] 10.4: Input box redesign matching reference screenshot (top-left ✦ sparkle icon, attach file pill, teal `↑` send button).
  - [x] 10.5: Left vertical icon rail in `sidebar.tsx` with top teal `↗` logo button, nav stack (Home, Chat, History), bottom nodes/settings icons, & session drawer.
  - [x] 10.6: Top-right user profile pill ("User Account ∨").
- [x] **Step 11: Real Document Ingestion Engine & Git Sync**
  - [x] 11.1: Build `/api/parse-document` server API route supporting PDF (via `pdf-parse`), Text, Markdown, CSV, JSON, and source code document parsing.
  - [x] 11.2: Update `ChatInput` with real file parsing, attached file badge, size formatting, and text extraction before message sending.
  - [x] 11.3: Update `MessageBubble` to cleanly format user prompts with attached document metadata pills without UI clutter.
  - [x] 11.4: Enhance `addDocumentTool` in `tools.ts` to insert into both `documents` and `document_chunks` for full RAG & SQL vector search capability.
  - [x] 11.5: Update LangGraph `reasoningNode` system prompt to mandate `add_document` invocation whenever attached document text is present.
  - [x] 11.6: Fix PostgreSQL `invalid byte sequence for encoding "UTF8": 0x00` error by sanitizing null bytes (`\0` / `\u0000`) across `/api/parse-document`, `/api/chat`, `addDocumentTool`, and `saveMessage`.
  - [x] 11.7: Fix PostgreSQL `stack depth limit exceeded` error by isolating RAG search query extraction, capping query string lengths for `plainto_tsquery`, capping extracted document text at 50,000 chars, and preventing recursive `add_document` tool invocation loops in `reasoningNode`.
- [x] **Step 12: 100% Portfolio Completion, Test Suite Hardening & Telemetry Inspector**
  - [x] 12.1: Fortified Vitest unit test suite (14/14 tests passing across tools, graph compilation, document parsing, and telemetry).
  - [x] 12.2: Built One-Click Demo Knowledge Base Seeder (`seedSampleKnowledgeBase` server action + UI button) populating 3 realistic enterprise governance documents.
  - [x] 12.3: Built `TelemetryModal` displaying active LangGraph cyclic state flow, live PostgreSQL metrics, and OpenTelemetry OTLP tracing status.
  - [x] 12.4: Added 1-click message copy, chat export to Markdown (`.md`), and interactive `[Doc-X]` citation pills.
  - [x] 12.5: Created comprehensive, founder-ready `README.md` with system diagrams, ADRs, and technical deep-dives.
- [x] **Step 13: Hybrid Search Multi-Token Keyword Ranking & Auto-Recovery**
  - [x] 13.1: Enhanced `executeHybridSearch` with intelligent token extraction, stop word pruning, and ranked prefix `to_tsquery` matching (`title || ' ' || content`).
  - [x] 13.2: Upgraded fallback logic when vector embeddings are unconfigured to prevent false-negative 0-match results on natural language questions.
  - [x] 13.3: Updated `prisma/seed.ts` and confirmed enterprise governance document persistence.
- [x] **Step 14: High-ROI Interview Navigation Streamlining**
  - [x] 14.1: Streamlined the vertical rail: consolidated 3 duplicate new-chat/home buttons into one crisp `+` New Thread trigger.
  - [x] 14.2: Removed placeholder/dummy buttons (removed static Settings toast button, replaced mock user avatar badge with direct GitHub source link).
  - [x] 14.3: Refined rail to 5 high-signal, high-ROI architectural actions: New Chat (`+`), PostgreSQL Checkpointer History (`📂`), Live LangGraph State & OTel Traces (`⚡`), One-Click Demo KB Seeder (`📦`), and GitHub Repository (`🐙`).

### Remaining Steps
- [ ] (Optional) Record video demo / Loom.

---

# Agent Guidelines & Rules

## Strict Versioning & Latest Documentation Protocol
To prevent errors caused by outdated base training data, all agents MUST strictly follow these steps before generating configuration code, installation instructions, or architecture patterns for ANY external library, framework, or API (Prisma, Next.js, Tailwind, LangGraph, etc.):
1. **Always Verify Local Environment:** Use file reading tools to check `package.json` to identify the exact installed version of a library before giving instructions. Never assume a version.
2. **Consult Local Skills First:** Search for and fully read relevant `.agents/skills/` documents (like `prisma-upgrade-v7`, `tailwind-4-docs`) which contain the absolute latest best practices and breaking changes.
3. **Mandatory Context7 MCP Usage:** If a local skill does not exist, you MUST use the Context7 MCP server (`resolve-library-id` followed by `query-docs`) to fetch the current official documentation for that exact version before writing any code. YOU MUST NEVER RELY ON YOUR TRAINING DATA for library syntax or configuration. Web search should only be used as a last resort if Context7 fails.

## Repository Branch & Clean Workspace Protocol

1. **Dual Branch Strategy (`dev` vs `main`)**:
   - **`dev` Branch**: The default workspace branch for daily active development. All working files, agent logs, prompt instructions, scratch files, test scripts, and dev notes reside on `dev`.
   - **`main` Branch**: The production branch visible to interviewers on GitHub. `main` must remain 100% clean, containing only industry-standard production code, clean comments, structured modular architecture, and formal documentation.
2. **Publishing to `main` Protocol**:
   - **Automatic Sync**: Whenever a feature, fix, or update is finalized and polished on `dev`, the AI MUST automatically commit the changes, switch to the `main` branch, merge the changes, and push to `origin main` to ensure the live Vercel production server is always up to date with the polished version.
   - The AI MUST ensure that all internal AI agent files (`.agents/`, `AGENTS.md`, `skills-lock.json`), temporary test scripts (`scratch/`), and scratch notes are EXCLUDED from the `main` branch so that the interviewer only sees a clean, industry-standard project structure.
3. **Temporary Test Script & Isolation Rules**:
   - **Isolated Folder Creation**: Any temporary test script or utility snippet created during development MUST be placed inside an isolated scratch directory (e.g., `scratch/`). Never place temporary test scripts directly in the repository root.
   - **Auto-Deletion**: All temporary test scripts MUST be deleted immediately after their diagnostic or test execution is complete, keeping the codebase clean.


## Workflow & Collaboration Rules


**YOLO MODE (CURRENTLY ON)**: YOLO Mode is a dynamic toggle controlled by the user (e.g., "turn on yolo mode", "turn off yolo mode"). 
- **When ON:** The standard mentorship workflow is suspended. The AI MUST execute all code changes, file creations, and terminal commands directly without asking the user to copy/paste. The AI should only stop to ask questions upfront if there is design confusion or a strict manual requirement (like authentication).
- **When OFF:** The Mentorship Model below is strictly enforced.

*(Note: The Mentorship Model below is suspended while YOLO Mode is CURRENTLY ON)*

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
- `/src/lib/agent/` - LangGraph state, nodes, native `@tool` definitions (`tools.ts`), and orchestration logic.
- `/prisma/` - Database schemas and migrations.

## Execution & Testing Commands
- **Database**: `docker compose up -d`
- **Prisma**: `npx prisma db push` and `npx prisma studio`
- **Unit Tests**: `npx vitest run`
- **Next.js Dev Server**: `npm run dev`

## Definition of Done (DoD) & Version Control
Before moving to the next step, ensure:
1. **No Errors**: No TypeScript, ESLint, or runtime errors exist.
2. **User Verified**: The user has successfully tested the step locally.
3. **Aesthetics**: The UI matches the premium `DESIGN.md` guidelines.
4. **Git Commit**: Instruct the user to commit their progress (e.g., `git add .` and `git commit -m "feat: completed step X"`).

## Rule Modification Protocol
- **Local Modifications Only**: Whenever instructed to add, update, or delete rules, these modifications MUST be done locally in the workspace's `AGENTS.md` file. NEVER modify the global Antigravity IDE rules. All rule updates must be contained within this local project scope.
