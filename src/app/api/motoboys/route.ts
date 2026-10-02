import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { getDb } from "@/db/client";
import { motoboys } from "@/db/schema";

export async function POST(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ erro: "senha_invalida" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const nome = String(body?.nome ?? "").trim();
  if (!nome) return NextResponse.json({ erro: "Informe o nome do motoboy." }, { status: 400 });
  const valor = Number(body?.valorEntrega ?? 10);
  if (!Number.isFinite(valor) || valor < 0) {
    return NextResponse.json({ erro: "Valor por entrega inválido." }, { status: 400 });
  }

  const db = await getDb();
  const [criado] = await db.insert(motoboys).values({ nome, valorEntrega: valor.toFixed(2) }).returning();
  return NextResponse.json({ ok: true, motoboy: criado });
}
