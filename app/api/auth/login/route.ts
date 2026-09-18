import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { issueSession, normalizeUsername, verifyPassword } from "@/lib/auth";

export async function POST(request: Request) {
  const payload = await request.json() as Record<string, unknown>;
  const username = normalizeUsername(String(payload.username ?? ""));
  const password = String(payload.password ?? "");
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
  const now = Date.now();
  if (!user || !user.active) return NextResponse.json({ error: "Usuário ou senha inválidos." }, { status: 401 });
  if (user.lockedUntil && user.lockedUntil > now) return NextResponse.json({ error: "Acesso temporariamente bloqueado. Tente novamente em alguns minutos." }, { status: 429 });
  if (!(await verifyPassword(password, user.passwordHash))) {
    const attempts = user.failedLoginAttempts + 1;
    await db.update(users).set({ failedLoginAttempts: attempts >= 5 ? 0 : attempts, lockedUntil: attempts >= 5 ? now + 15 * 60 * 1000 : null, updatedAt: now }).where(eq(users.id, user.id));
    return NextResponse.json({ error: "Usuário ou senha inválidos." }, { status: 401 });
  }
  await db.update(users).set({ failedLoginAttempts: 0, lockedUntil: null, updatedAt: now }).where(eq(users.id, user.id));
  const response = NextResponse.json({ success: true });
  await issueSession(response, user.id);
  return response;
}
