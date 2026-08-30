import "dotenv/config";
import { prisma } from '../src/lib/db/prisma';

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

async function main() {
  console.log('Seeding enterprise knowledge base...');

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

      // Split into chunks of 400 chars for fine-grained hybrid RAG search
      const chunkSize = 400;
      for (let i = 0; i < doc.content.length; i += chunkSize) {
        const chunkText = doc.content.slice(i, i + chunkSize);
        await prisma.documentChunk.create({
          data: {
            documentId: created.id,
            content: chunkText,
          },
        });
      }
      console.log(`Seeded: ${doc.title}`);
    } else {
      console.log(`Already exists: ${doc.title}`);
    }
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

