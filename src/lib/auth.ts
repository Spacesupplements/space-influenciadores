import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "space_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 dias

function secret() {
  return process.env.SESSION_SECRET || process.env.APP_PASSWORD || "dev-secret";
}

function tokenFor(password: string) {
  return createHmac("sha256", secret()).update(password).digest("hex");
}

export function checkPassword(password: string): boolean {
  const expected = process.env.APP_PASSWORD || "space2026";
  return password === expected;
}

export async function createSession() {
  const password = process.env.APP_PASSWORD || "space2026";
  const store = await cookies();
  store.set(COOKIE_NAME, tokenFor(password), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function isAuthed(): Promise<boolean> {
  const password = process.env.APP_PASSWORD || "space2026";
  const expected = tokenFor(password);
  const store = await cookies();
  const value = store.get(COOKIE_NAME)?.value;
  if (!value) return false;
  const a = Buffer.from(value);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
