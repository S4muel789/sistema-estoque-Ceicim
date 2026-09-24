import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { sessions, users } from "@/db/schema";
import { getRequestUser, hashPassword, isTrustedMutationRequest, issueSession, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, unauthorized, untrustedRequest, validPassword, verifyPassword } from "@/lib/auth";

export async function POST(request: NextRequest) {
  if (!isTrustedMutationRequest(request)) return untrustedRequest();
  const current = await getRequestUser(request);
  if (!current) return unauthorized();
  const payload = await request.json() as Record<string, unknown>;
  const currentPassword = String(payload.currentPassword ?? "");
  const newPassword = String(payload.newPassword ?? "");
  if (!validPassword(newPassword)) return Response.json({ error: `A nova senha deve ter entre ${PASSWORD_MIN_LENGTH} e ${PASSWORD_MAX_LENGTH} caracteres.` }, { status: 400 });
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, current.id)).limit(1);
  if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) return Response.json({ error: "Senha atual incorreta." }, { status: 400 });
  await db.update(users).set({ passwordHash: await hashPassword(newPassword), updatedAt: Date.now() }).where(eq(users.id, current.id));
  await db.delete(sessions).where(eq(sessions.userId, current.id));
  const response = NextResponse.json({ message: "Senha alterada com sucesso." });
  await issueSession(response, current.id);
  return response;
}
