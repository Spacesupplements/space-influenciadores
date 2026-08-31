/**
 * Migra os dados do sistema antigo (PHP + MySQL no cPanel) para o novo banco
 * Postgres (Neon/Vercel). Cada influenciador antigo vira 1 ciclo retroativo
 * (status "aberto"), preservando as vendas já registradas.
 *
 * Uso:
 *   OLD_DB_HOST=... OLD_DB_NOME=... OLD_DB_USER=... OLD_DB_SENHA=... \
 *   DATABASE_URL=postgres://... \
 *   npx tsx scripts/migrar-do-cpanel.ts
 *
 * As variáveis OLD_DB_* são as mesmas que estão em legacy-php/config.php.
 * DATABASE_URL é a connection string do Postgres novo (Neon), a mesma que
 * vai para a variável de ambiente do Vercel.
 */
import mysql from "mysql2/promise";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/db/schema";

async function main() {
  const { OLD_DB_HOST, OLD_DB_NOME, OLD_DB_USER, OLD_DB_SENHA, DATABASE_URL } = process.env;
  if (!OLD_DB_HOST || !OLD_DB_NOME || !OLD_DB_USER || !OLD_DB_SENHA) {
    throw new Error("Defina OLD_DB_HOST, OLD_DB_NOME, OLD_DB_USER, OLD_DB_SENHA (dados do legacy-php/config.php).");
  }
  if (!DATABASE_URL) {
    throw new Error("Defina DATABASE_URL com a connection string do Postgres novo (Neon).");
  }

  console.log("Conectando no MySQL antigo...");
  const old = await mysql.createConnection({
    host: OLD_DB_HOST,
    database: OLD_DB_NOME,
    user: OLD_DB_USER,
    password: OLD_DB_SENHA,
  });

  const [influRows] = await old.query("SELECT * FROM influenciadores");
  const [vendaRows] = await old.query("SELECT * FROM vendas");
  const [configRows] = await old.query("SELECT * FROM config WHERE chave='valor_por_venda'");
  await old.end();

  const influenciadoresAntigos = influRows as Array<{
    id: number;
    nome: string;
    codigo: string;
    inicio: string | null;
    creatinas: number;
    meta: number;
  }>;
  const vendasAntigas = vendaRows as Array<{ influ_id: number; data: string; quantidade: number }>;
  const valorPorVenda = (configRows as Array<{ valor: string }>)[0]?.valor ?? "10";

  console.log(`Encontrados ${influenciadoresAntigos.length} influenciadores e ${vendasAntigas.length} vendas.`);

  console.log("Conectando no Postgres novo...");
  const sql = neon(DATABASE_URL);
  const db = drizzle(sql, { schema });

  await db.insert(schema.config).values({ chave: "valor_por_venda", valor: String(valorPorVenda) }).onConflictDoNothing();

  for (const antigo of influenciadoresAntigos) {
    const [novoInflu] = await db
      .insert(schema.influenciadores)
      .values({ nome: antigo.nome, codigo: antigo.codigo || "" })
      .returning();

    const [novoCiclo] = await db
      .insert(schema.ciclos)
      .values({
        influId: novoInflu.id,
        dataInicio: antigo.inicio || new Date().toISOString().slice(0, 10),
        potesEnviados: antigo.creatinas > 0 ? antigo.creatinas : antigo.meta > 0 ? antigo.meta : 2,
        status: "aberto",
      })
      .returning();

    const vendasDoInflu = vendasAntigas.filter((v) => v.influ_id === antigo.id);
    for (const v of vendasDoInflu) {
      await db.insert(schema.vendas).values({
        cicloId: novoCiclo.id,
        data: v.data,
        quantidade: v.quantidade,
      });
    }

    console.log(
      `✔ ${antigo.nome} → ciclo #${novoCiclo.id} (${vendasDoInflu.length} venda(s) migrada(s))`
    );
  }

  console.log(
    "\nMigração concluída. Todo mundo entrou como ciclo 'aberto' com a data de início original — " +
      "reveja no dashboard os que já passaram de 60 dias, pois vão cair direto na fila de avaliação pendente."
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
