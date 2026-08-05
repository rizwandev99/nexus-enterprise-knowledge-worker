import { prisma } from "@/lib/db/prisma";
import { ChatGroq } from "@langchain/groq";

export async function GET() {
  const diagnostics: Record<string, any> = {
    timestamp: new Date().toISOString(),
    env: {
      HAS_DATABASE_URL: !!process.env.DATABASE_URL,
      HAS_GROQ_API_KEY: !!process.env.GROQ_API_KEY,
      GROQ_KEY_PREFIX: process.env.GROQ_API_KEY ? process.env.GROQ_API_KEY.substring(0, 7) : "MISSING",
      HAS_LANGSMITH_API_KEY: !!process.env.LANGSMITH_API_KEY,
    },
    db: { status: "pending" },
    groq: { status: "pending" },
  };

  // Test Database
  try {
    const sessionCount = await prisma.chatSession.count();
    diagnostics.db = { status: "ok", sessionCount };
  } catch (err: any) {
    diagnostics.db = { status: "error", message: err?.message, stack: err?.stack };
  }

  // Test Groq LLM
  try {
    if (!process.env.GROQ_API_KEY) {
      diagnostics.groq = { status: "error", message: "GROQ_API_KEY environment variable is not defined" };
    } else {
      const model = new ChatGroq({
        model: "llama-3.3-70b-versatile",
        temperature: 0,
        apiKey: process.env.GROQ_API_KEY,
      });
      const res = await model.invoke("say test");
      diagnostics.groq = { status: "ok", response: typeof res.content === "string" ? res.content : JSON.stringify(res.content) };
    }
  } catch (err: any) {
    diagnostics.groq = { status: "error", message: err?.message, stack: err?.stack };
  }

  return new Response(JSON.stringify(diagnostics, null, 2), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
