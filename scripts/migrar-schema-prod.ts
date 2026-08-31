/**
 * Cria as tabelas no Postgres de produção (Neon), aplicando as migrações do
 * Drizzle. Rode uma vez ao configurar o banco novo, antes do primeiro deploy
 * (ou depois de mudar o schema).
 *
 * Uso: DATABASE_URL=postgres://... npx tsx scripts/migrar-schema-prod.ts
 */
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

async function main() {
  const { DATABASE_URL } = process.env;
  if (!DATABASE_URL) {
    throw new Error("Defina DATABASE_URL com a connection string do Postgres (Neon).");
  }
  const sql = neon(DATABASE_URL);
  const db = drizzle(sql);
  await migrate(db, { migrationsFolder: "./src/db/migrations" });
  console.log("Schema aplicado no banco de produção.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
