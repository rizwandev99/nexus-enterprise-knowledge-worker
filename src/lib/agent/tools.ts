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
