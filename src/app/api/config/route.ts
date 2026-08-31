import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { getDb } from "@/db/client";
import { config } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function POST(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ erro: "senha_invalida" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const valor = String(Number(body?.valor) || 0);

  const db = await getDb();
  await db
    .insert(config)
    .values({ chave: "valor_por_venda", valor })
    .onConflictDoUpdate({ target: config.chave, set: { valor: sql`excluded.valor` } });

  return NextResponse.json({ ok: true });
}
