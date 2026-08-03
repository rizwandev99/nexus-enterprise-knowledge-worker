export async function GET() {
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  (async () => {
    writer.write(encoder.encode(`0:"Hello "\\n`));
    writer.write(encoder.encode(`9:[{"toolCallId": "call_1", "toolName": "search_db", "args": {"q": "test"}}]\\n`));
    writer.write(encoder.encode(`2:[{"my_custom": "annotation"}]\\n`));
    writer.write(encoder.encode(`8:[{"type": "data_part"}]\\n`));
    writer.write(encoder.encode(`a:[{"toolCallId": "call_1", "result": "found 5 items"}]\\n`));
    writer.write(encoder.encode(`0:"World!"\\n`));
    await writer.close();
  })();

  return new Response(stream.readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "x-vercel-ai-data-stream": "v1" },
  });
}
