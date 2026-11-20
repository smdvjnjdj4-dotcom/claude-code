import "dotenv/config";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// Tests ALWAYS run against the dedicated test database – never the development DB.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgres://stamply:stamply@localhost:5432/stamply_test";
process.env.STORAGE_DIR = mkdtempSync(path.join(tmpdir(), "stamply-test-"));
process.env.OCR_PROVIDER = "none";
process.env.APP_SECRET = "test-secret-test-secret-test-secret-1234";
process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "";
process.env.VAPID_PRIVATE_KEY = "";
// Quiet hours disabled by default in tests (start == end → never quiet); tests set them explicitly.
process.env.QUIET_HOURS_START = "0";
process.env.QUIET_HOURS_END = "0";
