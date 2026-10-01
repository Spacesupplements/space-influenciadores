import { NextResponse } from "next/server";
import {
  assinaturaValida,
  buscarPedido,
  lerCredenciais,
  processarPedido,
  removerPedido,
} from "@/lib/nuvemshop";

export const dynamic = "force-dynamic";

// Rota pública: a autenticidade vem da assinatura HMAC com o segredo do app.
export async function POST(req: Request) {
  const corpo = await req.text();
  if (!assinaturaValida(corpo, req.headers.get("x-linkedstore-hmac-sha256"))) {
    return NextResponse.json({ erro: "assinatura_invalida" }, { status: 401 });
  }

  let evento: { store_id?: number | string; event?: string; id?: number | string };
  try {
    evento = JSON.parse(corpo);
  } catch {
    return NextResponse.json({ erro: "json_invalido" }, { status: 400 });
  }

  const cred = await lerCredenciais();
  if (!cred || String(evento.store_id) !== cred.storeId) {
    // Loja desconhecida: responde 200 pra Nuvemshop não ficar reenviando.
    return NextResponse.json({ ok: true, ignorado: "loja_desconhecida" });
  }
  if (!evento.event?.startsWith("order/") || evento.id === undefined) {
    return NextResponse.json({ ok: true, ignorado: "evento_nao_tratado" });
  }

  // Busca o estado atual do pedido em vez de confiar no tipo do evento: assim
  // pagamento, cancelamento e estorno passam todos pela mesma regra.
  // Se falhar, devolve 500 e a Nuvemshop reenvia (até 48h); a sincronização diária cobre o resto.
  const pedido = await buscarPedido(cred, String(evento.id));
  if (!pedido) {
    await removerPedido(String(evento.id));
    return NextResponse.json({ ok: true, resultado: "pedido_inexistente" });
  }
  const resultado = await processarPedido(pedido);
  return NextResponse.json({ ok: true, resultado });
}
