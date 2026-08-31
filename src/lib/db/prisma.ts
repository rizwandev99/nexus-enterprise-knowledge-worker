import { PrismaClient } from "../../../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgrespassword@localhost:5432/nexus?schema=public";
const isCloudDb =
  connectionString.includes("prisma.io") ||
  connectionString.includes("sslmode=require");

const globalForDb = globalThis as unknown as {
  pool: pg.Pool | undefined;
  prisma: PrismaClient | undefined;
};

export const pool =
  globalForDb.pool ??
  new pg.Pool({
    connectionString,
    ssl: isCloudDb ? { rejectUnauthorized: false } : false,
    max: process.env.NODE_ENV === "production" ? 3 : 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000,
    allowExitOnIdle: true,
  });

const adapter = new PrismaPg(pool);

export const prisma = globalForDb.prisma ?? new PrismaClient({ adapter });

globalForDb.pool = pool;
globalForDb.prisma = prisma;

