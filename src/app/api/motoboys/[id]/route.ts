import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { isAuthed } from "@/lib/auth";
import { getDb } from "@/db/client";
import { motoboys } from "@/db/schema";
import { dadosPixDoCorpo, type DadosPix } from "@/lib/pix";

// Atualiza valor por entrega e/ou PIX. Mudar o valor só afeta lançamentos futuros.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) {
    return NextResponse.json({ erro: "senha_invalida" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const set: Partial<DadosPix & { valorEntrega: string; nome: string }> = {};
  if (body?.valorEntrega !== undefined) {
    const valor = Number(body.valorEntrega);
    if (!Number.isFinite(valor) || valor < 0) {
      return NextResponse.json({ erro: "Valor por entrega inválido." }, { status: 400 });
    }
    set.valorEntrega = valor.toFixed(2);
  }
  if (typeof body?.nome === "string" && body.nome.trim()) set.nome = body.nome.trim();
  if (body?.chavePix !== undefined) {
    const pix = dadosPixDoCorpo(body);
    if ("erro" in pix) return NextResponse.json({ erro: pix.erro }, { status: 400 });
    Object.assign(set, pix.dados);
  }
  if (Object.keys(set).length === 0) return NextResponse.json({ ok: true });

  const db = await getDb();
  const [atualizado] = await db.update(motoboys).set(set).where(eq(motoboys.id, Number(id))).returning();
  if (!atualizado) return NextResponse.json({ erro: "motoboy_nao_encontrado" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) {
    return NextResponse.json({ erro: "senha_invalida" }, { status: 401 });
  }
  const { id } = await params;
  const db = await getDb();
  await db.delete(motoboys).where(eq(motoboys.id, Number(id)));
  return NextResponse.json({ ok: true });
}
