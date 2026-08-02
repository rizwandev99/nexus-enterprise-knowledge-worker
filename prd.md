# Product Requirement Document (PRD): Enterprise Knowledge & Governance Platform ("Nexus-Enterprise Knowledge Worker")

This document provides a single, production-grade Product Requirement Document designed for consumption by AI IDEs (such as Cursor, Windsurf, GitHub Copilot Workspace, or Claude Code). You can copy and paste this PRD directly into your AI IDE to generate the entire unified codebase.

---

## 1. Executive System Overview

### 1.1 Goal

Build an enterprise-grade AI system that merges Retrieval-Augmented Generation (RAG) with autonomous tool-calling agents. The system enables users to query unstructured enterprise knowledge while executing complex multi-step database and API actions through standardized Model Context Protocol (MCP) servers.

### 1.2 Core Architectural Features

* **Hybrid RAG Engine**: Combines PostgreSQL `pgvector` cosine similarity with full-text keyword search (`tsvector`) via Reciprocal Rank Fusion (RRF), streaming verifiable footnotes/citations to the client UI.


* **Stateful Agent Machine**: LangGraph.js directed acyclic/cyclic graph with persistent PostgreSQL state checkpointers.


* **Model Context Protocol (MCP)**: Custom TypeScript MCP server exposing enterprise database/API capabilities, dynamically integrated into LangGraph via `@langchain/mcp-adapters`.


* **Cyclic Self-Correction**: Graph logic that captures MCP execution exceptions, feeds runtime errors back to the model, and automatically attempts parameter self-healing.


* **Human-in-the-Loop (HITL)**: Graph-level `interrupt()` boundaries that halt state execution for dangerous operations (e.g., SQL mutations) and await human UI confirmation.


* **Enterprise Telemetry**: OpenTelemetry (OTel) instrumentation emitting GenAI semantic conventions across API handlers, vector queries, and MCP tool executions.



---

## 2. Technical Stack & Repository Architecture

### 2.1 Stack Specifications

* **Framework**: Next.js 15 (App Router, React 19, Server Actions)


* **Client UI**: Vercel AI SDK 6 (`useChat`), Tailwind CSS, shadcn/ui, Lucide Icons


* **Agent Framework**: LangGraph.js v1.0, `@langchain/core`, `@langchain/openai` or `@langchain/anthropic`

* **MCP Integration**: `@modelcontextprotocol/sdk`, `@langchain/mcp-adapters`

* **Database & Vector Store**: PostgreSQL 16+ with `pgvector`, Prisma ORM


* **Observability**: `@opentelemetry/api`, `@opentelemetry/sdk-node`, LangSmith / Langfuse



### 2.2 Target File Tree Structure

AI IDEs must strictly follow this folder hierarchy when generating code:

├── docker-compose.yml
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/route.ts
│   │   │   └── mcp/route.ts
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── chat-interface.tsx
│   │   ├── citation-popover.tsx
│   │   ├── hitl-approval-modal.tsx
│   │   └── mcp-status-badge.tsx
│   ├── lib/
│   │   ├── agent/
│   │   │   ├── graph.ts
│   │   │   ├── state.ts
│   │   │   ├── nodes/
│   │   │   │   ├── rag.ts
│   │   │   │   ├── reasoning.ts
│   │   │   │   ├── tool-executor.ts
│   │   │   │   └── self-correct.ts
│   │   │   └── checkpointer.ts
│   │   ├── db/
│   │   │   ├── prisma.ts
│   │   │   └── hybrid-search.ts
│   │   ├── mcp/
│   │   │   └── mcp-client.ts
│   │   └── telemetry/
│   │       └── tracer.ts
│   └── mcp-server/
│       ├── server.ts
│       └── tools/
│           ├── db-tools.ts
│           └── api-tools.ts
├── instrumentation.ts
├── package.json
└── tsconfig.json

---

## 3. Database Schema & Hybrid Search SQL Specifications

### 3.1 Prisma Schema (`prisma/schema.prisma`)

