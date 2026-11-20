import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp, { type Metadata } from "sharp";
import { DomainError } from "./errors";
import { env } from "./env";

/**
 * File storage on the local filesystem (dev / single server).
 * Paths are opaque keys like "public/3f…c.webp" or "private/receipts/9a…e.webp".
 * Swap this module for S3/Supabase Storage in production; the rest of the app only uses keys.
 */

export type ImageKind = "logo" | "cover" | "gallery" | "campaign" | "avatar" | "program" | "receipt";

const LIMITS: Record<ImageKind, { maxBytes: number; maxSide: number; quality: number }> = {
  logo: { maxBytes: 4e6, maxSide: 512, quality: 85 },
  avatar: { maxBytes: 4e6, maxSide: 512, quality: 82 },
  cover: { maxBytes: 8e6, maxSide: 1800, quality: 80 },
  gallery: { maxBytes: 8e6, maxSide: 1800, quality: 80 },
  program: { maxBytes: 8e6, maxSide: 1200, quality: 80 },
  campaign: { maxBytes: 8e6, maxSide: 1200, quality: 80 },
  receipt: { maxBytes: 12e6, maxSide: 2200, quality: 82 },
};

const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp", "avif", "heif", "gif", "tiff"]);
const KEY_RE = /^(public|private\/receipts)\/[0-9a-f-]{36}\.webp$/;

const root = () => path.resolve(env.storageDir);

export function isValidKey(key: string) {
  return KEY_RE.test(key);
}

/**
 * Validates an uploaded image by actually decoding it (not by trusting the MIME type or name),
 * re-encodes it to WebP and strips all metadata (EXIF/GPS).
 */
export async function processImage(input: Buffer, kind: ImageKind): Promise<Buffer> {
  const lim = LIMITS[kind];
  if (input.byteLength === 0) throw new DomainError("empty_file", "Die Datei ist leer.");
  if (input.byteLength > lim.maxBytes) {
    throw new DomainError("file_too_large", `Das Bild ist zu groß (max. ${Math.round(lim.maxBytes / 1e6)} MB).`);
  }
  let meta: Metadata;
  try {
    meta = await sharp(input, { limitInputPixels: 40_000_000 }).metadata();
  } catch {
    throw new DomainError("invalid_image", "Die Datei ist kein gültiges Bild.");
  }
  if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) {
    throw new DomainError("invalid_image", "Bitte lade ein JPG-, PNG-, WebP- oder HEIC-Bild hoch.");
  }
  return sharp(input, { limitInputPixels: 40_000_000 })
    .rotate() // apply EXIF orientation before metadata is dropped
    .resize({ width: lim.maxSide, height: lim.maxSide, fit: "inside", withoutEnlargement: true })
    .webp({ quality: lim.quality })
    .toBuffer();
}

export async function storeImage(processed: Buffer, kind: ImageKind): Promise<string> {
  const dir = kind === "receipt" ? "private/receipts" : "public";
  const key = `${dir}/${randomUUID()}.webp`;
  await mkdir(path.join(root(), dir), { recursive: true });
  await writeFile(path.join(root(), key), processed);
  return key;
}

export async function saveImage(input: Buffer, kind: ImageKind): Promise<string> {
  return storeImage(await processImage(input, kind), kind);
}

export async function readStored(key: string): Promise<Buffer | null> {
  if (!isValidKey(key)) return null;
  try {
    return await readFile(path.join(root(), key));
  } catch {
    return null;
  }
}

export async function deleteStored(key: string | null | undefined) {
  if (!key || !isValidKey(key)) return;
  await rm(path.join(root(), key), { force: true });
}

/** Public URL for a stored public image (served by /api/files). */
export function fileUrl(key: string | null | undefined): string | null {
  return key ? `/api/files/${key}` : null;
}

/** Reads a File from a FormData field into a Buffer; returns null when no file was chosen. */
export async function fileFromForm(form: FormData, field: string): Promise<Buffer | null> {
  const f = form.get(field);
  if (!f || typeof f === "string" || f.size === 0) return null;
  return Buffer.from(await f.arrayBuffer());
}
