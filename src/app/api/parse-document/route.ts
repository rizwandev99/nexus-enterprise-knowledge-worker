import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

// Document parsing is CPU/memory-intensive — stricter limit than the chat endpoint.
const PARSE_MAX_REQUESTS = 10; // 10 uploads per minute per IP

export async function POST(req: Request) {
  // ── Rate limiting ────────────────────────────────────────────────────────
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "anonymous";

  const rl = checkRateLimit(`parse-document:${ip}`, PARSE_MAX_REQUESTS);

  if (!rl.allowed) {
    return new Response(
      JSON.stringify({
        error: "Rate limit exceeded. Please wait before uploading more documents.",
        resetAt: rl.resetAt,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Limit": String(PARSE_MAX_REQUESTS),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(rl.resetAt),
          "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
        },
      }
    );
  }

  // ── Shared RateLimit headers for successful responses ────────────────────
  const rateLimitHeaders = {
    "X-RateLimit-Limit": String(PARSE_MAX_REQUESTS),
    "X-RateLimit-Remaining": String(rl.remaining),
    "X-RateLimit-Reset": String(rl.resetAt),
  };

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400, headers: rateLimitHeaders });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    let extractedText = "";

    const fileName = file.name.toLowerCase();

    if (fileName.endsWith(".pdf") || file.type === "application/pdf") {
      try {
        // Dynamic import of pdf-parse
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require("pdf-parse");
        const pdfData = await pdfParse(buffer);
        extractedText = pdfData.text || "";
      } catch (pdfErr) {
        console.warn("pdf-parse module error, using raw text extractor fallback:", pdfErr);
        // Fallback PDF text stream extractor for standard PDFs
        const rawString = buffer.toString("binary");
        const textBlocks: string[] = [];
        const matches = rawString.match(/\(([^()]*)\)\s*Tj/g) || rawString.match(/BT[\s\S]*?ET/g) || [];
        for (const match of matches) {
          const clean = match.replace(/\\/g, "").replace(/[()]/g, "").replace(/BT|ET|Tj/g, "").trim();
          if (clean.length > 2) textBlocks.push(clean);
        }
        extractedText = textBlocks.join("\n");
      }
    } else {
      // Text, Markdown, JSON, CSV, TS, JS, HTML, etc.
      extractedText = buffer.toString("utf-8");
    }

    // Sanitize null bytes (\0 / \u0000) which cause PostgreSQL "invalid byte sequence for encoding UTF8: 0x00" errors
    extractedText = extractedText.replace(/\0/g, "").replace(/\u0000/g, "");

    // Cap text to max 50,000 chars to avoid overflowing PostgreSQL stack depth limits & context windows
    const maxChars = 50000;
    if (extractedText.length > maxChars) {
      extractedText = extractedText.slice(0, maxChars) + `\n\n[Note: Document content truncated to ${maxChars} characters for performance]`;
    }

    if (!extractedText || !extractedText.trim()) {
      return NextResponse.json(
        { error: "Could not extract text content from document. The file may be empty or scanned image." },
        { status: 422, headers: rateLimitHeaders }
      );
    }

    return NextResponse.json(
      {
        filename: file.name,
        text: extractedText.trim(),
        size: file.size,
      },
      { headers: rateLimitHeaders }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to parse document";
    return NextResponse.json({ error: message }, { status: 500, headers: rateLimitHeaders });
  }
}
