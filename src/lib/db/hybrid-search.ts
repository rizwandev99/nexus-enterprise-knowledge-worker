import { PrismaClient } from "../../../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgrespassword@localhost:5432/nexus?schema=public",
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

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
