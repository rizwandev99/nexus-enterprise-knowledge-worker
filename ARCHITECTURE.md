# System Architecture — Nexus Enterprise Knowledge Worker

## 1. High-Level Architecture Overview
```mermaid
graph TD
    Client["Client UI (Next.js 15 / React 19 / Vercel AI SDK)"] -->|POST /api/chat (SSE Stream)| ChatAPI["API Route (/api/chat)"]
    Client -->|POST /api/parse-document| DocParser["Document Parser (/api/parse-document)"]
    
    ChatAPI -->|Stream Events| LangGraph["LangGraph.js State Machine"]
    
    subgraph LangGraph Machine
        RAGNode["Researcher (ragNode)"] -->|Hybrid Search| ReasoningNode["Reasoning Engine (reasoningNode)"]
        ReasoningNode -->|Conditional Edge: Has Tool Calls?| Router{"Action Needed?"}
        Router -->|Yes: Safe Read| ToolsNode["Execution Node (toolsNode)"]
        Router -->|Yes: SQL Mutation| ApprovalInterrupt["HITL Approval Boundary (interrupt)"]
        Router -->|No / Complete| EndNode["State Finalized (END)"]
        ToolsNode -->|Self-Correction Feedback| ReasoningNode
        ApprovalInterrupt -->|Approved / Rejected| ToolsNode
    end
    
    subgraph Data & Storage Layer
        PrismaPostgres[("PostgreSQL Database (Prisma Postgres / pgvector)")]
        Checkpointer[("PostgreSQL Checkpointer (PostgresSaver)")]
    end
    
    RAGNode <-->|Cosine Similarity + tsvector (RRF)| PrismaPostgres
    ToolsNode <-->|execute_sql_query / execute_sql_mutation / add_document| PrismaPostgres
    LangGraph <-->|Thread State Persistence| Checkpointer
    
    subgraph Observability
        OTel["OpenTelemetry Instrumentation (/instrumentation.ts)"]
    end
    LangGraph -.->|Traces & Metrics| OTel
```

---

## 2. Database Schema (PostgreSQL + pgvector)

### Models & Tables
1. **`documents` (`Document`)**
   - `id` (UUID, Primary Key)
   - `title` (Text)
   - `content` (Text)
   - `createdAt` (Timestamp)
   - `updatedAt` (Timestamp)
   - *Relations*: 1-to-many with `document_chunks`

2. **`document_chunks` (`DocumentChunk`)**
   - `id` (UUID, Primary Key)
   - `documentId` (UUID, FK -> `documents.id` ON DELETE CASCADE)
   - `content` (Text)
   - `embedding` (`vector(1536)` nullable)
   - `createdAt` (Timestamp)

3. **`chat_sessions` (`ChatSession`)**
   - `id` (UUID, Primary Key)
   - `title` (Text, Default: "New Chat")
   - `createdAt` (Timestamp)
   - `updatedAt` (Timestamp)
   - *Relations*: 1-to-many with `messages`

4. **`messages` (`Message`)**
   - `id` (UUID, Primary Key)
   - `chatId` (UUID, FK -> `chat_sessions.id` ON DELETE CASCADE)
   - `role` (Text: `"user"` | `"assistant"` | `"system"` | `"tool"`)
   - `content` (Text, sanitized for null bytes)
   - `createdAt` (Timestamp)

5. **`checkpoints` / `checkpoint_blobs` / `checkpoint_writes`**
   - Managed automatically by `@langchain/langgraph-checkpoint-postgres` for serverless state persistence.

---

## 3. Backend & Agent Routing Architecture

### API Routes
- `POST /api/chat`: Main AI agent stream endpoint. Handles user prompts, auto-session naming, LangGraph thread execution with `streamEvents`, HITL resumption tokens (`[HUMAN_APPROVAL_YES]` / `[HUMAN_APPROVAL_NO]`), and real-time SSE streaming.
- `POST /api/parse-document`: Multi-format document parser accepting `multipart/form-data` uploads (PDF via `pdf-parse`, TXT, MD, CSV, JSON, Source Code), sanitizing null bytes and bounding sizes up to 50k chars.

