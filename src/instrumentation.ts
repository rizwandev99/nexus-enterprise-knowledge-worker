import { registerOTel, OTLPHttpProtoTraceExporter } from '@vercel/otel';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';

export function register() {
  const exporter = new OTLPHttpProtoTraceExporter({
    url: 'http://localhost:4318/v1/traces',
  });

  registerOTel({
    serviceName: 'nexus-enterprise',
    spanProcessors: [new BatchSpanProcessor(exporter)],
  });
}
