import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { sincronizar } from "@/lib/nuvemshop";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Botão "Sincronizar" do painel: importa os pedidos desde a data escolhida.
export async function POST(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ erro: "senha_invalida" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const desde = String(body?.desde ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(desde)) {
    return NextResponse.json({ erro: "data_invalida" }, { status: 400 });
  }
  try {
    return NextResponse.json({ ok: true, ...(await sincronizar(desde)) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ erro: msg }, { status: msg === "nuvemshop_nao_conectada" ? 400 : 502 });
  }
}

// Cron diário do Vercel (rede de segurança para webhooks perdidos): últimos 7 dias.
export async function GET(req: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || req.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "nao_autorizado" }, { status: 401 });
  }
  const desde = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  try {
    return NextResponse.json({ ok: true, desde, ...(await sincronizar(desde)) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === "nuvemshop_nao_conectada") return NextResponse.json({ ok: true, ignorado: msg });
    return NextResponse.json({ erro: msg }, { status: 502 });
  }
}