```prisma
datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [pgvector(map: "vector")]
}

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

model Document {
  id        String   @id @default(uuid())
  title     String
  uri       String
  createdAt DateTime @default(now())
  chunks    Chunk[]
}

model Chunk {
  id         String                 @id @default(uuid())
  documentId String
  document   Document               @relation(fields: [documentId], references: [id], onDelete: Cascade)
  content    Text
  metadata   Json
  embedding  Unsupported("vector")?
  ftsVector  Unsupported("tsvector")?

  @@index([documentId])
}

model ThreadCheckpoint {
  threadId   String   @id
  checkpoint Json
  updatedAt  DateTime @updatedAt
}

```

### 3.2 SQL Migration for Hybrid Search & Reciprocal Rank Fusion

The AI IDE must create a raw database migration executing the following SQL to construct the hybrid RAG query function using Reciprocal Rank Fusion:

$$\text{RRF Score}(d) = \sum_{m \in M} \frac{1}{k + r_m(d)}$$

where $k = 60$ is the RRF constant, and $r_m(d)$ is the rank of document $d$ in retrieval method $m$.

```sql
CREATE EXTENSION IF NOT EXISTS vector;

-- Create text search index
ALTER TABLE "Chunk" ADD COLUMN IF NOT EXISTS fts_vector tsvector 
  GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;
CREATE INDEX IF NOT EXISTS chunk_fts_idx ON "Chunk" USING gin(fts_vector);

-- Hybrid Match Function
CREATE OR REPLACE FUNCTION match_hybrid_chunks(
  query_text TEXT,
  query_embedding vector(1536),
  match_limit INT DEFAULT 5,
  rrf_k INT DEFAULT 60
)
RETURNS TABLE (
  id TEXT,
  document_id TEXT,
  content TEXT,
  metadata JSONB,
  combined_score FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH dense_ranks AS (
    SELECT c.id, ROW_NUMBER() OVER (ORDER BY c.embedding <=> query_embedding) AS rank
    FROM "Chunk" c
    WHERE c.embedding IS NOT NULL
    ORDER BY c.embedding <=> query_embedding
    LIMIT match_limit * 2
  ),
  sparse_ranks AS (
    SELECT c.id, ROW_NUMBER() OVER (ORDER BY ts_rank(c.fts_vector, websearch_to_tsquery('english', query_text)) DESC) AS rank
    FROM "Chunk" c
    WHERE c.fts_vector @@ websearch_to_tsquery('english', query_text)
    ORDER BY rank
    LIMIT match_limit * 2
  )
  SELECT 
    c.id,
    c."documentId",
    c.content,
    c.metadata,
    COALESCE(1.0 / (rrf_k + dense.rank), 0.0) + COALESCE(1.0 / (rrf_k + sparse.rank), 0.0) AS combined_score
  FROM dense_ranks dense
  FULL OUTER JOIN sparse_ranks sparse ON dense.id = sparse.id
  JOIN "Chunk" c ON c.id = COALESCE(dense.id, sparse.id)
  ORDER BY combined_score DESC
  LIMIT match_limit;
END;
$$;

```

---

## 4. Custom MCP Server Implementation Specifications

Create a standalone TypeScript MCP Server at `src/mcp-server/server.ts` using `@modelcontextprotocol/sdk`.

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

const server = new Server(
  { name: "enterprise-mcp-server", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

const QueryDbSchema = z.object({
  table: z.string(),
  limit: z.number().optional().default(10),
});

const ExecuteMutationSchema = z.object({
  action: z.enum(["INSERT", "UPDATE", "DELETE"]),
  table: z.string(),
  payload: z.record(z.any()),
});

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "query_enterprise_db",
      description: "Read records from the transactional database.",
      inputSchema: QueryDbSchema,
    },
    {
      name: "execute_sql_mutation",
      description: "SENSITIVE: Execute database mutations (requires approval).",
      inputSchema: ExecuteMutationSchema,
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    if (name === "query_enterprise_db") {
      const parsed = QueryDbSchema.parse(args);
      // Mocked DB call for safety
      return {
        content: [{ type: "text", text: JSON.stringify([{ id: "101", name: "Sample Data", status: "Active" }]) }],
      };
    }
    
    if (name === "execute_sql_mutation") {
      const parsed = ExecuteMutationSchema.parse(args);
      return {
        content: [{ type: "text", text: `Successfully executed ${parsed.action} on ${parsed.table}.` }],
      };
    }
    
    throw new Error(`Tool not found: ${name}`);
  } catch (error: any) {
    return {
      isError: true,
      content: [{ type: "text", text: `MCP Execution Error: ${error.message}` }],
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main();

```

---

## 5. LangGraph.js Agent Architecture & Node Logic

### 5.1 State Interface (`src/lib/agent/state.ts`)

```typescript
import { BaseMessage } from "@langchain/core/messages";
import { Annotation } from "@langchain/langgraph";

export const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    value: (x, y) => x.concat(y),
    default: () => [],
  }),
  citations: Annotation<Array<{ id: string; title: string; content: string; uri: string }>>({
    value: (x, y) => y,
    default: () => [],
  }),
  retryCount: Annotation<number>({
    value: (x, y) => y,
    default: () => 0,
  }),
  isApproved: Annotation<boolean>({
    value: (x, y) => y,
    default: () => false,
  }),
});

