function pdfText(line: string): string {
  let out = "";
  for (const char of line) {
    const code = char.charCodeAt(0);
    if (char === "\\" || char === "(" || char === ")") out += `\\${char}`;
    else if (code >= 32 && code <= 126) out += char;
    else out += "?";
  }
  return out;
}

function pageStream(lines: string[]): string {
  const commands = ["BT", "/F1 11 Tf", "48 790 Td", "16 TL"];
  lines.forEach((line, index) => {
    if (index === 0) commands.push(`(${pdfText(line)}) Tj`);
    else commands.push(`T* (${pdfText(line)}) Tj`);
  });
  commands.push("ET");
  return commands.join("\n");
}

export function buildTicketPdf(lines: string[]): Uint8Array {
  const chunks: string[][] = [];
  for (let index = 0; index < lines.length; index += 40) chunks.push(lines.slice(index, index + 40));
  if (chunks.length === 0) chunks.push(["Amaria Bakery"]);

  const objects: string[] = [];
  const pageIds: number[] = [];
  let nextId = 3;
  const fontId = 3 + chunks.length * 2;
  for (const chunk of chunks) {
    const contentId = nextId;
    const pageId = nextId + 1;
    nextId += 2;
    pageIds.push(pageId);
    const stream = pageStream(chunk);
    objects.push(`${contentId} 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`);
    objects.push(
      `${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>\nendobj\n`,
    );
  }
  objects.push(`${fontId} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`);

  const kids = pageIds.map((id) => `${id} 0 R`).join(" ");
  const catalog = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
  const pages = `2 0 obj\n<< /Type /Pages /Count ${chunks.length} /Kids [${kids}] >>\nendobj\n`;
  const body = [catalog, pages, ...objects].join("");
  let offset = "%PDF-1.4\n".length;
  const xref = ["xref", `0 ${3 + objects.length}`, "0000000000 65535 f "];
  for (const part of [catalog, pages, ...objects]) {
    xref.push(`${String(offset).padStart(10, "0")} 00000 n `);
    offset += part.length;
  }
  const trailer = `trailer\n<< /Size ${3 + objects.length} /Root 1 0 R >>\nstartxref\n${offset}\n%%EOF`;
  return new TextEncoder().encode(`%PDF-1.4\n${body}${xref.join("\n")}\n${trailer}`);
}
