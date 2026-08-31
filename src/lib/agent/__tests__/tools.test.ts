import { describe, it, expect, vi, beforeEach } from 'vitest';
import { addDocumentTool, executeSqlMutationTool, executeSqlQueryTool, nativeTools } from '../tools';

// Mock pg module before importing or executing tools
vi.mock('pg', () => {
  const queryMock = vi.fn().mockResolvedValue({ rows: [], rowCount: 1 });
  function PoolMock() {
    return {
      query: queryMock,
    };
  }
  return {
    default: {
      Pool: PoolMock,
    },
    Pool: PoolMock,
  };
});

// Mock PrismaClient module with vi.hoisted so variables are accessible after hoisting
const { mockCreate, mockCreateManyChunks } = vi.hoisted(() => {
  return {
    mockCreate: vi.fn().mockResolvedValue({
      id: 'test-doc-id-123',
      title: 'Test Title',
      content: 'Test Content',
      createdAt: new Date(),
    }),
    mockCreateManyChunks: vi.fn().mockResolvedValue({ count: 1 }),
  };
});

vi.mock('../../../../generated/prisma/client', () => {
  function PrismaClientMock() {
    return {
      document: {
        create: mockCreate,
      },
      documentChunk: {
        createMany: mockCreateManyChunks,
      },
    };
  }
  return {
    PrismaClient: PrismaClientMock,
  };
});

describe('Native Agent Tools (Milestone 2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addDocumentTool', () => {
    it('should have correct name and description metadata', () => {
      expect(addDocumentTool.name).toBe('add_document');
      expect(addDocumentTool.description).toBe('Add a new document to the enterprise knowledge base');
    });

    it('should successfully invoke and add a document with batch chunk indexing', async () => {
      const result = await addDocumentTool.invoke({
        title: 'Test Title',
        content: 'Test Document Content that will be chunked and indexed.',
      });

      expect(result).toContain('Successfully added document "Test Title" with ID: test-doc-id-123');
      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          title: 'Test Title',
          content: 'Test Document Content that will be chunked and indexed.',
        },
      });
      expect(mockCreateManyChunks).toHaveBeenCalledWith({
        data: [
          {
            documentId: 'test-doc-id-123',
            content: 'Test Document Content that will be chunked and indexed.',
          },
        ],
      });
    });
  });

  describe('executeSqlMutationTool', () => {
    it('should have correct name and description metadata', () => {
      expect(executeSqlMutationTool.name).toBe('execute_sql_mutation');
      expect(executeSqlMutationTool.description).toContain('Execute a direct SQL mutation');
      expect(executeSqlMutationTool.description).toContain('Human-in-the-Loop (HITL)');
    });

    it('should successfully invoke and execute a SQL mutation on documents table', async () => {
      const result = await executeSqlMutationTool.invoke({
        query: "UPDATE documents SET content = 'updated content' WHERE id = 'test-doc-123'",
      });

      expect(result).toBe("Successfully executed mutation: UPDATE documents SET content = 'updated content' WHERE id = 'test-doc-123'");
    });

    it('should successfully invoke and execute a SQL mutation on document_chunks table', async () => {
      const result = await executeSqlMutationTool.invoke({
        query: "DELETE FROM document_chunks WHERE id = 'chunk-123'",
      });

      expect(result).toBe("Successfully executed mutation: DELETE FROM document_chunks WHERE id = 'chunk-123'");
    });

    it('should reject mutations on non-whitelisted tables (e.g., users)', async () => {
      await expect(
        executeSqlMutationTool.invoke({ query: 'UPDATE users SET status = "active" WHERE id = 1' })
      ).rejects.toThrow(/Security Error: Table 'users' is not permitted/i);
    });

    it('should explicitly block mutations targeting system or state tables (checkpoints, messages, etc.)', async () => {
      await expect(
        executeSqlMutationTool.invoke({ query: "UPDATE checkpoints SET metadata = '{}' WHERE thread_id = '1'" })
      ).rejects.toThrow(/Security Error: Access to system or state table/i);

      await expect(
        executeSqlMutationTool.invoke({ query: "DELETE FROM messages WHERE id = '123'" })
      ).rejects.toThrow(/Security Error: Access to system or state table/i);

      await expect(
        executeSqlMutationTool.invoke({ query: "UPDATE chat_sessions SET title = 'hacked' WHERE id = '1'" })
      ).rejects.toThrow(/Security Error: Access to system or state table/i);

      await expect(
        executeSqlMutationTool.invoke({ query: "INSERT INTO checkpoint_blobs (id) VALUES ('1')" })
      ).rejects.toThrow(/Security Error: Access to system or state table/i);

      await expect(
        executeSqlMutationTool.invoke({ query: "UPDATE information_schema.tables SET table_name = 'x'" })
      ).rejects.toThrow(/Security Error: Access to system or state table/i);

      await expect(
        executeSqlMutationTool.invoke({ query: "UPDATE pg_catalog.pg_tables SET tablename = 'x'" })
      ).rejects.toThrow(/Security Error: Access to system or state table/i);
    });

    it('should reject C-style multi-line comments and single-line comments', async () => {
      await expect(
        executeSqlMutationTool.invoke({ query: "UPDATE documents " + "/* inject comment */" + " SET content = 'hack'" })
      ).rejects.toThrow(/Security Error: SQL comments/i);

      await expect(
        executeSqlMutationTool.invoke({ query: "UPDATE documents SET content = 'test' -- comment" })
      ).rejects.toThrow(/Security Error: SQL comments/i);
    });

    it('should reject dollar-quoted strings ($$)', async () => {
      await expect(
        executeSqlMutationTool.invoke({ query: "UPDATE documents SET content = " + "$$evil payload$$" + " WHERE id = '1'" })
      ).rejects.toThrow(/Security Error: Dollar-quoted strings/i);
    });

    it('should reject DDL statements (e.g., DROP TABLE)', async () => {
      await expect(
        executeSqlMutationTool.invoke({ query: 'DROP TABLE documents;' })
      ).rejects.toThrow(/Security Error:/i);
    });

    it('should reject multiple semicolon-separated SQL statements', async () => {
      await expect(
        executeSqlMutationTool.invoke({ query: "UPDATE documents SET title = 'test'; DELETE FROM documents;" })
      ).rejects.toThrow(/Security Error: Multiple statements are not allowed/i);
    });
  });

  describe('executeSqlQueryTool', () => {
    it('should have correct name and description metadata', () => {
      expect(executeSqlQueryTool.name).toBe('execute_sql_query');
      expect(executeSqlQueryTool.description).toBe('Execute a read-only SQL SELECT query on the database to fetch data.');
    });

    it('should reject non-SELECT statements', async () => {
      await expect(
        executeSqlQueryTool.invoke({ query: 'DELETE FROM documents' })
      ).rejects.toThrow('Validation Error: Only SELECT statements are allowed.');
    });
  });

  describe('nativeTools array', () => {
    it('should export nativeTools array containing all tools', () => {
      expect(nativeTools).toHaveLength(3);
      expect(nativeTools).toContain(addDocumentTool);
      expect(nativeTools).toContain(executeSqlMutationTool);
      expect(nativeTools).toContain(executeSqlQueryTool);
    });
  });
});
