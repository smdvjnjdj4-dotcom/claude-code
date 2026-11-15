/**
 * End-to-end encryption for direct messages (WebCrypto, no dependencies).
 * Each member has an ECDH P-256 key pair. The public half is published on the member document;
 * the private half lives in the member's private storage. Two members derive the same AES-GCM key,
 * so both can read the conversation and nobody else can.
 */
export interface KeyPairJwk { pub: JsonWebKey; priv: JsonWebKey }

const ALGO = { name: 'ECDH', namedCurve: 'P-256' } as const;
const enc = new TextEncoder();
const dec = new TextDecoder();

export const toB64 = (buf: ArrayBuffer | Uint8Array) => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
};
export const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function generateKeyPair(): Promise<KeyPairJwk> {
  const kp = await crypto.subtle.generateKey(ALGO, true, ['deriveKey']);
  return { pub: await crypto.subtle.exportKey('jwk', kp.publicKey), priv: await crypto.subtle.exportKey('jwk', kp.privateKey) };
}

const cache = new Map<string, Promise<CryptoKey>>();

/** Shared AES-GCM key between my private key and their public point. Cached per pair. */
export function sharedKey(myPriv: JsonWebKey, their: { x: string; y: string }): Promise<CryptoKey> {
  const id = `${myPriv.x}:${their.x}:${their.y}`;
  let p = cache.get(id);
  if (!p) {
    p = (async () => {
      const priv = await crypto.subtle.importKey('jwk', myPriv, ALGO, false, ['deriveKey']);
      const pub = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: their.x, y: their.y, ext: true }, ALGO, false, []);
      return crypto.subtle.deriveKey({ name: 'ECDH', public: pub }, priv, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    })();
    cache.set(id, p);
    p.catch(() => cache.delete(id));
  }
  return p;
}

export async function encryptText(key: CryptoKey, text: string): Promise<{ iv: string; ct: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(text));
  return { iv: toB64(iv), ct: toB64(ct) };
}

export async function decryptText(key: CryptoKey, iv: string, ct: string): Promise<string | null> {
  try {
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(iv) }, key, fromB64(ct));
    return dec.decode(pt);
  } catch {
    return null;
  }
}
