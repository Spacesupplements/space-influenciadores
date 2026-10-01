import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { getDb } from "@/db/client";
import { influenciadores, ciclos } from "@/db/schema";
import { parseNonNegativeInt } from "@/lib/parse";
import { novoTokenAcesso } from "@/lib/token";

export async function POST(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ erro: "senha_invalida" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const nome = (body?.nome ?? "").trim();
  if (!nome) {
    return NextResponse.json({ erro: "nome_obrigatorio" }, { status: 400 });
  }
  const codigo = (body?.codigo ?? "").trim().toUpperCase();
  const dataInicio = body?.dataInicio || new Date().toISOString().slice(0, 10);
  const potesEnviados = parseNonNegativeInt(body?.potesEnviados, 2);

  const db = await getDb();
  const [inf] = await db
    .insert(influenciadores)
    .values({ nome, codigo, tokenAcesso: novoTokenAcesso() })
    .returning();
  const [ciclo] = await db
    .insert(ciclos)
    .values({ influId: inf.id, dataInicio, potesEnviados, status: "aberto" })
    .returning();

  return NextResponse.json({ ok: true, influenciador: inf, ciclo });
}
