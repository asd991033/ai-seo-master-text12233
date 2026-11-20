import { defineConfig } from "drizzle-kit";
import { mkdirSync } from "node:fs";
import path from "node:path";

const url = process.env.DATABASE_URL ?? "file:./data/store.db";
if (url.startsWith("file:")) mkdirSync(path.dirname(url.slice(5)), { recursive: true });

export default defineConfig({
  schema: "./src/db/schema.ts",
  dialect: "turso",
  dbCredentials: {
    url,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  },
});
