import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { isAuthed } from "@/lib/auth";
import { getDb } from "@/db/client";
import { influenciadores } from "@/db/schema";
import { dadosPixDoCorpo } from "@/lib/pix";

// Salva (ou limpa, com chave vazia) os dados de PIX para pagamento da comissão.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) {
    return NextResponse.json({ erro: "senha_invalida" }, { status: 401 });
  }
  const { id } = await params;
  const pix = dadosPixDoCorpo(await req.json().catch(() => ({})));
  if ("erro" in pix) return NextResponse.json({ erro: pix.erro }, { status: 400 });

  const db = await getDb();
  const [atualizado] = await db
    .update(influenciadores)
    .set(pix.dados)
    .where(eq(influenciadores.id, Number(id)))
    .returning();
  if (!atualizado) return NextResponse.json({ erro: "influenciador_nao_encontrado" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) {
    return NextResponse.json({ erro: "senha_invalida" }, { status: 401 });
  }
  const { id } = await params;
  const db = await getDb();
  await db.delete(influenciadores).where(eq(influenciadores.id, Number(id)));
  return NextResponse.json({ ok: true });
}
