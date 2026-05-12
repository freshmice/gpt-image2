import { NextResponse } from "next/server";

export const runtime = "nodejs";

const IS_VERCEL = !!process.env.BLOB_READ_WRITE_TOKEN;

async function saveToBlob(
  buf: Buffer,
  name: string,
  mimeType: string,
): Promise<{ path: string; name: string }> {
  const { put } = await import("@vercel/blob");
  const blob = await put(`outputs/${name}`, buf, {
    access: "public",
    contentType: mimeType,
  });
  return { path: blob.url, name };
}

async function saveToDisk(
  buf: Buffer,
  name: string,
): Promise<{ path: string; name: string }> {
  const { writeFile, mkdir } = await import("fs/promises");
  const { join } = await import("path");
  const dir = join(process.cwd(), "public", "outputs");
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, name), buf);
  return { path: `/outputs/${name}`, name };
}

export async function POST(req: Request) {
  const { b64, mimeType, prefix } = (await req.json()) as {
    b64: string;
    mimeType?: string;
    prefix?: string;
  };

  if (!b64) return NextResponse.json({ error: "缺少 b64" }, { status: 400 });

  const mime = mimeType ?? "image/png";
  const ext = mime.split("/")[1] ?? "png";
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 7);
  const name = `${prefix ? prefix + "-" : ""}${ts}-${rand}.${ext}`;
  const buf = Buffer.from(b64, "base64");

  try {
    const result = IS_VERCEL
      ? await saveToBlob(buf, name, mime)
      : await saveToDisk(buf, name);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "保存失败" },
      { status: 500 },
    );
  }
}
