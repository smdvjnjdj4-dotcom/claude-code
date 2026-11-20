/** Central, typed access to configuration. Fails loudly for required secrets in production. */
function req(name: string, devFallback?: string): string {
  const v = process.env[name];
  if (v && v.length > 0) return v;
  if (process.env.NODE_ENV === "production" || devFallback === undefined) {
    throw new Error(`Umgebungsvariable ${name} fehlt`);
  }
  return devFallback;
}

export const env = {
  get appUrl() {
    return process.env.APP_URL ?? "http://localhost:3000";
  },
  get appSecret() {
    const s = req("APP_SECRET", "dev-only-insecure-secret-change-me-0123456789");
    if (process.env.NODE_ENV === "production" && (s.length < 32 || s.startsWith("change-me"))) {
      throw new Error("APP_SECRET ist zu kurz oder nicht gesetzt");
    }
    return s;
  },
  get cronSecret() {
    return process.env.CRON_SECRET ?? "";
  },
  get storageDir() {
    return process.env.STORAGE_DIR ?? "./storage";
  },
  get receiptRetentionDays() {
    return Number(process.env.RECEIPT_IMAGE_RETENTION_DAYS ?? 30);
  },
  get ocrProvider() {
    return (process.env.OCR_PROVIDER ?? "tesseract") as "tesseract" | "none";
  },
  get timezone() {
    return process.env.APP_TIMEZONE ?? "Europe/Berlin";
  },
  get quietHours() {
    return {
      start: Number(process.env.QUIET_HOURS_START ?? 21),
      end: Number(process.env.QUIET_HOURS_END ?? 9),
    };
  },
  get vapid() {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
    const privateKey = process.env.VAPID_PRIVATE_KEY ?? "";
    return {
      publicKey,
      privateKey,
      subject: process.env.VAPID_SUBJECT ?? "mailto:admin@example.com",
      configured: publicKey.length > 0 && privateKey.length > 0,
    };
  },
  get isProd() {
    return process.env.NODE_ENV === "production";
  },
};
