import { describe, it, expect, vi, beforeEach } from 'vitest';
import { server } from '../server';
import { CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";

// We need to mock the PrismaClient since it relies on a real DB connection
vi.mock('../../generated/prisma/client.js', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  })),
}));

describe('MCP Server', () => {
  it('should register the execute_sql_mutation tool', async () => {
    // In @modelcontextprotocol/sdk, the request handlers are stored internally.
    // We can test the handler by manually invoking it.
    
    // We will verify that calling the tool with a test query returns success.
    const result = await server.request(
      {
        method: 'tools/call',
        params: {
          name: 'execute_sql_mutation',
          arguments: {
            query: 'INSERT INTO test VALUES (1)',
          }
        }
      },
      CallToolRequestSchema
    ) as any;

    expect(result.content).toBeDefined();
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toContain('Successfully executed mutation: INSERT INTO test VALUES (1)');
  });
});
