// Fails fast at startup instead of silently falling back to a guessable
// default — an app that boots "successfully" on a weak/missing secret is
// far more dangerous in production than one that refuses to start.
const KNOWN_PLACEHOLDER_VALUES = new Set(['dev-only-secret-change-me']);

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.trim() === '') {
    throw new Error(
      'JWT_SECRET is not set. Generate one with `openssl rand -base64 32` and set it in .env before starting the server.',
    );
  }

  if (KNOWN_PLACEHOLDER_VALUES.has(secret)) {
    throw new Error(
      'JWT_SECRET is still set to the placeholder value from .env.example. Generate a real secret with `openssl rand -base64 32` and set it in .env.',
    );
  }

  if (secret.length < 32) {
    throw new Error('JWT_SECRET is too short — use at least 32 random characters (e.g. `openssl rand -base64 32`).');
  }

  return secret;
}
