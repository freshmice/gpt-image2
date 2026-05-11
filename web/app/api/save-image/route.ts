import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export const runtime = "nodejs";

const OUTPUT_DIR = join(process.cwd(), "public", "outputs");

export async function POST(req: Request) {
  const { b64, mimeType, prefix } = (await req.json()) as {
    b64: string;
    mimeType?: string;
    prefix?: string;
  };

  if (!b64) return NextResponse.json({ error: "缺少 b64" }, { status: 400 });

  const ext = (mimeType ?? "image/png").split("/")[1] ?? "png";
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 7);
  const name = `${prefix ? prefix + "-" : ""}${ts}-${rand}.${ext}`;

  try {
    await mkdir(OUTPUT_DIR, { recursive: true });
    await writeFile(join(OUTPUT_DIR, name), Buffer.from(b64, "base64"));
    return NextResponse.json({ path: `/outputs/${name}`, name });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "保存失败" },
      { status: 500 },
    );
  }
}
