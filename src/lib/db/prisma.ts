import { PrismaClient } from "../../../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgrespassword@localhost:5432/nexus?schema=public";
const isCloudDb = connectionString.includes("prisma.io") || connectionString.includes("sslmode=require");

export const pool = new pg.Pool({
  connectionString,
  ssl: isCloudDb ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 10000,
});

const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
