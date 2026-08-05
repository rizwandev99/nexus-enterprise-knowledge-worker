import { describe, it, expect, vi, beforeEach } from 'vitest';
import { addDocumentTool, executeSqlMutationTool, nativeTools } from '../tools';

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

// Mock PrismaClient module
vi.mock('../../../../generated/prisma/client', () => {
  const mockCreate = vi.fn().mockResolvedValue({
    id: 'test-doc-id-123',
    title: 'Test Title',
    content: 'Test Content',
    createdAt: new Date(),
  });
  function PrismaClientMock() {
    return {
      document: {
        create: mockCreate,
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

    it('should successfully invoke and add a document', async () => {
      const result = await addDocumentTool.invoke({
        title: 'Test Document Title',
        content: 'Test Document Content',
      });

      expect(result).toContain('Successfully added document with ID: test-doc-id-123');
    });
  });

  describe('executeSqlMutationTool', () => {
    it('should have correct name and description metadata', () => {
      expect(executeSqlMutationTool.name).toBe('execute_sql_mutation');
      expect(executeSqlMutationTool.description).toBe('Execute a direct SQL mutation on the database (DANGEROUS)');
    });

    it('should successfully invoke and execute a SQL mutation', async () => {
      const result = await executeSqlMutationTool.invoke({
        query: 'UPDATE users SET status = "active" WHERE id = 1',
      });

      expect(result).toBe('Successfully executed mutation: UPDATE users SET status = "active" WHERE id = 1');
    });
  });

  describe('nativeTools array', () => {
    it('should export nativeTools array containing both tools', () => {
      expect(nativeTools).toHaveLength(2);
      expect(nativeTools).toContain(addDocumentTool);
      expect(nativeTools).toContain(executeSqlMutationTool);
    });
  });
});
