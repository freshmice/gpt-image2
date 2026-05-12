import { NextResponse } from "next/server";

export const runtime = "nodejs";

const IS_VERCEL = !!process.env.BLOB_READ_WRITE_TOKEN;

interface BlobItem {
  name: string;
  path: string;
  size: number;
  mtime: number;
}

async function listFromBlob(): Promise<BlobItem[]> {
  const { list } = await import("@vercel/blob");
  const { blobs } = await list({ prefix: "outputs/" });
  return blobs.map((b) => ({
    name: b.pathname.replace("outputs/", ""),
    path: b.url,
    size: b.size,
    mtime: new Date(b.uploadedAt).getTime(),
  }));
}

async function listFromDisk(): Promise<BlobItem[]> {
  const { readdir, stat } = await import("fs/promises");
  const { join } = await import("path");
  const dir = join(process.cwd(), "public", "outputs");
  try {
    const files = await readdir(dir);
    const items = await Promise.all(
      files
        .filter((f) => !f.startsWith("."))
        .map(async (name) => {
          const s = await stat(join(dir, name));
          return { name, path: `/outputs/${name}`, size: s.size, mtime: s.mtimeMs };
        }),
    );
    return items;
  } catch {
    return [];
  }
}

async function deleteFromBlob(name: string): Promise<void> {
  const { del, list } = await import("@vercel/blob");
  const { blobs } = await list({ prefix: `outputs/${name}` });
  const match = blobs.find((b) => b.pathname === `outputs/${name}`);
  if (match) await del(match.url);
}

async function deleteFromDisk(name: string): Promise<void> {
  const { unlink } = await import("fs/promises");
  const { join } = await import("path");
  await unlink(join(process.cwd(), "public", "outputs", name));
}

export async function GET() {
  try {
    const items = IS_VERCEL ? await listFromBlob() : await listFromDisk();
    items.sort((a, b) => b.mtime - a.mtime);
    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "列举失败" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  const { name } = (await req.json()) as { name: string };
  if (!name || name.includes("..") || name.includes("/"))
    return NextResponse.json({ error: "非法文件名" }, { status: 400 });

  try {
    if (IS_VERCEL) {
      await deleteFromBlob(name);
    } else {
      await deleteFromDisk(name);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "删除失败" },
      { status: 500 },
    );
  }
}
