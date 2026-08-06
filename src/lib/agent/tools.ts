import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { prisma, pool } from "../db/prisma";

export const addDocumentTool = tool(
  async ({ title, content }: { title: string; content: string }) => {
    const doc = await prisma.document.create({
      data: {
        title,
        content,
      },
    });

    return `Successfully added document with ID: ${doc.id}`;
  },
  {
    name: "add_document",
    description: "Add a new document to the enterprise knowledge base",
    schema: z.object({
      title: z.string().describe("Title of the document"),
      content: z.string().describe("Content of the document"),
    }),
  }
);

export const executeSqlMutationTool = tool(
  async ({ query }: { query: string }) => {
    const sqlString = typeof query === "string" ? query : String(query);
    const upperQuery = sqlString.trim().toUpperCase();

    // 1. Only allow DML
    if (
      !upperQuery.startsWith("INSERT") &&
      !upperQuery.startsWith("UPDATE") &&
      !upperQuery.startsWith("DELETE")
    ) {
      throw new Error("Validation Error: Only INSERT, UPDATE, and DELETE statements are allowed.");
    }

    // 2. Block DDL
    const ddlKeywords = ["DROP ", "CREATE ", "ALTER ", "TRUNCATE ", "GRANT ", "REVOKE "];
    if (ddlKeywords.some((keyword) => upperQuery.includes(keyword))) {
      throw new Error("Validation Error: DDL statements are not allowed.");
    }

    // 3. Block dangerous patterns
    if (sqlString.includes("--")) {
      throw new Error("Validation Error: SQL comments (--) are not allowed.");
    }
    
    // Block multi-statement queries (semicolon followed by anything other than whitespace)
    const statements = sqlString.split(";").filter(s => s.trim().length > 0);
    if (statements.length > 1) {
      throw new Error("Validation Error: Multiple statements are not allowed.");
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

export const nativeTools = [addDocumentTool, executeSqlMutationTool];
