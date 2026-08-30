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

export async function executeHybridSearch(query: string) {
  // Strip attachment metadata blocks and cap search query length to 500 chars
  const cleanQuery = (query || "").split("[ATTACHED DOCUMENT:")[0].trim().slice(0, 500);
  if (!cleanQuery) return [];

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

  const sortedDocIds = Array.from(rrfScores.entries())
    .sort((a, b) => b[1] - a[1])
    .map((entry) => entry[0])
    .slice(0, 5); // Return the top 5 results

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

