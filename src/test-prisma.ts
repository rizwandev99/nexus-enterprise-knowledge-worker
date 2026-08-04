import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

async function main() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgrespassword@localhost:5432/nexus?schema=public",
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const query = "INSERT INTO test (id) VALUES (4);";
    console.log("Type of query:", typeof query);
    await prisma.$executeRawUnsafe(query);
    console.log("Success");
  } catch (error: any) {
    console.error("Prisma error:", error.message);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
