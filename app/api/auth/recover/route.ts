import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { sessions, users } from "@/db/schema";
import {
  hashPassword,
  isTrustedMutationRequest,
  issueSession,
  normalizeUsername,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  safeEqual,
  untrustedRequest,
  validPassword,
  validUsername,
} from "@/lib/auth";

export async function POST(request: Request) {
  if (!isTrustedMutationRequest(request)) return untrustedRequest();

  const payload = await request.json() as Record<string, unknown>;
  const username = normalizeUsername(String(payload.username ?? ""));
  const recoveryKey = String(payload.recoveryKey ?? "");
  const newPassword = String(payload.newPassword ?? "");
  const expectedKey = process.env.SETUP_KEY ?? "";

  if (!validUsername(username)) {
    return NextResponse.json({ error: "Dados de recuperação inválidos." }, { status: 400 });
  }
  if (!validPassword(newPassword)) {
    return NextResponse.json(
      { error: `A nova senha deve ter entre ${PASSWORD_MIN_LENGTH} e ${PASSWORD_MAX_LENGTH} caracteres.` },
      { status: 400 },
    );
  }
  if (!expectedKey || !safeEqual(recoveryKey, expectedKey)) {
    return NextResponse.json({ error: "Dados de recuperação inválidos." }, { status: 403 });
  }

  const db = getDb();
  const [user] = await db.select({ id: users.id, active: users.active }).from(users).where(eq(users.username, username)).limit(1);
  if (!user || !user.active) {
    return NextResponse.json({ error: "Dados de recuperação inválidos." }, { status: 403 });
  }

  await db.transaction(async (transaction) => {
    await transaction.update(users).set({
      passwordHash: await hashPassword(newPassword),
      failedLoginAttempts: 0,
      lockedUntil: null,
      updatedAt: Date.now(),
    }).where(eq(users.id, user.id));
    await transaction.delete(sessions).where(eq(sessions.userId, user.id));
  });

  const response = NextResponse.json({ success: true });
  await issueSession(response, user.id);
  return response;
}
