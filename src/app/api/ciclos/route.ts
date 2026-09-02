import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { getDb } from "@/db/client";
import { ciclos } from "@/db/schema";
import { parseNonNegativeInt } from "@/lib/parse";

export async function POST(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ erro: "senha_invalida" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const influId = parseInt(body?.influId);
  if (!influId) {
    return NextResponse.json({ erro: "influ_invalido" }, { status: 400 });
  }
  const dataInicio = body?.dataInicio || new Date().toISOString().slice(0, 10);
  const potesEnviados = parseNonNegativeInt(body?.potesEnviados, 2);

  const db = await getDb();
  const [ciclo] = await db
    .insert(ciclos)
    .values({ influId, dataInicio, potesEnviados, status: "aberto" })
    .returning();

  return NextResponse.json({ ok: true, ciclo });
}