```

### 5.2 Main State Graph (`src/lib/agent/graph.ts`)

```typescript
import { StateGraph, END, START, interrupt } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { AgentState } from "./state";
import { executeHybridSearch } from "../db/hybrid-search";

// Initialize MCP Client Tools dynamically
const mcpClient = new MultiServerMCPClient({
  mcpServers: {
    enterprise: {
      transport: "stdio",
      command: "npx",
      args: ["ts-node", "src/mcp-server/server.ts"],
    },
  },
});

export async function createAgentGraph() {
  const mcpTools = await mcpClient.getTools();
  const model = new ChatOpenAI({ modelName: "gpt-4o", temperature: 0 }).bindTools(mcpTools);

  const ragNode = async (state: typeof AgentState.State) => {
    const lastMessage = state.messages[state.messages.length - 1];
    const query = lastMessage.content.toString();
    const searchResults = await executeHybridSearch(query);
    
    const contextStr = searchResults
      .map((r, idx) => `[Doc-${idx + 1}] Title: ${r.metadata.title}\nContent: ${r.content}`)
      .join("\n\n");

    const citations = searchResults.map((r, idx) => ({
      id: `Doc-${idx + 1}`,
      title: r.metadata.title,
      content: r.content,
      uri: r.metadata.uri,
    }));

    return {
      citations,
      messages: [
        {
          role: "system",
          content: `You possess context retrieved from internal enterprise documents:\n${contextStr}\nWhen using retrieved facts, insert exact inline citation footnotes like [Doc-1].`,
        },
      ],
    };
  };

  const reasoningNode = async (state: typeof AgentState.State) => {
    const response = await model.invoke(state.messages);
    return { messages: [response] };
  };

  const approvalNode = async (state: typeof AgentState.State) => {
    const lastMsg = state.messages[state.messages.length - 1];
    const toolCalls = lastMsg.tool_calls || [];
    
    const sensitiveCall = toolCalls.find((tc) => tc.name.includes("execute_sql_mutation"));
    if (sensitiveCall && !state.isApproved) {
      const decision = interrupt({
        type: "HUMAN_APPROVAL_REQUEST",
        toolCall: sensitiveCall,
      });

      if (!decision.approved) {
        return {
          messages: [
            {
              role: "tool",
              tool_call_id: sensitiveCall.id,
              content: "Tool execution aborted by human approval rejection.",
            },
          ],
        };
      }
    }
  };

  const toolExecutionNode = async (state: typeof AgentState.State) => {
    const lastMsg = state.messages[state.messages.length - 1];
    const toolCalls = lastMsg.tool_calls || [];
    const results = [];

    for (const call of toolCalls) {
      try {
        const targetTool = mcpTools.find((t) => t.name === call.name);
        if (!targetTool) throw new Error(`Tool ${call.name} not available.`);
        
        const output = await targetTool.invoke(call.args);
        results.push({
          role: "tool",
          tool_call_id: call.id,
          content: typeof output === "string" ? output : JSON.stringify(output),
        });
      } catch (err: any) {
        // Return exception to trigger self-correction
        results.push({
          role: "tool",
          tool_call_id: call.id,
          content: `RUNTIME EXCEPTION: ${err.message}`,
          isError: true,
        });
      }
    }
    return { messages: results };
  };

  const workflow = new StateGraph(AgentState)
    .addNode("rag", ragNode)
    .addNode("reasoning", reasoningNode)
    .addNode("approval", approvalNode)
    .addNode("tools", toolExecutionNode)
    .addEdge(START, "rag")
    .addEdge("rag", "reasoning")
    .addConditionalEdges("reasoning", (state) => {
      const lastMsg = state.messages[state.messages.length - 1];
      if (lastMsg.tool_calls && lastMsg.tool_calls.length > 0) {
        return "approval";
      }
      return END;
    })
    .addEdge("approval", "tools")
    .addConditionalEdges("tools", (state) => {
      const lastMsg = state.messages[state.messages.length - 1];
      const isErr = lastMsg.content?.toString().includes("RUNTIME EXCEPTION");
      if (isErr && state.retryCount < 3) {
        return "reasoning"; // Self-correction loop
      }
      return "reasoning";
    });

  return workflow.compile();
}

