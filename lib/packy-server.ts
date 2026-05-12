import { normalizeUpstreamError } from "@/lib/errors";
import type { GeneratedImage, HistoryImageRef } from "@/lib/types";

export interface UpstreamImage {
  b64_json?: string;
  url?: string;
}

/** 保存图片到 Vercel Blob（生产）或本地磁盘（开发），返回可访问路径 */
export async function persistImages(
  images: GeneratedImage[],
  prefix: string,
): Promise<HistoryImageRef[]> {
  const isVercel = !!process.env.BLOB_READ_WRITE_TOKEN;
  const refs: HistoryImageRef[] = [];

  for (const img of images) {
    const buf = Buffer.from(img.b64_json, "base64");
    const mime = img.mimeType ?? "image/png";
    const ext = mime.split("/")[1] ?? "png";
    const name = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;

    try {
      if (isVercel) {
        const { put } = await import("@vercel/blob");
        const blob = await put(`outputs/${name}`, buf, {
          access: "public",
          contentType: mime,
        });
        refs.push({ path: blob.url, name });
      } else {
        const { writeFile, mkdir } = await import("fs/promises");
        const { join } = await import("path");
        const dir = join(process.cwd(), "public", "outputs");
        await mkdir(dir, { recursive: true });
        await writeFile(join(dir, name), buf);
        refs.push({ path: `/outputs/${name}`, name });
      }
    } catch (e) {
      console.error("[persistImages] failed to save", name, e);
    }
  }

  return refs;
}

/** 调用 /v1/images/generations */
export async function callGenerations(opts: {
  apiKey: string;
  baseUrl: string;
  body: Record<string, unknown>;
}): Promise<{ images: GeneratedImage[]; elapsedMs: number }> {
  const { apiKey, baseUrl, body } = opts;
  const t0 = Date.now();
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await normalizeUpstreamError(res, baseUrl));
  const json = (await res.json()) as { data?: UpstreamImage[] };
  const images = await toGeneratedImages(json.data || []);
  return { images, elapsedMs: Date.now() - t0 };
}

/** 调用 /v1/images/edits —— 传 FormData 透传到上游 */
export async function callEdits(opts: {
  apiKey: string;
  baseUrl: string;
  form: FormData;
}): Promise<{ images: GeneratedImage[]; elapsedMs: number }> {
  const { apiKey, baseUrl, form } = opts;
  const t0 = Date.now();
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/images/edits`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await normalizeUpstreamError(res, baseUrl));
  const json = (await res.json()) as { data?: UpstreamImage[] };
  const images = await toGeneratedImages(json.data || []);
  return { images, elapsedMs: Date.now() - t0 };
}

async function toGeneratedImages(
  items: UpstreamImage[],
): Promise<GeneratedImage[]> {
  const out: GeneratedImage[] = [];
  for (const it of items) {
    if (it.b64_json) {
      out.push({ b64_json: it.b64_json, mimeType: "image/png" });
    } else if (it.url) {
      const r = await fetch(it.url, { cache: "no-store" });
      if (!r.ok) continue;
      const buf = await r.arrayBuffer();
      const mimeType = r.headers.get("content-type") || "image/png";
      out.push({ b64_json: Buffer.from(buf).toString("base64"), mimeType });
    }
  }
  if (out.length === 0) throw new Error("上游未返回可用图像");
  return out;
}


export interface UpstreamImage {
  b64_json?: string;
  url?: string;
}

/** 调用 /v1/images/generations */
export async function callGenerations(opts: {
  apiKey: string;
  baseUrl: string;
  body: Record<string, unknown>;
}): Promise<{ images: GeneratedImage[]; elapsedMs: number }> {
  const { apiKey, baseUrl, body } = opts;
  const t0 = Date.now();
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await normalizeUpstreamError(res, baseUrl));
  const json = (await res.json()) as { data?: UpstreamImage[] };
  const images = await toGeneratedImages(json.data || []);
  return { images, elapsedMs: Date.now() - t0 };
}

/** 调用 /v1/images/edits —— 传 FormData 透传到上游 */
export async function callEdits(opts: {
  apiKey: string;
  baseUrl: string;
  form: FormData;
}): Promise<{ images: GeneratedImage[]; elapsedMs: number }> {
  const { apiKey, baseUrl, form } = opts;
  const t0 = Date.now();
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/images/edits`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await normalizeUpstreamError(res, baseUrl));
  const json = (await res.json()) as { data?: UpstreamImage[] };
  const images = await toGeneratedImages(json.data || []);
  return { images, elapsedMs: Date.now() - t0 };
}

async function toGeneratedImages(
  items: UpstreamImage[],
): Promise<GeneratedImage[]> {
  const out: GeneratedImage[] = [];
  for (const it of items) {
    if (it.b64_json) {
      out.push({ b64_json: it.b64_json, mimeType: "image/png" });
    } else if (it.url) {
      const r = await fetch(it.url, { cache: "no-store" });
      if (!r.ok) continue;
      const buf = await r.arrayBuffer();
      const mimeType = r.headers.get("content-type") || "image/png";
      out.push({ b64_json: Buffer.from(buf).toString("base64"), mimeType });
    }
  }
  if (out.length === 0) throw new Error("上游未返回可用图像");
  return out;
}
