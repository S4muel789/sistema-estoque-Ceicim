import { count } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, isTrustedMutationRequest, issueSession, normalizeUsername, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, safeEqual, untrustedRequest, validPassword, validUsername } from "@/lib/auth";

export async function POST(request: Request) {
  if (!isTrustedMutationRequest(request)) return untrustedRequest();
  const db = getDb();
  const [existing] = await db.select({ value: count() }).from(users);
  if (existing.value > 0) return NextResponse.json({ error: "A configuração inicial já foi concluída." }, { status: 409 });
  const payload = await request.json() as Record<string, unknown>;
  const setupKey = String(payload.setupKey ?? "");
  const expectedKey = process.env.SETUP_KEY ?? "";
  const name = String(payload.name ?? "").trim().slice(0, 100);
  const username = normalizeUsername(String(payload.username ?? ""));
  const password = String(payload.password ?? "");
  if (!expectedKey || !safeEqual(setupKey, expectedKey)) return NextResponse.json({ error: "Código de ativação inválido." }, { status: 403 });
  if (!name) return NextResponse.json({ error: "Informe seu nome." }, { status: 400 });
  if (!validUsername(username)) return NextResponse.json({ error: "Use de 3 a 40 caracteres: letras minúsculas, números, ponto, hífen ou sublinhado." }, { status: 400 });
  if (!validPassword(password)) return NextResponse.json({ error: `A senha deve ter entre ${PASSWORD_MIN_LENGTH} e ${PASSWORD_MAX_LENGTH} caracteres.` }, { status: 400 });
  const now = Date.now();
  const [user] = await db.insert(users).values({ name, username, passwordHash: await hashPassword(password), role: "administrador", createdAt: now, updatedAt: now }).returning({ id: users.id });
  const response = NextResponse.json({ success: true });
  await issueSession(response, user.id);
  return response;
}
