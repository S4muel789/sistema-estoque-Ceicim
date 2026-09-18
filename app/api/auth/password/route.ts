import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { getRequestUser, hashPassword, unauthorized, verifyPassword } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const current = await getRequestUser(request);
  if (!current) return unauthorized();
  const payload = await request.json() as Record<string, unknown>;
  const currentPassword = String(payload.currentPassword ?? "");
  const newPassword = String(payload.newPassword ?? "");
  if (newPassword.length < 8) return Response.json({ error: "A nova senha deve ter pelo menos 8 caracteres." }, { status: 400 });
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, current.id)).limit(1);
  if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) return Response.json({ error: "Senha atual incorreta." }, { status: 400 });
  await db.update(users).set({ passwordHash: await hashPassword(newPassword), updatedAt: Date.now() }).where(eq(users.id, current.id));
  return Response.json({ message: "Senha alterada com sucesso." });
}
