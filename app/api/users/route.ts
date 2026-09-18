import { asc, eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { getDb } from "@/db";
import { sessions, users } from "@/db/schema";
import { forbidden, getRequestUser, hashPassword, normalizeUsername, unauthorized, validUsername } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const current = await getRequestUser(request);
  if (!current) return unauthorized();
  if (current.role !== "administrador") return forbidden();
  const rows = await getDb().select({ id: users.id, name: users.name, username: users.username, role: users.role, active: users.active, createdAt: users.createdAt }).from(users).orderBy(asc(users.name));
  return Response.json({ users: rows });
}

export async function POST(request: NextRequest) {
  const current = await getRequestUser(request);
  if (!current) return unauthorized();
  if (current.role !== "administrador") return forbidden();
  const payload = await request.json() as Record<string, unknown> & { action?: string };
  const db = getDb();
  const now = Date.now();

  if (payload.action === "create") {
    const name = String(payload.name ?? "").trim().slice(0, 100);
    const username = normalizeUsername(String(payload.username ?? ""));
    const password = String(payload.password ?? "");
    const role = payload.role === "administrador" ? "administrador" : "operador";
    if (!name) return Response.json({ error: "Informe o nome." }, { status: 400 });
    if (!validUsername(username)) return Response.json({ error: "Usuário inválido. Use letras minúsculas, números, ponto, hífen ou sublinhado." }, { status: 400 });
    if (password.length < 8) return Response.json({ error: "A senha deve ter pelo menos 8 caracteres." }, { status: 400 });
    try {
      await db.insert(users).values({ name, username, passwordHash: await hashPassword(password), role, createdAt: now, updatedAt: now });
      return Response.json({ message: "Usuário criado com sucesso." }, { status: 201 });
    } catch (error) {
      if (error instanceof Error && error.message.includes("unique")) return Response.json({ error: "Este nome de usuário já está em uso." }, { status: 409 });
      throw error;
    }
  }

  if (payload.action === "update") {
    const id = Number(payload.id);
    if (!Number.isInteger(id)) return Response.json({ error: "Usuário inválido." }, { status: 400 });
    if (id === current.id && (payload.active === false || payload.role !== "administrador")) return Response.json({ error: "Você não pode remover seu próprio acesso administrativo." }, { status: 400 });
    const role = payload.role === "administrador" ? "administrador" : "operador";
    const active = payload.active !== false;
    await db.update(users).set({ role, active, updatedAt: now }).where(eq(users.id, id));
    if (!active) await db.delete(sessions).where(eq(sessions.userId, id));
    return Response.json({ message: "Permissões atualizadas." });
  }

  if (payload.action === "reset_password") {
    const id = Number(payload.id);
    const password = String(payload.password ?? "");
    if (!Number.isInteger(id) || password.length < 8) return Response.json({ error: "Informe uma senha com pelo menos 8 caracteres." }, { status: 400 });
    await db.update(users).set({ passwordHash: await hashPassword(password), failedLoginAttempts: 0, lockedUntil: null, updatedAt: now }).where(eq(users.id, id));
    await db.delete(sessions).where(eq(sessions.userId, id));
    return Response.json({ message: "Senha redefinida. O usuário deverá entrar novamente." });
  }

  return Response.json({ error: "Ação não reconhecida." }, { status: 400 });
}
