import "dotenv/config";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

// Prisma v7 Required Imports
import { PrismaClient } from "../../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

// Initialize our database connection with the v7 adapter
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgrespassword@localhost:5432/nexus?schema=public",
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Create the MCP Server
const server = new Server(
  {
    name: "nexus-database-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 1. Define what tools this server provides to the AI
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "add_document",
        description: "Add a new document to the enterprise knowledge base",
        inputSchema: {
          type: "object",
          properties: {
            title: { type: "string" },
            content: { type: "string" },
          },
          required: ["title", "content"],
        },
      },
    ],
  };
});

// 2. Define exactly what happens when the AI calls our tools
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "add_document") {
    const { title, content } = request.params.arguments as any;

    // Use Prisma to safely save the data to our PostgreSQL database
    const doc = await prisma.document.create({
      data: {
        title: title,
        content: content,
      },
    });

    // Return a success message back to the AI
    return {
      content: [
        {
          type: "text",
          text: `Successfully added document with ID: ${doc.id}`,
        },
      ],
    };
  }

  throw new Error(`Tool not found: ${request.params.name}`);
});

// 3. Start the server using standard input/output (stdio) so the AI can communicate with it
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Nexus MCP Server running on stdio");
}

main().catch(console.error);
