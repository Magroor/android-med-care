/**
 * Local/self-hosted: applies embedded-DB migrations and runs a 30s worker (reminders + retry queue).
 * Vercel/serverless: no timers — Vercel Cron / an external pinger calls /api/worker/tick instead,
 * and migrations run at build time (scripts/migrate.mjs).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.VERCEL) return;
  const g = globalThis as typeof globalThis & { __medassistWorker?: NodeJS.Timeout };
  if (g.__medassistWorker) return;

  if (!process.env.DATABASE_URL) {
    const { runMigrations } = await import("./db");
    await runMigrations();
  }

  let running = false;
  g.__medassistWorker = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      const { runMaintenance } = await import("./lib/service");
      await runMaintenance();
    } catch (e) {
      console.error("[worker] tick failed", e instanceof Error ? e.message : e);
    } finally {
      running = false;
    }
  }, 30_000);
  g.__medassistWorker.unref?.();
}
