import { createHmac, timingSafeEqual } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { ciclos, config, influenciadores, pedidosIgnorados, vendas } from "@/db/schema";

// Sobrescrevível só para testes locais com um servidor falso.
const API_BASE = process.env.NUVEMSHOP_API_BASE || "https://api.nuvemshop.com.br/2025-03";
// A Nuvemshop exige User-Agent com nome do app + link ou contato (senão responde 400).
const USER_AGENT = "Space Influenciadores (https://influenciadores.usespacesupplements.com.br)";

export interface PedidoNuvemshop {
  id: number | string;
  number?: number | string;
  status?: string; // open | closed | cancelled
  payment_status?: string; // paid | pending | refunded | voided | ...
  paid_at?: string | null;
  created_at?: string;
  coupon?: { code?: string }[] | null;
  products?: { quantity?: number | string }[];
}

export type ResultadoPedido =
  | "importado"
  | "removido"
  | "sem_cupom"
  | "cupom_nao_cadastrado"
  | "sem_ciclo_ativo"
  | "nao_pago";

// ---------- credenciais (gravadas no banco após a instalação do app) ----------

export async function lerCredenciais(): Promise<{ storeId: string; token: string } | null> {
  const db = await getDb();
  const rows = await db.select().from(config);
  const storeId = rows.find((r) => r.chave === "nuvemshop_store_id")?.valor;
  const token = rows.find((r) => r.chave === "nuvemshop_access_token")?.valor;
  return storeId && token ? { storeId, token } : null;
}

export async function salvarCredenciais(storeId: string, token: string) {
  const db = await getDb();
  for (const [chave, valor] of [
    ["nuvemshop_store_id", storeId],
    ["nuvemshop_access_token", token],
  ]) {
    await db
      .insert(config)
      .values({ chave, valor })
      .onConflictDoUpdate({ target: config.chave, set: { valor: sql`excluded.valor` } });
  }
}

// ---------- chamadas à API ----------

