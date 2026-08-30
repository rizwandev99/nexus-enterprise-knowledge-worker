"use server";

import { prisma } from "../lib/db/prisma";
import { ChatGroq } from "@langchain/groq";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { revalidatePath } from "next/cache";

export async function getChatSessions() {
  return await prisma.chatSession.findMany({
    orderBy: { updatedAt: "desc" },
  });
}

export async function createChatSession() {
  const session = await prisma.chatSession.create({
    data: { title: "New Chat" },
  });
  revalidatePath("/");
  return session;
}

export async function deleteChatSession(id: string) {
  await prisma.chatSession.delete({ where: { id } });
  revalidatePath("/");
}

export async function deleteAllChatSessions() {
  await prisma.chatSession.deleteMany({});
}

export async function renameChatSession(id: string, title: string) {
  await prisma.chatSession.update({
    where: { id },
    data: { title },
  });
  revalidatePath("/");
}

export async function getChatMessages(chatId: string) {
  const messages = await prisma.message.findMany({
    where: { chatId },
    orderBy: { createdAt: "asc" },
  });
  // Return in UIMessage format compatible with @ai-sdk/react v4 useChat hook
  return messages.map((m: Awaited<ReturnType<typeof prisma.message.findMany>>[0]) => ({
    id: m.id,
    role: m.role as "user" | "assistant" | "system" | "tool",
    parts: [{ type: "text" as const, text: m.content }],
    content: m.content, // keep as fallback for rendering
  }));
}


export async function saveMessage(chatId: string, role: string, content: string) {
  const cleanContent = (content || "").replace(/\0/g, "").replace(/\u0000/g, "");
  return await prisma.message.create({
    data: { chatId, role, content: cleanContent },
  });
}

