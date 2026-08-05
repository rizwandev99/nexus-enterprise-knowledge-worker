import { prisma } from "./prisma";

export async function executeHybridSearch(query: string) {
  // Temporary: Until vector embeddings are fully implemented, 
  // simply fetch up to 5 documents from the database
  const docs = await prisma.document.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' }
  });

  return docs.map(doc => ({
    metadata: { 
      id: doc.id,
      title: doc.title, 
      uri: `doc://${doc.id}` 
    },
    content: doc.content,
  }));
}
