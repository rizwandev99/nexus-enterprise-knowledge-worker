import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { prisma, pool } from "../db/prisma";

export const addDocumentTool = tool(
  async ({ title, content }: { title: string; content: string }) => {
    const cleanTitle = (title || "").replace(/\0/g, "").replace(/\u0000/g, "");
    const cleanContent = (content || "").replace(/\0/g, "").replace(/\u0000/g, "");

    const doc = await prisma.document.create({
      data: {
        title: cleanTitle,
        content: cleanContent,
      },
    });

    try {
      // Chunk content into ~1000 char blocks for chunk search indexing
      const chunkSize = 1000;
      const chunkRecords: { documentId: string; content: string }[] = [];
      for (let i = 0; i < cleanContent.length; i += chunkSize) {
        chunkRecords.push({
          documentId: doc.id,
          content: cleanContent.slice(i, i + chunkSize),
        });
      }

      if (chunkRecords.length > 0) {
        await prisma.documentChunk.createMany({
          data: chunkRecords,
        });
      }
    } catch (chunkErr) {
      console.warn("Notice: Document saved, chunk indexing skipped:", chunkErr);
    }

    return `Successfully added document "${doc.title}" with ID: ${doc.id}`;
  },
  {
    name: "add_document",
    description: "Add a new document to the enterprise knowledge base",
    schema: z.object({
      title: z.string().describe("Title of the document"),
      content: z.string().describe("Full extracted text content of the document"),
    }),
  }
);

const BLOCKED_SYSTEM_TARGETS = [
  "checkpoints",
  "checkpoint_blobs",
  "checkpoint_writes",
  "checkpoint_migrations",
  "chat_sessions",
  "messages",
  "information_schema",
  "pg_",
];

const ALLOWED_TABLES = ["documents", "document_chunks"];

export const executeSqlMutationTool = tool(
  async ({ query }: { query: string }) => {
    const sqlString = typeof query === "string" ? query : String(query);
    const trimmedQuery = sqlString.trim();
    const upperQuery = trimmedQuery.toUpperCase();
    const lowerQuery = trimmedQuery.toLowerCase();

    // 1. Only allow DML
    if (
      !upperQuery.startsWith("INSERT") &&
      !upperQuery.startsWith("UPDATE") &&
      !upperQuery.startsWith("DELETE")
    ) {
      throw new Error("Security Error: Only INSERT, UPDATE, and DELETE statements are allowed.");
    }

    // 2. Block DDL keywords
    const ddlKeywords = ["DROP ", "CREATE ", "ALTER ", "TRUNCATE ", "GRANT ", "REVOKE "];
    if (ddlKeywords.some((keyword) => upperQuery.includes(keyword))) {
      throw new Error("Security Error: DDL statements are not allowed.");
    }

    // 3. Block SQL comments (-- and /* */) and dollar-quoted strings ($$)
    if (sqlString.includes("--") || sqlString.includes("/*") || sqlString.includes("*/")) {
      throw new Error("Security Error: SQL comments are not allowed.");
    }
    if (sqlString.includes("$$")) {
      throw new Error("Security Error: Dollar-quoted strings ($$) are not allowed.");
    }

    // 4. Block multi-statement queries
    const statements = sqlString.split(";").filter((s) => s.trim().length > 0);
    if (statements.length > 1) {
      throw new Error("Security Error: Multiple statements are not allowed.");
    }

    // 5. Block explicit system or state tables
    for (const blocked of BLOCKED_SYSTEM_TARGETS) {
      if (lowerQuery.includes(blocked)) {
        throw new Error(`Security Error: Access to system or state table/schema '${blocked}' is strictly prohibited.`);
      }
    }

    // 6. Enforce Table Whitelisting: target table MUST be documents or document_chunks
    const match = trimmedQuery.match(/^(?:INSERT\s+INTO|UPDATE|DELETE\s+(?:FROM\s+)?)\s*["`']?([a-zA-Z0-9_]+)["`']?/i);
    if (!match) {
      throw new Error("Security Error: Could not determine valid target table for mutation.");
    }

    const targetTable = match[1].toLowerCase();
    if (!ALLOWED_TABLES.includes(targetTable)) {
      throw new Error(`Security Error: Table '${targetTable}' is not permitted. Mutations are strictly restricted to 'documents' and 'document_chunks'.`);
    }

    await pool.query(sqlString);
    return `Successfully executed mutation: ${query}`;
  },
  {
    name: "execute_sql_mutation",
    description: "Execute a direct SQL mutation on the database (DANGEROUS)",
    schema: z.object({
      query: z.string().describe("The SQL query to execute"),
    }),
  }
);

export const executeSqlQueryTool = tool(
  async ({ query }: { query: string }) => {
    const sqlString = typeof query === "string" ? query : String(query);
    const upperQuery = sqlString.trim().toUpperCase();

    // 1. Only allow SELECT
    if (!upperQuery.startsWith("SELECT")) {
      throw new Error("Validation Error: Only SELECT statements are allowed.");
    }

    // Block multi-statement queries (semicolon followed by anything other than whitespace)
    const statements = sqlString.split(";").filter(s => s.trim().length > 0);
    if (statements.length > 1) {
      throw new Error("Validation Error: Multiple statements are not allowed.");
    }

    const result = await pool.query(sqlString);
    return JSON.stringify(result.rows);
  },
  {
    name: "execute_sql_query",
    description: "Execute a read-only SQL SELECT query on the database to fetch data.",
    schema: z.object({
      query: z.string().describe("The SQL SELECT query to execute"),
    }),
  }
);

export const nativeTools = [addDocumentTool, executeSqlMutationTool, executeSqlQueryTool];
