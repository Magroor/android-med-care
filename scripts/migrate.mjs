// Applies drizzle migrations to DATABASE_URL (Neon). Runs before `next build` on Vercel.
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("[migrate] DATABASE_URL not set — skipping (local dev uses embedded DB).");
  process.exit(0);
}
const pool = new Pool({ connectionString: url, max: 1 });
try {
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  console.log("[migrate] done");
} catch (e) {
  console.error("[migrate] failed", e);
  process.exitCode = 1;
} finally {
  await pool.end();
}
