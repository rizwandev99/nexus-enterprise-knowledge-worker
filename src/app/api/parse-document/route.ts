import { NextResponse } from "next/server";

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