### LangGraph Directed Cyclic Graph Nodes & Edges
- **`ragNode`**: Extracts user intent, runs Reciprocal Rank Fusion (RRF) combining vector similarity + BM25 keyword matching via PostgreSQL `tsvector`, and injects citations into context.
- **`reasoningNode`**: Invokes LLM (OpenAI `gpt-4o-mini` / `gpt-4o`, Claude 3.5 Sonnet, or Groq LLaMA 3.3 70B) with bound native tools (`add_document`, `execute_sql_query`, `execute_sql_mutation`).
- **`toolsNode`**: Executes in-process tools safely with OWASP table allowlisting, error capture, and cyclic self-healing back to `reasoningNode`.
- **HITL Interrupt**: Halts graph execution on sensitive SQL mutations, prompts client for review, and resumes dynamically upon user confirmation.
- **Bounded Cyclic Self-Correction**: `AgentState.retryCount` tracks retry attempts; conditional edges bound retries to a maximum of 3 iterations to guarantee zero runaway loops.

---

## 4. Security, Resilience & Data Access Architecture

### 4.1 OWASP Table Whitelisting Layer (`src/lib/agent/tools.ts`)
- **Table Whitelist**: Enforces strict mutation allowlist (`documents`, `document_chunks`, `chat_sessions`, `messages`).
- **DML Allowlisting**: Restricts operations to `INSERT`, `UPDATE`, `DELETE`; rejects dangerous DDL (`DROP`, `ALTER`, `TRUNCATE`) and unauthorized schema mutations.
- **Null-Byte Sanitization**: Strips `\0` / `\u0000` bytes across inputs to protect PostgreSQL text encoding.

### 4.2 Serverless Connection Pool Management (`src/lib/db/prisma.ts`)
- **Bounded Pool Configuration**: Node `pg.Pool` configured with `max: 5`, `idleTimeoutMillis: 30000`, and `connectionTimeoutMillis: 5000` for Vercel Serverless Function cold-start efficiency and connection leak prevention.
- **Batch Chunk Ingestion**: Ingests document chunks via transactional `$transaction` using `createMany`, optimizing database round-trips.

### 4.3 Rich Markdown & Interactive Citation Rendering Pipeline (`src/components/MessageBubble.tsx`)
- **Zero-Dependency Markdown Engine**: Parses headers (`#`, `##`, `###`), bold/italics, bullet lists, inline code, and syntax-highlighted code blocks with 1-click clipboard copy.
- **Interactive Citation Tokens**: Automatically detects `[Doc-X]` tokens and transforms them into interactive pill badges linked to document sources.

---

## 5. Frontend Component Tree & UI Structure

```
src/
├── app/
│   ├── layout.tsx         # Root layout with JetBrains Mono + Inter fonts, Theme & OTel provider
│   ├── page.tsx           # Main workspace orchestration, handles chat state & stream events
│   ├── chat-actions.ts    # Server actions for sessions (list, create, delete, rename, message history)
│   └── globals.css        # Linear.app-style dark glassmorphism design tokens & animations
├── components/
│   ├── ChatInput.tsx      # Auto-resizing textarea, document attachment pill, file drag-and-drop
│   ├── MessageList.tsx    # Message container, dynamic scroll, Bento feature quick-start cards
│   ├── MessageBubble.tsx  # Linear-style message cards, inline citation tags, markdown formatting
│   ├── Sidebar.tsx        # Vertical icon navigation rail, session history drawer, new chat trigger
│   ├── ApprovalModal.tsx  # Human-in-the-loop action approval modal for SQL mutations
│   ├── TelemetryModal.tsx # Live LangGraph execution traces & state machine inspector
│   └── Toast.tsx          # Non-intrusive floating feedback alerts
└── lib/
    ├── agent/
    │   ├── graph.ts       # LangGraph cyclic state machine construction & PostgreSQL checkpointer
    │   ├── state.ts       # AgentState interface with messages, citations, retryCount, and isApproved
    │   └── tools.ts       # Native LangChain tools with OWASP table allowlist & batch transaction support
    └── db/
        ├── prisma.ts      # Prisma Client & bounded pg Pool singleton instance
        └── hybrid-search.ts # Hybrid RRF search (pgvector cosine + tsvector keyword matching)
```
