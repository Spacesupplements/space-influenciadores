import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { isAuthed } from "@/lib/auth";
import { getDb } from "@/db/client";
import { entregas, motoboys } from "@/db/schema";

export async function POST(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ erro: "senha_invalida" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const motoboyId = Number(body?.motoboyId);
  const quantidade = parseInt(String(body?.quantidade));
  const data = String(body?.data ?? "");
  if (!motoboyId) return NextResponse.json({ erro: "Selecione o motoboy." }, { status: 400 });
  if (!Number.isInteger(quantidade) || quantidade < 1) {
    return NextResponse.json({ erro: "Quantidade de entregas inválida." }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return NextResponse.json({ erro: "Data inválida." }, { status: 400 });

  const db = await getDb();
  const [moto] = await db.select().from(motoboys).where(eq(motoboys.id, motoboyId));
  if (!moto) return NextResponse.json({ erro: "motoboy_nao_encontrado" }, { status: 404 });

  const [criada] = await db
    .insert(entregas)
    .values({
      motoboyId,
      data,
      quantidade,
      valorUnitario: moto.valorEntrega,
      observacao: String(body?.observacao ?? "").trim() || null,
    })
    .returning();
  return NextResponse.json({ ok: true, entrega: criada });
}
