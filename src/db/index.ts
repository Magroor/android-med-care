import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";

/**
 * - DATABASE_URL set (Neon / any Postgres): node-postgres with a small pool. Use Neon's *pooled*
 *   connection string on Vercel. Migrations run at build time (scripts/migrate.mjs), not at runtime.
 * - Otherwise (local dev only): embedded Postgres (PGlite) persisted in .data/pgdata, migrated at startup.
 *   PGlite is loaded lazily via require so it is never bundled into production functions.
 */
type Db = ReturnType<typeof drizzlePg>;
type G = typeof globalThis & { __medDb?: { db: Db; migrate: () => Promise<void> } };
const g = globalThis as G;
const migrationsFolder = path.join(process.cwd(), "drizzle");

function init() {
  const isProd = process.env.NODE_ENV === "production";
  // In production a missing DATABASE_URL must not crash `next build` (page-data collection imports
  // this module); queries fail loudly at runtime instead.
  if (isProd && !process.env.DATABASE_URL) {
    console.error("[db] DATABASE_URL is not set — set your Neon pooled connection string.");
  }
  const url = process.env.DATABASE_URL ?? (isProd ? "postgresql://unset:unset@127.0.0.1:1/unset" : undefined);
  if (url) {
    const pool = new Pool({
      connectionString: url,
      max: process.env.VERCEL ? 3 : 10,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    });
    pool.on("error", (e) => console.error("[db] pool error", e.message));
    const d = drizzlePg(pool);
    return { db: d, migrate: () => migratePg(d, { migrationsFolder }) };
  }
  const req = createRequire(path.join(process.cwd(), "package.json"));
  const { PGlite } = req("@electric-sql/pglite");
  const { drizzle } = req("drizzle-orm/pglite");
  const { migrate } = req("drizzle-orm/pglite/migrator");
  // PGLITE_DIR=memory:// gives an in-memory database (used by integration tests)
  const dir = process.env.PGLITE_DIR ?? path.join(process.cwd(), ".data", "pgdata");
  if (!dir.startsWith("memory:")) fs.mkdirSync(dir, { recursive: true });
  const d = drizzle(new PGlite(dir));
  return { db: d as unknown as Db, migrate: () => migrate(d, { migrationsFolder }) as Promise<void> };
}

const inst = (g.__medDb ??= init());
export const db: Db = inst.db;
export const runMigrations = inst.migrate;
