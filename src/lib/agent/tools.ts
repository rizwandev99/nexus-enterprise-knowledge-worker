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

function extractSqlString(raw: unknown): string {
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (typeof obj.query === "string") return obj.query;
    if (typeof obj.input === "string") {
      try {
        const parsed = JSON.parse(obj.input);
        if (typeof parsed.query === "string") return parsed.query;
      } catch {
        return obj.input;
      }
      return obj.input;
    }
  }
  return String(raw || "");
}

export const executeSqlMutationTool = tool(
  async (args: { query: string } | unknown) => {
    const sqlString = extractSqlString(args);
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
    return `Successfully executed mutation: ${sqlString}`;
  },
  {
    name: "execute_sql_mutation",
    description: "Execute a direct SQL mutation (INSERT, UPDATE, DELETE) on the database. Calling this tool automatically triggers a Human-in-the-Loop (HITL) interrupt modal for user confirmation before execution. Never refuse or ask for approval in text prose; always formulate the valid SQL mutation and call this tool.",
    schema: z.object({
      query: z.string().describe("The SQL query to execute (INSERT, UPDATE, or DELETE on documents or document_chunks)"),
    }),
  }
);

export const executeSqlQueryTool = tool(
  async (args: { query: string } | unknown) => {
    const sqlString = extractSqlString(args);
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

export const webSearchTool = tool(
  async ({ query }: { query: string }) => {
    const trimmedQuery = (query || "").trim();
    if (!trimmedQuery) {
      return "No search query provided.";
    }

    try {
      // DuckDuckGo HTML endpoint requires POST with application/x-www-form-urlencoded
      let res = await fetch("https://html.duckduckgo.com/html/", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        body: `q=${encodeURIComponent(trimmedQuery)}`,
      });

      if (!res.ok) {
        // Fallback to lite endpoint if html endpoint is constrained
        res = await fetch("https://lite.duckduckgo.com/lite/", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          },
          body: `q=${encodeURIComponent(trimmedQuery)}`,
        });
      }

      if (!res.ok) {
        return `Web search service returned status ${res.status}. Falling back to internal knowledge base.`;
      }

      const html = await res.text();
      const resultBlocks = html.split(/class="result\s+results_links/);

      const cleanEntity = (str: string) => {
        return str
          .replace(/<[^>]+>/g, "")
          .replace(/&#x27;/g, "'")
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&nbsp;/g, " ")
          .replace(/\s+/g, " ")
          .trim();
      };

      const results: Array<{ title: string; snippet: string; url: string }> = [];
      for (let i = 1; i < Math.min(resultBlocks.length, 7); i++) {
        const block = resultBlocks[i];
        const linkMatch = block.match(/<a[^>]+class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
        const snippetMatch = block.match(/<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i);

        const title = linkMatch ? cleanEntity(linkMatch[2]) : "";
        const snippet = snippetMatch ? cleanEntity(snippetMatch[1]) : "";
        let rawUrl = linkMatch ? linkMatch[1] : "";

        if (rawUrl.includes("uddg=")) {
          const urlParam = rawUrl.split("uddg=")[1]?.split("&")[0];
          if (urlParam) {
            try {
              rawUrl = decodeURIComponent(urlParam);
            } catch {
              // keep rawUrl
            }
          }
        }

        if (title || snippet) {
          results.push({ title, snippet, url: rawUrl });
        }
      }

      if (results.length === 0) {
        return `No live web search results found for "${trimmedQuery}".`;
      }

      return JSON.stringify(results, null, 2);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return `Failed to execute live web search: ${errMsg}`;
    }
  },
  {
    name: "web_search",
    description: "Search the live Internet and public web using DuckDuckGo to retrieve real-time facts, current documentation, news, and external information with links and citations.",
    schema: z.object({
      query: z.string().describe("The search query or keyword phrase to find on the live web"),
    }),
  }
);

export const nativeTools = [addDocumentTool, executeSqlMutationTool, executeSqlQueryTool, webSearchTool];

