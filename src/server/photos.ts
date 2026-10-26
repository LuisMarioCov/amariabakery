export async function savePhoto(db: D1Database, id: string, bytes: Uint8Array): Promise<void> {
  await db.prepare("INSERT INTO photos (id, bytes) VALUES (?, ?)").bind(id, bytes).run();
}

export async function readPhoto(db: D1Database, id: string): Promise<ArrayBuffer | null> {
  const row = await db.prepare("SELECT bytes FROM photos WHERE id = ?").bind(id).first<{ bytes: unknown }>();
  if (!row) return null;
  return toArrayBuffer(row.bytes);
}

function toArrayBuffer(value: unknown): ArrayBuffer | null {
  if (value instanceof ArrayBuffer) return value;
  if (ArrayBuffer.isView(value)) {
    return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) as ArrayBuffer;
  }
  if (typeof value === "string") {
    const binary = Uint8Array.from(value, (char) => char.charCodeAt(0));
    return binary.buffer.slice(binary.byteOffset, binary.byteOffset + binary.byteLength) as ArrayBuffer;
  }
  if (Array.isArray(value) && value.every((item) => typeof item === "number")) {
    return Uint8Array.from(value).buffer;
  }
  return null;
}

export async function deletePhoto(db: D1Database, id: string): Promise<void> {
  await db.prepare("DELETE FROM photos WHERE id = ?").bind(id).run();
}
