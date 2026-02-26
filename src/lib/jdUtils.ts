/**
 * Strip emojis and figure/diagram placeholders from generated JD text.
 */
export function cleanJdText(text: string): string {
  if (!text || typeof text !== "string") return "";
  let out = text;
  // Remove emoji (common unicode ranges)
  out = out.replace(
    /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F1E0}-\u{1F1FF}\u{2300}-\u{23FF}\u{2B50}\u{2705}\u{274C}\u{274E}\u{2753}-\u{2755}\u{2795}-\u{2797}\u{27A1}\u{27B0}\u{27BF}\u{2934}\u{2935}\u{3030}\u{303D}\u{3297}\u{3299}]/gu,
    ""
  );
  // Remove "Figure X", "[Figure X]", "Fig. X", "[Insert figure]", etc.
  out = out.replace(/\n?\s*\[?\s*(Figure|Fig\.?|Diagram)\s*\d*\]?\s*:?\s*\[?[^\]]*\]?\s*\n?/gi, "\n");
  out = out.replace(/\n?\s*\(?\s*(Figure|Fig\.?|Diagram)\s*\d*\s*\)?\s*\n?/gi, "\n");
  out = out.replace(/\n{3,}/g, "\n\n");
  return out.trim();
}

export async function extractTextFromPdf(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  try {
    const mod = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
    if (mod?.default) pdfjsLib.GlobalWorkerOptions.workerSrc = mod.default;
  } catch (_) {
    try {
      const mod = await import("pdfjs-dist/build/pdf.worker.mjs?url");
      if (mod?.default) pdfjsLib.GlobalWorkerOptions.workerSrc = mod.default;
    } catch (_2) {}
  }
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const parts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((it: { str?: string }) => it.str || "").join(" ");
    parts.push(text);
  }
  return parts.join("\n\n");
}

export async function extractTextFromDocx(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value || "";
}

export async function readFileAsText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return extractTextFromPdf(file);
  if (name.endsWith(".docx") || name.endsWith(".doc")) return extractTextFromDocx(file);
  if (file.type.includes("text") || name.endsWith(".txt")) {
    return file.text();
  }
  throw new Error("Unsupported format. Use PDF, Word (.doc/.docx), or plain text.");
}