export async function generateChatTitle(chatId: string, firstMessageContent: string) {
  try {
    const model = new ChatGroq({
      model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
      temperature: 0,
    });
    
    const response = await model.invoke([
      new SystemMessage("You are a helpful assistant that generates extremely concise chat titles (2-4 words max) based on the user's first message. Output ONLY the title, no quotes or prefix."),
      new HumanMessage(firstMessageContent)
    ]);

    let title = typeof response.content === "string" ? response.content : "New Chat";
    title = title.trim().replace(/^["']|["']$/g, ""); // strip quotes if any
    
    if (title) {
      await renameChatSession(chatId, title);
    }
    return title;
  } catch (error) {
    console.error("Failed to generate chat title:", error);
    return null;
  }
}

export async function getSystemMetrics() {
  try {
    const [docCount, sessionCount, messageCount] = await Promise.all([
      prisma.document.count(),
      prisma.chatSession.count(),
      prisma.message.count(),
    ]);

    return {
      status: "healthy",
      documentCount: docCount,
      sessionCount,
      messageCount,
      vectorEngine: "pgvector + tsvector RRF (k=60)",
      llmModel: "Groq (openai/gpt-oss-120b)",
      stateMachine: "LangGraph.js Directed Cyclic Graph",
    };
  } catch (error) {
    console.error("Failed to fetch system metrics:", error);
    return {
      status: "degraded",
      documentCount: 0,
      sessionCount: 0,
      messageCount: 0,
      vectorEngine: "pgvector + tsvector RRF",
      llmModel: "Groq",
      stateMachine: "LangGraph.js",
    };
  }
}

export async function seedSampleKnowledgeBase() {
  const sampleDocs = [
    {
      title: "Acme Corp Enterprise Security & Data Governance Policy (2026)",
      content: `ACME CORP ENTERPRISE SECURITY & DATA GOVERNANCE POLICY (2026 REVISION)

1. Executive Summary & Zero-Trust Mandate
All production infrastructure and autonomous AI workers must operate under a strict Zero-Trust Architecture. Access to sensitive corporate data stores requires continuous authentication, least-privilege scoping, and explicit human-in-the-loop (HITL) approval for any database mutations.

2. Database Mutation & Change Control Protocol
- DDL statements (DROP, CREATE, ALTER, TRUNCATE) are strictly prohibited for autonomous agents.
- All DML mutations (INSERT, UPDATE, DELETE) executed by AI agents must pass through a two-phase approval boundary.
- Mutation transactions exceeding 50 records require explicit authorization from an Engineering Lead.

3. Role-Based Access Control (RBAC) Hierarchy
- Tier 1 (Viewer): Read-only access to published public knowledge base documents.
- Tier 2 (Knowledge Worker / Analyst): Ability to query internal documents, execute analytical SELECT queries, and upload sanitized project files.
- Tier 3 (Platform Admin): Authorization to grant SQL mutation overrides and manage OpenTelemetry telemetry exporters.

4. Data Retention & Privacy Compliance
- Ephemeral chat sessions are retained for 90 days before cold-tier archiving.
- Extracted document embeddings in pgvector must be purged within 24 hours of document deletion requests under GDPR Article 17.`,
    },
    {
      title: "Nexus Microservices Architecture & 99.99% SLA Specification",
      content: `NEXUS ENTERPRISE MICROSERVICES ARCHITECTURE & SLA SPECIFICATION

1. Service Level Agreement (SLA) Commitments
- Core Query API Availability: 99.99% monthly uptime (< 4.32 minutes downtime per month).
- P95 Response Latency: < 450ms for hybrid RAG vector lookups; < 1.2s for end-to-end agent stream time-to-first-token (TTFT).

2. Directed Cyclic State Machine Design
The orchestration tier is powered by LangGraph.js:
- ragNode: Extracts user intent and executes Reciprocal Rank Fusion (RRF with k=60) balancing cosine similarity and PostgreSQL full-text search (tsvector).
- reasoningNode: Evaluates tool dependencies and formulates execution plans using Llama-3.3-70B.
- approvalNode: Graph-level interrupt() boundary halting execution until client confirms sensitive mutations.
- toolsNode: Executes in-process native tools with automated exception capture and cyclic self-healing (up to 3 retries).

3. Observability & OpenTelemetry Standards
- All HTTP requests, vector similarity lookups, and tool invocations emit GenAI semantic spans to OpenTelemetry (OTel) collectors.
- Trace IDs are propagated across checkpointers to maintain causal chain visibility.`,
    },
    {
      title: "Q3 Enterprise Financial Performance & Cloud AI ROI Report",
      content: `Q3 ENTERPRISE FINANCIAL PERFORMANCE & CLOUD AI ROI REPORT

1. Financial Highlights
- Annual Recurring Revenue (ARR): $48.2 Million (+34% Year-over-Year growth).
- Net Dollar Retention (NDR): 128% across Fortune 500 enterprise accounts.
- Gross Margin: 79.4%, supported by aggressive LLM token routing and semantic caching.

2. AI Infrastructure Efficiency & Cost Optimization
- Migration to self-correcting in-process tool pipelines reduced failed workflow retry costs by 62%.
- Hybrid search caching reduced OpenAI embedding query overhead by $320,000 in Q3.
- Average cost per resolved enterprise knowledge query dropped from $0.042 to $0.007.

3. Global Expansion Initiatives
- EMEA Data Sovereign Deployment: Completed in Frankfurt datacenter with zero data egress guarantees.
- APAC Enterprise Pilot: Onboarded 14 regional banking institutions with strict on-premise RAG isolation.`,
    },
  ];

  let addedCount = 0;
  for (const doc of sampleDocs) {
    const existing = await prisma.document.findFirst({
      where: { title: doc.title },
    });

    if (!existing) {
      const created = await prisma.document.create({
        data: {
          title: doc.title,
          content: doc.content,
        },
      });

      // Index chunks
      const chunkSize = 800;
      for (let i = 0; i < doc.content.length; i += chunkSize) {
        const chunkText = doc.content.slice(i, i + chunkSize);
        await prisma.$executeRawUnsafe(
          `INSERT INTO document_chunks ("id", "documentId", "content", "createdAt") VALUES (gen_random_uuid(), $1, $2, NOW())`,
          created.id,
          chunkText
        );
      }
      addedCount++;
    }
  }

  revalidatePath("/");
  return {
    success: true,
    addedCount,
    message:
      addedCount > 0
        ? `Successfully seeded ${addedCount} enterprise documents into PostgreSQL!`
        : "Knowledge base is already up to date with 3 enterprise documents.",
  };
}

