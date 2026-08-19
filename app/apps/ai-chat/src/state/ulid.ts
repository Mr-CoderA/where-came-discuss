const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

let lastTime = -1;
let lastRandom = new Uint8Array(10);

function encodeTime(ms: number): string {
  let value = ms;
  const chars: string[] = new Array(10);
  for (let i = 9; i >= 0; i -= 1) {
    chars[i] = CROCKFORD[value % 32] ?? "0";
    value = Math.floor(value / 32);
  }
  return chars.join("");
}

function encodeRandom(bytes: Uint8Array): string {
  const chars: string[] = [];
  let buffer = 0;
  let bits = 0;
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      chars.push(CROCKFORD[(buffer >> bits) & 31] ?? "0");
    }
  }
  if (bits > 0) {
    chars.push(CROCKFORD[(buffer << (5 - bits)) & 31] ?? "0");
  }
  return chars.slice(0, 16).join("");
}

function increment(bytes: Uint8Array): void {
  for (let i = bytes.length - 1; i >= 0; i -= 1) {
    const next = ((bytes[i] ?? 0) + 1) & 0xff;
    bytes[i] = next;
    if (next !== 0) {
      return;
    }
  }
}

/** Monotonic ULID (Crockford base32). Browser `crypto` only — no runtime deps. */
export function createUlid(now = Date.now()): string {
  if (now === lastTime) {
    increment(lastRandom);
  } else {
    lastTime = now;
    crypto.getRandomValues(lastRandom);
  }
  return encodeTime(now) + encodeRandom(lastRandom);
}

export function nowIso(now = new Date()): string {
  return now.toISOString();
}
