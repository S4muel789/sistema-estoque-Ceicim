import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";
import { and, eq, gt } from "drizzle-orm";
import { getDb } from "@/db";
import { sessions, users } from "@/db/schema";

export const SESSION_COOKIE = "ceicim_session";
const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;

export type AppUser = { id: number; name: string; username: string; role: "administrador" | "operador" };

function scrypt(password: string, salt: string) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, 64, (error, derivedKey) => error ? reject(error) : resolve(derivedKey));
  });
}

export function normalizeUsername(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR");
}

export function validUsername(value: string) {
  return /^[a-z0-9._-]{3,40}$/.test(value);
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt);
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [method, salt, hash] = stored.split("$");
  if (method !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = await scrypt(password, salt);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function findUserForToken(token?: string): Promise<AppUser | null> {
  if (!token) return null;
  const [row] = await getDb()
    .select({ id: users.id, name: users.name, username: users.username, role: users.role })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, tokenHash(token)), gt(sessions.expiresAt, Date.now()), eq(users.active, true)))
    .limit(1);
  if (!row || (row.role !== "administrador" && row.role !== "operador")) return null;
  return row as AppUser;
}

export async function getCurrentUser() {
  const store = await cookies();
  return findUserForToken(store.get(SESSION_COOKIE)?.value);
}

export async function getRequestUser(request: NextRequest) {
  return findUserForToken(request.cookies.get(SESSION_COOKIE)?.value);
}

export async function issueSession(response: NextResponse, userId: number) {
  const token = randomBytes(32).toString("base64url");
  const now = Date.now();
  await getDb().insert(sessions).values({ tokenHash: tokenHash(token), userId, createdAt: now, expiresAt: now + SESSION_TTL });
  response.cookies.set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: SESSION_TTL / 1000 });
}

export async function revokeSession(request: NextRequest, response: NextResponse) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) await getDb().delete(sessions).where(eq(sessions.tokenHash, tokenHash(token)));
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
}

export function unauthorized() {
  return Response.json({ error: "Faça login para acessar o sistema." }, { status: 401 });
}

export function forbidden() {
  return Response.json({ error: "Esta ação é exclusiva do administrador." }, { status: 403 });
}
