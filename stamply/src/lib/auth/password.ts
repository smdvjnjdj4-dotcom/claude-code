import { randomBytes, scrypt as _scrypt, timingSafeEqual } from "node:crypto";

// scrypt (Node built-in, memory-hard). N=2^15, r=8, p=1 ≈ 32 MiB per hash.
const PARAMS = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEYLEN = 64;

function scrypt(pw: string, salt: Buffer, len: number, opts: typeof PARAMS): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    _scrypt(pw, salt, len, opts, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEYLEN, PARAMS);
  return `scrypt$${PARAMS.N}$${PARAMS.r}$${PARAMS.p}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, n, r, p, saltB64, keyB64] = stored.split("$");
  if (algo !== "scrypt" || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, "base64");
  const key = await scrypt(password, Buffer.from(saltB64, "base64"), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: PARAMS.maxmem,
  });
  return timingSafeEqual(key, expected);
}

export function passwordProblem(password: string): string | null {
  if (password.length < 10) return "Das Passwort braucht mindestens 10 Zeichen.";
  if (password.length > 200) return "Das Passwort darf höchstens 200 Zeichen haben.";
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password))
    return "Bitte Buchstaben und Zahlen kombinieren.";
  return null;
}
