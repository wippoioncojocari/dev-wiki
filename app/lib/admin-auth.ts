const LOGIN_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const DEFAULT_SESSION_TTL_MIN = 60;
const DEFAULT_RATE_LIMIT = 8;

export const ADMIN_SESSION_COOKIE = "admin_session";

type AdminConfig = {
  password: string;
  cookieSecret: string;
  sessionTtlMinutes: number;
  rateLimit: number;
};

const loginAttempts = new Map<string, { count: number; windowStart: number }>();

const toBase64Url = (data: ArrayBuffer): string => {
  // Buffer is not available in the edge runtime, so fall back to btoa there.
  if (typeof Buffer !== "undefined") {
    return Buffer.from(data).toString("base64url");
  }

  const bytes = new Uint8Array(data);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const safeCompare = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
};

const digest = async (payload: string, secret: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${payload}:${secret}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return toBase64Url(hash);
};

export const sanitizeNextPath = (input?: string | null): string => {
  if (!input || !input.startsWith("/")) return "/admin";
  if (input.startsWith("//") || input.includes("://")) return "/admin";
  return input;
};

export const getAdminConfig = (): AdminConfig | null => {
  const password = process.env.ADMIN_PASSWORD;
  const cookieSecret = process.env.ADMIN_COOKIE_SECRET;
  if (!password || !cookieSecret) return null;

  const parsedTtl = Number.parseInt(process.env.ADMIN_SESSION_TTL_MIN ?? "", 10);
  const parsedLimit = Number.parseInt(process.env.ADMIN_RATE_LIMIT ?? "", 10);

  return {
    password,
    cookieSecret,
    sessionTtlMinutes: Number.isFinite(parsedTtl) && parsedTtl > 0 ? parsedTtl : DEFAULT_SESSION_TTL_MIN,
    rateLimit: Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : DEFAULT_RATE_LIMIT,
  };
};

export const createAdminSession = async (secret: string, ttlMinutes: number): Promise<string> => {
  const issued = Date.now();
  const expires = issued + ttlMinutes * 60 * 1000;
  const payload = `${issued}.${expires}`;
  const signature = await digest(payload, secret);
  return `${payload}.${signature}`;
};

export const verifyAdminSession = async (token: string | undefined, secret: string): Promise<boolean> => {
  if (!token) return false;
  const [issuedStr, expiresStr, signature] = token.split(".");
  if (!issuedStr || !expiresStr || !signature) return false;

  const issued = Number(issuedStr);
  const expires = Number(expiresStr);
  if (!Number.isFinite(issued) || !Number.isFinite(expires) || expires < Date.now()) return false;

  const expected = await digest(`${issued}.${expires}`, secret);
  return safeCompare(signature, expected);
};

export const isRateLimited = (key: string, limit: number): boolean => {
  if (limit <= 0) return false;
  const entry = loginAttempts.get(key);
  if (!entry) return false;
  const now = Date.now();
  if (now - entry.windowStart > LOGIN_WINDOW_MS) {
    loginAttempts.delete(key);
    return false;
  }
  return entry.count >= limit;
};

export const recordFailedAttempt = (key: string): number => {
  const now = Date.now();
  const entry = loginAttempts.get(key);

  if (!entry || now - entry.windowStart > LOGIN_WINDOW_MS) {
    loginAttempts.set(key, { count: 1, windowStart: now });
    return 1;
  }

  const nextCount = entry.count + 1;
  loginAttempts.set(key, { count: nextCount, windowStart: entry.windowStart });
  return nextCount;
};

export const clearAttempts = (key: string): void => {
  loginAttempts.delete(key);
};
