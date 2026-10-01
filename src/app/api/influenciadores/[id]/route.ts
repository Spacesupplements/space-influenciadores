import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { isAuthed } from "@/lib/auth";
import { getDb } from "@/db/client";
import { influenciadores } from "@/db/schema";
import { normalizarChavePix } from "@/lib/pix";

// Salva (ou limpa, com chave vazia) os dados de PIX para pagamento da comissão.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) {
    return NextResponse.json({ erro: "senha_invalida" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const entrada = String(body?.chavePix ?? "").trim();

  let dados: { tipoPix: string | null; chavePix: string | null; titularPix: string | null };
  if (!entrada) {
    dados = { tipoPix: null, chavePix: null, titularPix: null };
  } else {
    const tipo = String(body?.tipoPix ?? "");
    const r = normalizarChavePix(tipo, entrada);
    if ("erro" in r) return NextResponse.json({ erro: r.erro }, { status: 400 });
    const titular = String(body?.titularPix ?? "").trim();
    if (!titular) return NextResponse.json({ erro: "Informe o nome do titular da chave." }, { status: 400 });
    dados = { tipoPix: tipo, chavePix: r.chave, titularPix: titular };
  }

  const db = await getDb();
  const [atualizado] = await db
    .update(influenciadores)
    .set(dados)
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
