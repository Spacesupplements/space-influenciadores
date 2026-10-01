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

  const updates: { chave: string; valor: string }[] = [];
  if (body?.valor !== undefined) {
    updates.push({ chave: "valor_por_venda", valor: String(Number(body.valor) || 0) });
  }
  if (typeof body?.beneficioCupom === "string") {
    updates.push({ chave: "beneficio_cupom", valor: body.beneficioCupom.trim() });
  }

  const db = await getDb();
  for (const u of updates) {
    await db
      .insert(config)
      .values(u)
      .onConflictDoUpdate({ target: config.chave, set: { valor: sql`excluded.valor` } });
  }

  return NextResponse.json({ ok: true });
}
