import sharp from "sharp";
import { env } from "@/lib/env";

/**
 * Open-source OCR via tesseract.js (Apache-2.0), running inside the server process – no
 * external API, no per-request cost. Language data (deu+eng, ~15 MB) is downloaded once from
 * the jsDelivr CDN unless OCR_LANG_PATH points to a local folder.
 */
export type OcrResult = { text: string; confidence: number };

type TesseractWorker = {
  recognize: (img: Buffer) => Promise<{ data: { text: string; confidence: number } }>;
  terminate: () => Promise<unknown>;
};

let workerPromise: Promise<TesseractWorker> | null = null;

async function getWorker(): Promise<TesseractWorker> {
  workerPromise ??= (async () => {
    const { createWorker } = await import("tesseract.js");
    const opts: Record<string, unknown> = {};
    if (process.env.OCR_LANG_PATH) opts.langPath = process.env.OCR_LANG_PATH;
    if (process.env.OCR_CACHE_PATH) opts.cachePath = process.env.OCR_CACHE_PATH;
    return (await createWorker(["deu", "eng"], 1, opts)) as unknown as TesseractWorker;
  })().catch((e) => {
    workerPromise = null;
    throw e;
  });
  return workerPromise;
}

async function preprocess(img: Buffer) {
  // Greyscale + contrast stretch + moderate upscale improves recognition on phone photos.
  return sharp(img).rotate().greyscale().normalise().resize({ width: 1600, withoutEnlargement: false }).png().toBuffer();
}

/** Returns null if OCR is disabled or fails – the caller then routes the receipt to manual review. */
export async function runOcr(img: Buffer, timeoutMs = 30_000): Promise<OcrResult | null> {
  if (env.ocrProvider === "none") return null;
  try {
    const worker = await getWorker();
    const input = await preprocess(img);
    const result = await Promise.race([
      worker.recognize(input),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("OCR timeout")), timeoutMs)),
    ]);
    return { text: result.data.text ?? "", confidence: Math.round(result.data.confidence ?? 0) };
  } catch (e) {
    console.error("OCR fehlgeschlagen:", (e as Error).message);
    return null;
  }
}

export async function shutdownOcr() {
  if (workerPromise) {
    const w = await workerPromise.catch(() => null);
    workerPromise = null;
    await w?.terminate();
  }
}
