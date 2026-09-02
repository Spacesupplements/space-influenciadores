import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { isAuthed } from "@/lib/auth";
import { getDb } from "@/db/client";
import { ciclos } from "@/db/schema";
import { parseNonNegativeInt } from "@/lib/parse";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) {
    return NextResponse.json({ erro: "senha_invalida" }, { status: 401 });
  }
  const { id } = await params;
  const cicloId = Number(id);
  const body = await req.json().catch(() => ({}));

  const db = await getDb();
  const [cicloAtual] = await db.select().from(ciclos).where(eq(ciclos.id, cicloId));
  if (!cicloAtual) {
    return NextResponse.json({ erro: "ciclo_nao_encontrado" }, { status: 404 });
  }
  if (cicloAtual.status !== "aberto") {
    return NextResponse.json({ erro: "ciclo_ja_decidido" }, { status: 400 });
  }

  const potesEnviados = parseNonNegativeInt(body?.potesEnviados, cicloAtual.potesEnviados);

  const [cicloAtualizado] = await db
    .update(ciclos)
    .set({ potesEnviados })
    .where(eq(ciclos.id, cicloId))
    .returning();

  return NextResponse.json({ ok: true, ciclo: cicloAtualizado });
}
