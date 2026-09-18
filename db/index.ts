import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { ceicimPool?: Pool };

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL não foi configurada.");
  const pool = new Pool({ connectionString, max: 5 });
  attachDatabasePool(pool);
  return pool;
}

export function getDb() {
  const pool = globalForDb.ceicimPool ?? createPool();
  if (process.env.NODE_ENV !== "production") globalForDb.ceicimPool = pool;
  return drizzle(pool, { schema });
}
