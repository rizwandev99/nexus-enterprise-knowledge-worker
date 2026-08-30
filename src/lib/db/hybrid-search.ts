import { pool } from "./prisma";
import { OpenAIEmbeddings } from "@langchain/openai";

export async function executeHybridSearch(query: string) {
  // Strip attachment metadata blocks and cap search query length to 500 chars to avoid PostgreSQL plainto_tsquery stack overflow
  const cleanQuery = (query || "").split("[ATTACHED DOCUMENT:")[0].trim().slice(0, 500);
  if (!cleanQuery) return [];

  let vectorResults: Array<{ id: string; score: number }> = [];

  try {
    const embeddings = new OpenAIEmbeddings();
    const queryEmbedding = await embeddings.embedQuery(cleanQuery);
    
    // Step 2: Vector search using the match_hybrid_chunks function
    const vectorRes = await pool.query(
      `SELECT "documentId" as id, similarity as score FROM match_hybrid_chunks($1::vector, 20)`,
      [`[${queryEmbedding.join(",")}]`]
    );
    vectorResults = vectorRes.rows;
  } catch (error) {
    console.warn("Embeddings failed, falling back to keyword search only", error);
  }

  // Step 3: Full-text keyword search
  const keywordRes = await pool.query(
    `SELECT id, ts_rank(to_tsvector('english', content), plainto_tsquery('english', $1)) as score 
     FROM documents 
     WHERE to_tsvector('english', content) @@ plainto_tsquery('english', $1)
     ORDER BY score DESC LIMIT 20`,
    [cleanQuery]
  );
  
  // Step 4: Reciprocal Rank Fusion (RRF)
  const k = 60;
  const rrfScores = new Map<string, number>();

  vectorResults.forEach((res, index) => {
    const rank = index + 1;
    rrfScores.set(res.id, 1 / (k + rank));
  });

  keywordRes.rows.forEach((res, index) => {
    const rank = index + 1;
    const currentScore = rrfScores.get(res.id) || 0;
    rrfScores.set(res.id, currentScore + (1 / (k + rank)));
  });

  const sortedDocIds = Array.from(rrfScores.entries())
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0])
    .slice(0, 5); // Return the top 5 results

  if (sortedDocIds.length === 0) {
    return [];
  }

  // Fetch final documents
  const finalDocsRes = await pool.query(
    `SELECT id, title, content FROM documents WHERE id = ANY($1)`,
    [sortedDocIds]
  );

  const docsMap = new Map(finalDocsRes.rows.map(d => [d.id, d]));
  
  const results = [];
  for (const id of sortedDocIds) {
    const doc = docsMap.get(id);
    if (doc) {
      results.push({
        metadata: {
          id: doc.id,
          title: doc.title,
          uri: `doc://${doc.id}`
        },
        content: doc.content
      });
    }
  }

  return results;
}
