"use server";

import { PrismaClient } from "../../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { revalidatePath } from "next/cache";

// Initialize our database connection with the v7 adapter
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgrespassword@localhost:5432/nexus?schema=public",
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export async function seedDummyData() {
  await prisma.document.createMany({
    data: [
      {
        title: "Sample Document",
        content: "This is a mock document for testing our graph.",
      },
      {
        title: "Company Policies",
        content: "All employees must work from the office 3 days a week. Vacation days are 20 per year.",
      },
      {
        title: "Project Alpha Architecture",
        content: "Project Alpha uses Next.js 15, Tailwind v4, and PostgreSQL. It is a highly scalable enterprise application.",
      }
    ]
  });

  revalidatePath("/");
  return { success: true };
}
