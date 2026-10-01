import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { getDb } from "@/db/client";
import { config } from "@/db/schema";
import { sql } from "drizzle-orm";
import { normalizarFaixas } from "@/lib/comissao";

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
  if (body?.faixasComissao !== undefined) {
    try {
      const faixas = normalizarFaixas(body.faixasComissao);
      updates.push({ chave: "faixas_comissao", valor: JSON.stringify(faixas) });
    } catch {
      return NextResponse.json(
        { erro: "Faixas inválidas: a primeira precisa começar em 1 e não pode haver mínimos repetidos." },
        { status: 400 }
      );
    }
  }
  if (body?.inicioFaixas !== undefined) {
    if (!/^\d{4}-\d{2}$/.test(String(body.inicioFaixas))) {
      return NextResponse.json({ erro: "Mês de início inválido." }, { status: 400 });
    }
    updates.push({ chave: "inicio_faixas", valor: String(body.inicioFaixas) });
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
