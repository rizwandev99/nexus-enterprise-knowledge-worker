import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as instrumentation from '../instrumentation';
import * as vercelOtel from '@vercel/otel';

vi.mock('@vercel/otel', () => {
  function OTLPExporterMock() {
    return {};
  }
  return {
    registerOTel: vi.fn(),
    OTLPHttpProtoTraceExporter: OTLPExporterMock,
  };
});

describe('Next.js Instrumentation (Step 5.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should register OpenTelemetry only once when running on the server', async () => {
    await instrumentation.register();
    
    // Verify that registerOTel was called with the correct service name
    expect(vercelOtel.registerOTel).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceName: 'nexus-enterprise',
      })
    );
  });
});
