import { pool } from "./prisma";
import { OpenAIEmbeddings } from "@langchain/openai";

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "in", "on", "at", "to", "for", "of", "with",
  "by", "from", "up", "about", "into", "over", "after", "is", "are", "was",
  "were", "be", "been", "being", "have", "has", "had", "do", "does", "did",
  "what", "which", "who", "whom", "this", "that", "these", "those", "how",
  "why", "when", "where", "can", "could", "will", "would", "should", "tell",
  "me", "give", "show", "please", "i", "you", "we", "they", "it"
]);

const CORE_ENTERPRISE_DOCS = [
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
- ARR (Annual Recurring Revenue): $48.2 Million (+34% Year-over-Year growth).
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

let isSeededInMemory = false;

/**
 * Disaster-proof auto-seeding hook:
 * Ensures the PostgreSQL database always contains the 3 core enterprise governance documents.
 */
export async function ensureDocumentsSeeded() {
  if (isSeededInMemory) return;
  try {
    const countRes = await pool.query(`SELECT count(*)::int as count FROM documents`);
    const count = countRes.rows[0]?.count || 0;
    if (count > 0) {
      isSeededInMemory = true;
      return;
    }

    console.info("[hybrid-search] Database documents table is empty. Auto-seeding 3 core enterprise governance documents...");
    for (const doc of CORE_ENTERPRISE_DOCS) {
      const insertRes = await pool.query(
        `INSERT INTO documents ("id", "title", "content", "createdAt", "updatedAt") 
         VALUES (gen_random_uuid(), $1, $2, NOW(), NOW()) 
         RETURNING id`,
        [doc.title, doc.content]
      );
      const docId = insertRes.rows[0]?.id;
      if (docId) {
        const chunkSize = 800;
        for (let i = 0; i < doc.content.length; i += chunkSize) {
          const chunkText = doc.content.slice(i, i + chunkSize);
          await pool.query(
            `INSERT INTO document_chunks ("id", "documentId", "content", "createdAt") 
             VALUES (gen_random_uuid(), $1, $2, NOW())`,
            [docId, chunkText]
          );
        }
      }
    }
    isSeededInMemory = true;
    console.info("[hybrid-search] Auto-seeding complete. 3 enterprise documents persisted.");
  } catch (seedErr) {
    console.warn("[hybrid-search] Auto-seeding verification failed (non-fatal):", seedErr);
  }
}

export async function executeHybridSearch(query: string) {
  // Strip attachment metadata blocks and cap search query length to 500 chars
  const cleanQuery = (query || "").split("[ATTACHED DOCUMENT:")[0].trim().slice(0, 500);
  if (!cleanQuery) return [];

  // Disaster-proof check: guarantee enterprise docs exist in PostgreSQL
  await ensureDocumentsSeeded();

  let vectorResults: Array<{ id: string; score: number }> = [];

  // Step 1: Vector search using pgvector cosine similarity if OpenAI credentials exist
  if (process.env.OPENAI_API_KEY) {
    try {
      const embeddings = new OpenAIEmbeddings();
      const queryEmbedding = await embeddings.embedQuery(cleanQuery);
      
      const vectorRes = await pool.query(
        `SELECT "documentId" as id, similarity as score FROM match_hybrid_chunks($1::vector, 20)`,
        [`[${queryEmbedding.join(",")}]`]
      );
      vectorResults = vectorRes.rows;
    } catch (error) {
      console.warn("Embeddings lookup failed, falling back to keyword search only", error);
    }
  }

  // Step 2: Full-text keyword search using PostgreSQL tsvector + ts_rank
  // Extract meaningful tokens for ranked search across document title & content
  const tokens = cleanQuery
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));

  let keywordRows: Array<{ id: string; score: number }> = [];

  if (tokens.length > 0) {
    const orTsQuery = tokens.map((t) => `${t.replace(/[^a-zA-Z0-9]/g, "")}:*`).filter((t) => t !== ":*").join(" | ");

    if (orTsQuery) {
      try {
        const keywordRes = await pool.query(
          `SELECT id, ts_rank(to_tsvector('english', title || ' ' || content), to_tsquery('english', $1)) as score 
           FROM documents 
           WHERE to_tsvector('english', title || ' ' || content) @@ to_tsquery('english', $1)
           ORDER BY score DESC LIMIT 20`,
          [orTsQuery]
        );
        keywordRows = keywordRes.rows;
      } catch (err) {
        console.warn("to_tsquery search failed, attempting plainto_tsquery fallback:", err);
      }
    }
  }

  // Fallback to plainto_tsquery if tokenized search returned no rows
  if (keywordRows.length === 0) {
    try {
      const fallbackRes = await pool.query(
        `SELECT id, ts_rank(to_tsvector('english', title || ' ' || content), plainto_tsquery('english', $1)) as score 
         FROM documents 
         WHERE to_tsvector('english', title || ' ' || content) @@ plainto_tsquery('english', $1)
         ORDER BY score DESC LIMIT 20`,
        [cleanQuery]
      );
      keywordRows = fallbackRes.rows;
    } catch {
      // Ignore fallback failure
    }
  }

  // Step 3: Reciprocal Rank Fusion (RRF with k=60)
  const k = 60;
  const rrfScores = new Map<string, number>();

  vectorResults.forEach((res, index) => {
    const rank = index + 1;
    rrfScores.set(res.id, 1 / (k + rank));
  });

  keywordRows.forEach((res, index) => {
    const rank = index + 1;
    const currentScore = rrfScores.get(res.id) || 0;
    rrfScores.set(res.id, currentScore + 1 / (k + rank));
  });

  let sortedDocIds = Array.from(rrfScores.entries())
    .sort((a, b) => b[1] - a[1])
    .map((entry) => entry[0])
    .slice(0, 5); // Return the top 5 results

  // Fallback: If no direct RRF match was found (e.g. unique natural phrasing), retrieve top enterprise documents
  if (sortedDocIds.length === 0) {
    try {
      const fallbackAll = await pool.query(`SELECT id FROM documents ORDER BY "createdAt" DESC LIMIT 3`);
      sortedDocIds = fallbackAll.rows.map((r) => r.id);
    } catch {
      // ignore
    }
  }

  if (sortedDocIds.length === 0) {
    return [];
  }

  // Step 4: Fetch final document records
  const finalDocsRes = await pool.query(
    `SELECT id, title, content FROM documents WHERE id = ANY($1)`,
    [sortedDocIds]
  );

  const docsMap = new Map(finalDocsRes.rows.map((d) => [d.id, d]));

  const results = [];
  for (const id of sortedDocIds) {
    const doc = docsMap.get(id);
    if (doc) {
      results.push({
        metadata: {
          id: doc.id,
          title: doc.title,
          uri: `doc://${doc.id}`,
        },
        content: doc.content,
      });
    }
  }

  return results;
}

