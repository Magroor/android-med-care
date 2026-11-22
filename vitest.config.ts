import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    // integration tests use an in-memory embedded Postgres, never a real DATABASE_URL
    env: { DATABASE_URL: "", PGLITE_DIR: "memory://" },
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
