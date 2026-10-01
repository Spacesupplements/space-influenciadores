import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { isAuthed } from "@/lib/auth";
import { getDb } from "@/db/client";
import { influenciadores } from "@/db/schema";
import { novoTokenAcesso } from "@/lib/token";

// Gera (ou troca) o link do portal. Trocar invalida o link antigo na hora.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) {
    return NextResponse.json({ erro: "senha_invalida" }, { status: 401 });
  }
  const { id } = await params;
  const db = await getDb();
  const [atualizado] = await db
    .update(influenciadores)
    .set({ tokenAcesso: novoTokenAcesso() })
    .where(eq(influenciadores.id, Number(id)))
    .returning();
  if (!atualizado) {
    return NextResponse.json({ erro: "influenciador_nao_encontrado" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, tokenAcesso: atualizado.tokenAcesso });
}
