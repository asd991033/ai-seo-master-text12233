import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  dialect: "turso",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "file:./data/store.db",
    authToken: process.env.DATABASE_AUTH_TOKEN,
  },
});
