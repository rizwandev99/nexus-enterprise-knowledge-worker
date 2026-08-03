export async function POST(req: Request) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`0:"[APPROVAL_REQUEST]{\\\"name\\\":\\\"execute_sql_mutation\\\",\\\"args\\\":{\\\"query\\\":\\\"INSERT INTO documents (title, content) VALUES ('Sample Document', 'This is a mock document for testing our graph.')\\\"},\\\"id\\\":\\\"827281pny\\\",\\\"type\\\":\\\"tool_call\\\"}"\n`));
      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "x-vercel-ai-data-stream": "v1",
    },
  });
}
