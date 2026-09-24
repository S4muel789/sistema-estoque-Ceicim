import { count } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [result] = await getDb().select({ value: count() }).from(users);
    return Response.json({ needsSetup: result.value === 0 });
  } catch (error) {
    console.error("[auth/setup-status] Falha ao consultar configuração inicial", error);
    return Response.json({ error: "Não foi possível verificar a configuração do sistema." }, { status: 500 });
  }
}