```

---

## 6. Next.js Streaming Route Handler Integration

Implement `/src/app/api/chat/route.ts` using Vercel AI SDK 6 stream protocols.

```typescript
import { createAgentGraph } from "@/lib/agent/graph";
import { trace } from "@opentelemetry/api";

export async function POST(req: Request) {
  const tracer = trace.getTracer("agent-api-route");

  return tracer.startActiveSpan("api.chat.post", async (span) => {
    try {
      const { messages, threadId, approvalDecision } = await req.json();
      const graph = await createAgentGraph();
      
      const encoder = new TextEncoder();
      const customStream = new ReadableStream({
        async start(controller) {
          const streamEvents = await graph.streamEvents(
            { messages },
            { version: "v2", configurable: { thread_id: threadId } }
          );

          for await (const event of streamEvents) {
            if (event.event === "on_chat_model_stream") {
              const chunkText = event.data.chunk.content;
              if (chunkText) {
                controller.enqueue(encoder.encode(`0:${JSON.stringify(chunkText)}\n`));
              }
            }
            if (event.event === "on_custom_event" && event.name === "citation") {
              controller.enqueue(encoder.encode(`2:${JSON.stringify(event.data)}\n`));
            }
          }
          controller.close();
        },
      });

      span.setStatus({ code: 1 });
      return new Response(customStream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "X-Vercel-AI-Data-Stream": "v1",
        },
      });
    } catch (error: any) {
      span.recordException(error);
      span.setStatus({ code: 2, message: error.message });
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    } finally {
      span.end();
    }
  });
}

```

---

## 7. OpenTelemetry Instrumentation (`instrumentation.ts`)

```typescript
import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";

const sdk = new NodeSDK({
  spanProcessor: new SimpleSpanProcessor(
    new OTLPTraceExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318/v1/traces",
    })
  ),
});

sdk.start();

```

---

## 8. Sequential Implementation Checklist for AI IDE Execution

Execute these steps in order:

1. **Infrastructure Initialization**:
* Create `docker-compose.yml` with PostgreSQL (including `pgvector/pgvector:pg16` image).
* Initialize Prisma, generate migration files containing `match_hybrid_chunks` SQL, and execute `prisma db push`.




2. **MCP Server Construction**:
* Build `src/mcp-server/server.ts` with TypeScript and `@modelcontextprotocol/sdk`.


* Verify server initialization and stdio command executions.




3. **Orchestration Core**:
* Build `src/lib/agent/state.ts` and `src/lib/agent/graph.ts`.


* Hook `@langchain/mcp-adapters` into `MultiServerMCPClient`.


* Implement cyclic conditional edges for self-correction and `interrupt()` logic for HITL tool calls.




4. **API Route & Next.js Presentation**:
* Write `/src/app/api/chat/route.ts` bridging `streamEvents` to Vercel AI SDK.


* Build React 19 Client UI with `useChat`, streaming response blocks, citation popovers, and interactive tool execution approval modals.




5. **Telemetry Hardening**:
* Configure `instrumentation.ts` to capture GenAI semantic attributes across route handlers, graph nodes, and MCP calls.


* Run end-to-end integration tests confirming multi-step retries and approval resumes.