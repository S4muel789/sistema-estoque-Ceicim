import { asc, isNull } from "drizzle-orm";
import { NextRequest } from "next/server";
import { getDb } from "@/db";
import { inventoryItems } from "@/db/schema";
import { getRequestUser, unauthorized } from "@/lib/auth";
import { buildInventoryPdf } from "@/lib/inventory-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return unauthorized();
  const items = await getDb().select({ name: inventoryItems.name, category: inventoryItems.category, quantity: inventoryItems.quantity, minStock: inventoryItems.minStock }).from(inventoryItems).where(isNull(inventoryItems.archivedAt)).orderBy(asc(inventoryItems.category), asc(inventoryItems.name));
  const bytes = await buildInventoryPdf(items);
  const date = new Date().toISOString().slice(0, 10);
  return new Response(bytes as BodyInit, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="estoque-ceicim-${date}.pdf"`, "Cache-Control": "private, no-store" } });
}
