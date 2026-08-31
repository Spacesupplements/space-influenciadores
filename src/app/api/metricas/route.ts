import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { getDb } from "@/db/client";
import { metricasCiclo } from "@/db/schema";

export async function POST(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ erro: "senha_invalida" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const cicloId = parseInt(body?.cicloId);
  if (!cicloId) {
    return NextResponse.json({ erro: "ciclo_invalido" }, { status: 400 });
  }
  const dataRegistro = body?.dataRegistro || new Date().toISOString().slice(0, 10);
  const postsQtd = Math.max(0, parseInt(body?.postsQtd) || 0);
  const engajamentoMedio = body?.engajamentoMedio !== undefined && body?.engajamentoMedio !== ""
    ? String(Number(body.engajamentoMedio))
    : null;
  const viewsMedio = body?.viewsMedio !== undefined && body?.viewsMedio !== ""
    ? parseInt(body.viewsMedio)
    : null;
  const evidenciaUrl = (body?.evidenciaUrl ?? "").trim() || null;

  const db = await getDb();
  const [metrica] = await db
    .insert(metricasCiclo)
    .values({ cicloId, dataRegistro, postsQtd, engajamentoMedio, viewsMedio, evidenciaUrl })
    .returning();
  return NextResponse.json({ ok: true, metrica });
}
