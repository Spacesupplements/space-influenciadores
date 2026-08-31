import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { getDb } from "@/db/client";
import { vendas } from "@/db/schema";

export async function POST(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ erro: "senha_invalida" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const cicloId = parseInt(body?.cicloId);
  if (!cicloId) {
    return NextResponse.json({ erro: "ciclo_invalido" }, { status: 400 });
  }
  const data = body?.data || new Date().toISOString().slice(0, 10);
  const quantidade = Math.max(1, parseInt(body?.quantidade) || 1);

  const db = await getDb();
  const [venda] = await db.insert(vendas).values({ cicloId, data, quantidade }).returning();
  return NextResponse.json({ ok: true, venda });
}
