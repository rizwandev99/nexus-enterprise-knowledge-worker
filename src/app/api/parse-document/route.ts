import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
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
        { status: 422 }
      );
    }

    return NextResponse.json({
      filename: file.name,
      text: extractedText.trim(),
      size: file.size,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to parse document";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
