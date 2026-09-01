# Nexus Enterprise Knowledge Worker

> An enterprise-grade, stateful AI knowledge assistant and database worker featuring Hybrid RAG (pgvector + tsvector RRF), Human-in-the-Loop governance, cyclic tool self-correction, and full-stack observability.

![Next.js](https://img.shields.io/badge/Next.js%2015-black?style=for-the-badge&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React%2019-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![LangGraph](https://img.shields.io/badge/LangGraph.js-FF4F00?style=for-the-badge&logo=langchain&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL%2016-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS_v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![Tests](https://img.shields.io/badge/Tests-100%25%20Passing-brightgreen?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)

<div align="center">

<img src="./public/screenshots/nexus-demo.gif" alt="Nexus Enterprise AI Knowledge Worker Live Showcase" width="100%" />

<br/><br/>

[![Watch YouTube HD Walkthrough](https://img.shields.io/badge/YouTube-Watch%20Full%20HD%20Demo%20(4--Min)-FF0000?style=for-the-badge&logo=youtube&logoColor=white)](https://youtu.be/vZSU9izlB1s)
&nbsp;&nbsp;
[![Live Cloud App](https://img.shields.io/badge/Live%20Application-nexus--enterprise--knowledge--worker.vercel.app-6366F1?style=for-the-badge&logo=vercel&logoColor=white)](https://nexus-enterprise-knowledge-worker.vercel.app)
&nbsp;&nbsp;
[![GitHub Source](https://img.shields.io/badge/GitHub-Repository%20Source-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/rizwandev99/nexus-enterprise-knowledge-worker)

<br/><br/>

*🎬 **Interactive System Preview**: Real-time Hybrid RAG (pgvector + tsvector RRF), Human-in-the-Loop SQL execution, DuckDuckGo live web search, and OpenTelemetry distributed tracing.*

<br/>

> **Try it live in your browser:** Click **"📚 Seed Demo KB"** in the sidebar to populate enterprise compliance policies, then ask:  
> *"What is our data retention policy?"* or *"Insert an audit log entry for user 42"* to trigger the HITL approval dialog!

</div>

---

## 📸 System Showcase & Interactive UI

| 🎨 Dark Glassmorphism Workspace | 🛡️ HITL Human Approval Modal |
|---|---|
| ![UI Screenshot](./public/screenshots/ui-main.png) | ![HITL Modal](./public/screenshots/hitl-modal.png) |

| 📑 3D Citation Drawer & RRF Sources | ⚡ Live LangGraph Telemetry Inspector |
|---|---|
| ![Citation Drawer](./public/screenshots/citation-drawer.png) | ![Telemetry Modal](./public/screenshots/telemetry-modal.png) |

---

## 📖 Executive Summary

**Nexus Enterprise Knowledge Worker** is an autonomous AI co-worker built for corporate environments where data accuracy, governance, and zero-trust security are critical.

Unlike conventional stateless LLM wrappers, Nexus uses a **LangGraph.js directed cyclic state machine** with **persistent PostgreSQL state checkpointing**, allowing it to:
1. Retrieve enterprise context across structured databases and unstructured documents using **Reciprocal Rank Fusion (RRF)**.
2. Ingest, parse, and sanitize multi-format attachments (PDF, Markdown, CSV, TXT, JSON, Source code).
3. Safely execute database mutations through **Human-in-the-Loop (HITL) interrupt boundaries**.
4. Self-correct and auto-heal parameters when database or tool exceptions occur.
5. Export full-lifecycle traces via **OpenTelemetry (OTel)**.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    Client["Next.js 15 Client<br/>(React 19 / Dark Glassmorphism UI)"] -->|"POST /api/chat (SSE Stream)"| ChatAPI["API Route<br/>(/api/chat)"]
    Client -->|"POST /api/parse-document"| DocParser["Document Parser<br/>(/api/parse-document)"]

    ChatAPI -->|"Stream Events"| LangGraph["LangGraph.js Directed Cyclic Graph"]

    subgraph StateMachine ["LangGraph State Machine"]
        RAGNode["ragNode<br/>(Hybrid Search)"] -->|"RRF Context & Citations"| ReasoningNode["reasoningNode<br/>(GPT-OSS 120B / Multi-Provider)"]
        ReasoningNode -->|"Has Tool Call?"| Router{"Tool Check"}
        Router -->|"Read SELECT / Ingestion"| ToolsNode["toolsNode<br/>(Native Tools)"]
        Router -->|"DML Mutation"| ApprovalInterrupt["approvalNode<br/>(interrupt boundary)"]
        Router -->|"Complete"| EndNode["Finalized (END)"]

        ToolsNode -->|"Tool Exception (Auto-Heal)"| ReasoningNode
        ApprovalInterrupt -->|"Approved / Rejected"| ToolsNode
    end

    subgraph StorageLayer ["Storage & Persistence Layer"]
        PrismaPostgres[("PostgreSQL 16<br/>(pgvector + tsvector)")]
        Checkpointer[("PostgreSQL Saver<br/>(PostgresSaver)")]
    end

    RAGNode <-->|"Cosine Similarity + Full-Text RRF"| PrismaPostgres
    ToolsNode <-->|"add_document / execute_sql"| PrismaPostgres
    LangGraph <-->|"Thread State Persistence"| Checkpointer

    subgraph ObservabilityLayer ["Observability"]
        OTel["OpenTelemetry Instrumentation<br/>(/instrumentation.ts)"]
    end
    LangGraph -.->|"Traces & Semantic Spans"| OTel
```

---

## ✨ Key Architectural Highlights

### 1. Hybrid RAG Engine (pgvector + tsvector RRF)
Combines dense semantic vector search (OpenAI `text-embedding-3-small` / cosine distance) with sparse keyword search (PostgreSQL `tsvector` + GIN indexing). Results are fused using **Reciprocal Rank Fusion (RRF)**:

$$\text{RRF Score}(d) = \sum_{m \in M} \frac{1}{k + r_m(d)} \quad (k = 60)$$

This eliminates semantic hallucination and enables verifiable inline footnote citations (`[Doc-1]`, `[Doc-2]`).

### 2. Directed Cyclic State Machine & Self-Correction
Powered by **LangGraph.js v1.0**. If a tool execution throws a runtime error (e.g. malformed SQL syntax or missing column), the error is caught, formatted as a tool execution exception, and routed back to the reasoning node. The LLM reflects on the error message, auto-corrects its arguments, and retries seamlessly without terminating the stream.

### 3. Zero-Trust Human-in-the-Loop (HITL) Governance
Sensitive operations (such as `execute_sql_mutation`) halt execution at a graph-level `interrupt()` boundary. The client UI displays an interactive approval modal showing the exact SQL statement and parameters. Execution only resumes upon cryptographic token confirmation (`[HUMAN_APPROVAL_YES]` / `[HUMAN_APPROVAL_NO]`).

### 4. Multi-Format Document Ingestion Engine
Features an in-memory document parser (`/api/parse-document`) supporting PDF (`pdf-parse`), Markdown, TXT, CSV, JSON, and source code. Includes automatic null-byte sanitization (`0x00`) and safe chunking to prevent PostgreSQL encoding crashes.

### 5. Live Agent Telemetry & Inspection Modal
Provides a real-time introspection modal in the UI displaying:
- Active LangGraph execution pipeline (`ragNode` ➔ `reasoningNode` ➔ `approvalNode` ➔ `toolsNode`).
- Live database document and chunk counts.
- Thread ID and PostgreSQL checkpointer status.
- OpenTelemetry OTLP tracing health.

---

## 🔧 Technical Stack

| Category | Technology | Description |
|---|---|---|
| **Framework** | Next.js 15 (App Router, Server Actions) | React 19, Server Components, Streaming UI |
| **Agent Orchestration** | LangGraph.js v1.0 & `@langchain/core` | Directed cyclic graph, state checkpointers |
| **LLM Inference** | Groq (`openai/gpt-oss-120b`), OpenAI, Anthropic | Ultra-fast token streaming & tool calling |
| **Database & Vector Store** | PostgreSQL 16+ & `pgvector` | Prisma ORM, GIN full-text index, persistent checkpointers |
| **UI Design System** | Tailwind CSS v4 | Linear.app-style dark glassmorphism, animated ambient orbs |
| **Streaming Protocol** | Vercel AI SDK v7 (`@ai-sdk/react`) | `createUIMessageStream`, real-time SSE |
| **Observability** | OpenTelemetry (`@opentelemetry/sdk-node`) | GenAI semantic conventions, distributed tracing |
| **Testing** | Vitest & Playwright | 100% passing unit & integration test suite |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Docker & Docker Compose (for local PostgreSQL + pgvector)

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/rizwandev99/nexus-enterprise-knowledge-worker.git
   cd nexus-enterprise-knowledge-worker
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   # or: npm install
   ```

3. **Configure Environment Variables:**
   ```bash
   cp .env.example .env
   ```
   Add your `DATABASE_URL`, `GROQ_API_KEY`, and optional `OPENAI_API_KEY`.

4. **Start PostgreSQL with pgvector (Docker):**
   ```bash
   docker-compose up -d
   ```

5. **Run Prisma Migrations:**
   ```bash
   npx prisma db push
   ```

6. **Start Development Server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

7. **One-Click Demo Knowledge Base Seeding:**
   Click the **⚡ Seed Demo Knowledge Base** button in the UI or run the seeder to populate sample enterprise governance documents.

---

## 🧪 Testing

Run the automated Vitest test suite:

```bash
# Run all unit tests
npm test
```

All **38** unit and integration tests across tools, graph compilation, parser safety, and telemetry run and pass cleanly. **38/38 tests passing.**

---

## 🏛️ Engineering Decision Records (ADRs)

- **Why LangGraph.js instead of simple chains?** Enterprise workflows require loops (self-correction), checkpoints (serverless session resumption), and conditional interrupt boundaries (HITL). LangGraph provides first-class support for stateful cyclic graphs.
- **Why Reciprocal Rank Fusion (RRF)?** Pure vector search often fails on exact keyword lookups (e.g. acronyms, error codes, IDs), while pure keyword search misses semantic synonyms. RRF combines both without requiring manual score calibration.
- **Why In-Process Tools?** Embedding native `@tool` definitions in-process eliminates network hops, reduces latency, and allows transactional Prisma access while retaining strict SQL security allowlists.

---

## 🧠 Engineering Decisions & Hard Problems Solved

### Why LangGraph.js Instead of Simple Chains?
Enterprise workflows require **loops** (tool self-correction), **checkpoints** (serverless session resumption across cold starts), and **interrupt boundaries** (HITL governance). LangGraph provides first-class cyclic graph support with persistent PostgreSQL state — something you cannot achieve with linear chains or basic `ReAct` loops.

### Why Reciprocal Rank Fusion (RRF)?
Pure vector search fails on exact keyword lookups (error codes, policy IDs, acronyms). Pure keyword search misses semantic synonyms. RRF fuses both result sets using the formula:

$$\text{RRF}(d) = \sum_{m} \frac{1}{60 + r_m(d)}$$

This delivers **zero-calibration** hybrid relevance that outperforms either method alone on enterprise document corpora.

### The Hardest Bug: PostgreSQL Stack Depth Limit & Null Byte Crashes
During document ingestion, PDF parsing introduced `0x00` null bytes that caused PostgreSQL UTF-8 encoding failures. Separately, recursive `add_document` tool invocations exceeded PostgreSQL's stack depth limit. **Both were solved with:** null byte sanitization at 3 layers (parser, API, tool), query string truncation, and a system prompt guard preventing recursive self-invocation.

### Production Trade-offs Made
- **Groq (Llama 3.3 70B) over GPT-4o by default**: 10× faster TTFT for streaming UX, with OpenAI/Anthropic/DeepSeek as selectable fallbacks
- **In-process tools over MCP stdio**: Eliminates network hops and enables transactional Prisma access with strict SQL allowlists
- **PostgreSQL checkpointer over in-memory**: Enables true serverless state resumption across Lambda cold starts
- **`max: 5` connection pool**: Balances Vercel concurrent function limits against PostgreSQL connection overhead

---

## ⚡ Performance Characteristics

| Metric | Value | Notes |
|---|---|---|
| **Time to First Token (TTFT)** | ~200-400ms | Groq Llama 3.3 70B |
| **Hybrid Search (RRF)** | ~50-150ms | 5-doc fusion, GIN-indexed |
| **Document Ingestion** | ~800ms | PDF parse + embed + batch chunk insert |
| **HITL Round-trip** | <100ms | interrupt() → resume token → graph continuation |
| **Cold Start (Vercel)** | ~1-2s | serverless Lambda with pg pool pre-warm |

> All measurements on Prisma Postgres (free tier) + Groq API with Vercel Edge Network routing.

---

## 📜 License

Distributed under the MIT License. See [LICENSE](LICENSE) for details.

---

<div align="center">

**Built by [Rizwan](https://github.com/rizwandev99) — Open to senior full-stack & AI engineer remote roles**

[![GitHub](https://img.shields.io/badge/GitHub-rizwandev99-181717?style=flat-square&logo=github)](https://github.com/rizwandev99)

</div>
