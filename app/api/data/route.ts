import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { NextRequest } from "next/server";
import { getDb } from "@/db";
import { inventoryItems, inventoryMovements, visits } from "@/db/schema";
import { forbidden, getRequestUser, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";
type Payload = Record<string, unknown> & { action?: string };

function clean(value: unknown, max = 160) { return String(value ?? "").trim().slice(0, max); }
function numberValue(value: unknown) { const result = Number(value); return Number.isFinite(result) ? Math.trunc(result) : NaN; }
function normalize(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/\s+/g, " ").trim(); }
function invalid(message: string) { return Response.json({ error: message }, { status: 400 }); }
function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Erro inesperado";
  if (message.includes("does not exist")) return "O banco do sistema ainda está sendo preparado. Tente novamente em instantes.";
  return message;
}

export async function GET(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return unauthorized();
  try {
    const db = getDb();
    const [items, movements, scheduledVisits] = await Promise.all([
      db.select().from(inventoryItems).orderBy(asc(inventoryItems.category), asc(inventoryItems.name)),
      db.select().from(inventoryMovements).orderBy(desc(inventoryMovements.createdAt)).limit(300),
      db.select().from(visits).orderBy(asc(visits.visitDate), asc(visits.startTime)),
    ]);
    return Response.json({ items, movements, visits: scheduledVisits });
  } catch (error) { return Response.json({ error: errorMessage(error) }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return unauthorized();
  try {
    const payload = await request.json() as Payload;
    const db = getDb();
    const now = Date.now();
    const adminOnly = ["update_item", "archive_item", "unarchive_item", "delete_archived_item"];
    if (payload.action && adminOnly.includes(payload.action) && user.role !== "administrador") return forbidden();

    if (payload.action === "create_item") {
      const name = clean(payload.name, 100); const category = clean(payload.category, 80);
      const quantity = numberValue(payload.quantity); const minStock = numberValue(payload.minStock);
      if (!name || !category) return invalid("Informe o nome e a categoria do item.");
      if (quantity < 0 || minStock < 0) return invalid("As quantidades não podem ser negativas.");
      const normalizedName = normalize(name); const normalizedCategory = normalize(category);
      const [existing] = await db.select().from(inventoryItems).where(and(eq(inventoryItems.normalizedName, normalizedName), eq(inventoryItems.normalizedCategory, normalizedCategory), isNull(inventoryItems.archivedAt))).limit(1);
      if (existing) {
        await db.transaction(async (tx) => {
          await tx.update(inventoryItems).set({ quantity: existing.quantity + quantity, minStock, updatedAt: now }).where(eq(inventoryItems.id, existing.id));
          await tx.insert(inventoryMovements).values({ itemId: existing.id, itemName: existing.name, action: "entrada", quantity, notes: "Quantidade adicionada ao item já cadastrado", actorName: user.name, createdAt: now });
        });
        return Response.json({ message: "Quantidade somada ao item já existente.", merged: true });
      }
      const [item] = await db.insert(inventoryItems).values({ name, category, normalizedName, normalizedCategory, quantity, minStock, createdAt: now, updatedAt: now }).returning();
      await db.insert(inventoryMovements).values({ itemId: item.id, itemName: item.name, action: "cadastro", quantity, notes: "Item cadastrado no estoque", actorName: user.name, createdAt: now });
      return Response.json({ item, message: "Item cadastrado com sucesso." }, { status: 201 });
    }

    if (payload.action === "update_item") {
      const id = numberValue(payload.id); const name = clean(payload.name, 100); const category = clean(payload.category, 80); const minStock = numberValue(payload.minStock);
      if (!id || !name || !category || minStock < 0) return invalid("Revise os dados do item.");
      const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, id)).limit(1);
      if (!item) return invalid("Item não encontrado.");
      await db.transaction(async (tx) => {
        await tx.update(inventoryItems).set({ name, category, normalizedName: normalize(name), normalizedCategory: normalize(category), minStock, updatedAt: now }).where(eq(inventoryItems.id, id));
        await tx.insert(inventoryMovements).values({ itemId: id, itemName: name, action: "edicao", quantity: 0, notes: "Dados do item atualizados", actorName: user.name, createdAt: now });
      });
      return Response.json({ message: "Item atualizado com sucesso." });
    }

    if (payload.action === "movement") {
      const id = numberValue(payload.itemId); const type = payload.type === "saida" ? "saida" : "entrada"; const quantity = numberValue(payload.quantity);
      const sector = clean(payload.sector, 100); const recipient = clean(payload.recipient, 100); const notes = clean(payload.notes, 300);
      if (!id || quantity <= 0) return invalid("Selecione um item e informe uma quantidade válida.");
      if (type === "saida" && (!sector || !recipient)) return invalid("Na saída, informe o setor e o nome de quem recebeu.");
      const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, id)).limit(1);
      if (!item || item.archivedAt) return invalid("Item ativo não encontrado.");
      if (type === "saida" && quantity > item.quantity) return invalid(`Saída bloqueada: o saldo disponível é ${item.quantity}.`);
      const nextQuantity = type === "entrada" ? item.quantity + quantity : item.quantity - quantity;
      await db.transaction(async (tx) => {
        await tx.update(inventoryItems).set({ quantity: nextQuantity, updatedAt: now }).where(eq(inventoryItems.id, id));
        await tx.insert(inventoryMovements).values({ itemId: id, itemName: item.name, action: type, quantity, sector: type === "saida" ? sector : null, recipient: type === "saida" ? recipient : null, notes: notes || null, actorName: user.name, createdAt: now });
      });
      return Response.json({ message: type === "entrada" ? "Entrada registrada." : "Saída registrada." });
    }

    if (payload.action === "archive_item" || payload.action === "unarchive_item") {
      const id = numberValue(payload.id); const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, id)).limit(1);
      if (!item) return invalid("Item não encontrado.");
      const archiving = payload.action === "archive_item";
      await db.transaction(async (tx) => {
        await tx.update(inventoryItems).set({ archivedAt: archiving ? now : null, updatedAt: now }).where(eq(inventoryItems.id, id));
        await tx.insert(inventoryMovements).values({ itemId: id, itemName: item.name, action: archiving ? "arquivamento" : "desarquivamento", quantity: 0, actorName: user.name, createdAt: now });
      });
      return Response.json({ message: archiving ? "Item arquivado." : "Item devolvido ao estoque ativo." });
    }

    if (payload.action === "delete_archived_item") {
      const id = numberValue(payload.id); const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, id)).limit(1);
      if (!item?.archivedAt) return invalid("O item precisa estar arquivado.");
      if (now - item.archivedAt < 21 * 24 * 60 * 60 * 1000) return invalid("A exclusão é liberada somente após 21 dias de arquivamento.");
      await db.delete(inventoryItems).where(eq(inventoryItems.id, id));
      return Response.json({ message: "Item excluído definitivamente." });
    }

    if (payload.action === "create_visit" || payload.action === "update_visit") {
      const visitDate = clean(payload.visitDate, 10); const startTime = clean(payload.startTime, 5); const endTime = clean(payload.endTime, 5);
      const institution = clean(payload.institution, 140); const responsible = clean(payload.responsible, 120); const visitorCount = numberValue(payload.visitors);
      const status = clean(payload.status, 20) || "agendada"; const notes = clean(payload.notes, 400);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(visitDate) || !startTime || !endTime) return invalid("Informe a data e os horários da visita.");
      if (endTime <= startTime) return invalid("O horário final deve ser posterior ao inicial.");
      if (!institution || !responsible || visitorCount <= 0) return invalid("Informe instituição, responsável e número de visitantes.");
      if (!["agendada", "realizada", "cancelada"].includes(status)) return invalid("Situação da visita inválida.");
      const [conflict] = await db.select().from(visits).where(and(eq(visits.visitDate, visitDate), eq(visits.startTime, startTime), eq(visits.status, "agendada"))).limit(1);
      if (payload.action === "create_visit") {
        if (conflict) return invalid("Já existe uma visita agendada para esta data e horário.");
        const [visit] = await db.insert(visits).values({ visitDate, startTime, endTime, institution, responsible, visitors: visitorCount, status, notes: notes || null, createdAt: now, updatedAt: now }).returning();
        return Response.json({ visit, message: "Visita agendada com sucesso." }, { status: 201 });
      }
      const id = numberValue(payload.id);
      if (!id) return invalid("Visita não encontrada.");
      if (conflict && conflict.id !== id) return invalid("Já existe uma visita agendada para esta data e horário.");
      await db.update(visits).set({ visitDate, startTime, endTime, institution, responsible, visitors: visitorCount, status, notes: notes || null, updatedAt: now }).where(eq(visits.id, id));
      return Response.json({ message: "Visita atualizada." });
    }

    return invalid("Ação não reconhecida.");
  } catch (error) { return Response.json({ error: errorMessage(error) }, { status: 500 }); }
}
