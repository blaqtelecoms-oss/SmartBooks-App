// Verification codes and reset tokens are stored only as keyed hashes, never in
// plain text, so a database leak cannot be replayed.
const encoder = new TextEncoder();

const secretKey = () => {
  const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!secret) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  return secret;
};

const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

// Always six digits, leading zeros included.
export function sixDigitCode() {
  const value = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return value.toString().padStart(6, '0');
}

export function randomToken(bytes = 32) {
  return toHex(crypto.getRandomValues(new Uint8Array(bytes)).buffer);
}

// HMAC-SHA256 of the value, scoped so a verification code hash can never be
// reused as a reset-token hash.
export async function hashValue(value: string, scope: 'verify' | 'reset') {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(`${secretKey()}:${scope}`),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return toHex(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
}

export function normalizeCode(input: unknown) {
  return String(input ?? '').replace(/\D/g, '');
}

// Constant-time-ish comparison for equal-length hex strings.
export function sameHash(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
