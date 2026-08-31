import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { isAuthed } from "@/lib/auth";
import { getDb } from "@/db/client";
import { ciclos } from "@/db/schema";

const ACOES: Record<string, string> = {
  renovar: "renovado",
  descartar: "descartado",
  bloquear: "bloqueado",
};

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) {
    return NextResponse.json({ erro: "senha_invalida" }, { status: 401 });
  }
  const { id } = await params;
  const cicloId = Number(id);
  const body = await req.json().catch(() => ({}));
  const acao = body?.acao as string;
  const novoStatus = ACOES[acao];
  if (!novoStatus) {
    return NextResponse.json({ erro: "acao_invalida" }, { status: 400 });
  }
  const motivo = (body?.motivo ?? "").trim();
  if (!motivo) {
    return NextResponse.json({ erro: "motivo_obrigatorio" }, { status: 400 });
  }
  const decididoPor = (body?.decididoPor ?? "").trim() || "gestor";

  const db = await getDb();
  const [cicloAtual] = await db.select().from(ciclos).where(eq(ciclos.id, cicloId));
  if (!cicloAtual) {
    return NextResponse.json({ erro: "ciclo_nao_encontrado" }, { status: 404 });
  }

  const hoje = new Date().toISOString().slice(0, 10);
  const [cicloAtualizado] = await db
    .update(ciclos)
    .set({ status: novoStatus, dataDecisao: hoje, motivo, decididoPor })
    .where(eq(ciclos.id, cicloId))
    .returning();

  let novoCiclo = null;
  if (acao === "renovar") {
    const potesEnviados = parseInt(body?.potesEnviados) || cicloAtual.potesEnviados;
    const [criado] = await db
      .insert(ciclos)
      .values({ influId: cicloAtual.influId, dataInicio: hoje, potesEnviados, status: "aberto" })
      .returning();
    novoCiclo = criado;
  }

  return NextResponse.json({ ok: true, ciclo: cicloAtualizado, novoCiclo });
}
