// src/lib/db/hybrid-search.ts
// We will replace this with real PostgreSQL vector search later!
export async function executeHybridSearch(query: string) {
  return [
    {
      metadata: { title: "Sample Document", uri: "mock://sample" },
      content: "This is a mock document for testing our graph.",
    }
  ];
}