export async function chamarApi(
  cred: { storeId: string; token: string },
  caminho: string,
  init?: RequestInit
): Promise<Response> {
  const res = await fetch(`${API_BASE}/${cred.storeId}${caminho}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${cred.token}`,
      "User-Agent": USER_AGENT,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  return res;
}

export async function buscarPedido(cred: { storeId: string; token: string }, id: string) {
  const res = await chamarApi(cred, `/orders/${encodeURIComponent(id)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Nuvemshop GET /orders/${id} -> ${res.status}`);
  return (await res.json()) as PedidoNuvemshop;
}

/** Todos os pedidos criados desde `desde` (YYYY-MM-DD), paginando. */
export async function listarPedidos(cred: { storeId: string; token: string }, desde: string) {
  const todos: PedidoNuvemshop[] = [];
  for (let page = 1; page <= 100; page++) {
    const qs = new URLSearchParams({
      created_at_min: `${desde}T00:00:00-03:00`,
      per_page: "200",
      page: String(page),
    });
    const res = await chamarApi(cred, `/orders?${qs}`);
    // A API responde 404 quando a página pedida já passou do fim da lista.
    if (res.status === 404) break;
    if (!res.ok) throw new Error(`Nuvemshop GET /orders -> ${res.status}: ${await res.text()}`);
    const lote = (await res.json()) as PedidoNuvemshop[];
    todos.push(...lote);
    if (lote.length < 200) break;
  }
  return todos;
}

// ---------- assinatura dos webhooks ----------

export function assinaturaValida(corpoBruto: string, assinatura: string | null): boolean {
  const segredo = process.env.NUVEMSHOP_CLIENT_SECRET;
  if (!segredo || !assinatura) return false;
  const esperado = createHmac("sha256", segredo).update(corpoBruto).digest("hex");
  const a = Buffer.from(esperado);
  const b = Buffer.from(assinatura.trim().toLowerCase());
  return a.length === b.length && timingSafeEqual(a, b);
}

// ---------- regra de negócio ----------

/** Data (YYYY-MM-DD) no fuso de São Paulo — define em qual mês a comissão cai. */
export function dataLocal(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function contaComoVenda(p: PedidoNuvemshop) {
  return p.payment_status === "paid" && p.status !== "cancelled";
}

export async function removerPedido(pedidoId: string): Promise<boolean> {
  const db = await getDb();
  const apagadas = await db.delete(vendas).where(eq(vendas.pedidoNuvemshop, pedidoId)).returning();
  await db.delete(pedidosIgnorados).where(eq(pedidosIgnorados.pedidoNuvemshop, pedidoId));
  return apagadas.length > 0;
}

/**
 * Aplica um pedido da Nuvemshop ao painel. Idempotente: pode ser chamado várias
 * vezes para o mesmo pedido (reenvio de webhook, sincronização) sem duplicar.
 */
export async function processarPedido(p: PedidoNuvemshop): Promise<ResultadoPedido> {
  const pedidoId = String(p.id);

  if (!contaComoVenda(p)) {
    return (await removerPedido(pedidoId)) ? "removido" : "nao_pago";
  }

  // Compara sem espaços: um cadastro como "RAQUEL MELO" precisa casar com o cupom "RAQUELMELO".
  const cupom = (p.coupon?.[0]?.code ?? "").replace(/\s+/g, "").toUpperCase();
  if (!cupom) return "sem_cupom";

  const quantidade = (p.products ?? []).reduce((s, it) => s + (parseInt(String(it.quantity)) || 0), 0);
  const data = dataLocal(p.paid_at || p.created_at || new Date().toISOString());
  const db = await getDb();

  const registrarIgnorado = async (motivo: "cupom_nao_cadastrado" | "sem_ciclo_ativo") => {
    // Se antes tinha entrado como venda (ex: cupom foi trocado), sai da comissão.
    await db.delete(vendas).where(eq(vendas.pedidoNuvemshop, pedidoId));
    await db
      .insert(pedidosIgnorados)
      .values({ pedidoNuvemshop: pedidoId, numero: String(p.number ?? ""), cupom, data, quantidade, motivo })
      .onConflictDoUpdate({
        target: pedidosIgnorados.pedidoNuvemshop,
        set: { cupom, data, quantidade, motivo },
      });
    return motivo;
  };

  const [inf] = await db
    .select()
    .from(influenciadores)
    .where(sql`upper(regexp_replace(${influenciadores.codigo}, '[[:space:]]', '', 'g')) = ${cupom}`);
  if (!inf) return registrarIgnorado("cupom_nao_cadastrado");

  // Descartada/bloqueada = sem ciclo aberto = não entra na comissão.
  const [cicloAberto] = await db
    .select()
    .from(ciclos)
    .where(and(eq(ciclos.influId, inf.id), eq(ciclos.status, "aberto")))
    .orderBy(desc(ciclos.dataInicio))
    .limit(1);
  if (!cicloAberto) return registrarIgnorado("sem_ciclo_ativo");

  await db
    .insert(vendas)
    .values({ cicloId: cicloAberto.id, data, quantidade, origem: "nuvemshop", pedidoNuvemshop: pedidoId })
    .onConflictDoUpdate({ target: vendas.pedidoNuvemshop, set: { data, quantidade } });
  await db.delete(pedidosIgnorados).where(eq(pedidosIgnorados.pedidoNuvemshop, pedidoId));
  return "importado";
}

export async function sincronizar(desde: string) {
  const cred = await lerCredenciais();
  if (!cred) throw new Error("nuvemshop_nao_conectada");
  const pedidos = await listarPedidos(cred, desde);
  const resumo: Record<ResultadoPedido, number> = {
    importado: 0,
    removido: 0,
    sem_cupom: 0,
    cupom_nao_cadastrado: 0,
    sem_ciclo_ativo: 0,
    nao_pago: 0,
  };
  for (const p of pedidos) resumo[await processarPedido(p)]++;
  return { pedidosLidos: pedidos.length, ...resumo };
}
