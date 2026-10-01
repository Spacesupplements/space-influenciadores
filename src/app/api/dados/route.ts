import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { getDb } from "@/db/client";
import { influenciadores, ciclos, vendas, metricasCiclo, config } from "@/db/schema";
import { avaliarCiclo } from "@/lib/regras";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthed())) {
    return NextResponse.json({ erro: "senha_invalida" }, { status: 401 });
  }

  const db = await getDb();

  const [influList, cicloList, vendaList, metricaList, configRows] = await Promise.all([
    db.select().from(influenciadores),
    db.select().from(ciclos),
    db.select().from(vendas),
    db.select().from(metricasCiclo),
    db.select().from(config),
  ]);

  const valorPorVenda = Number(configRows.find((c) => c.chave === "valor_por_venda")?.valor ?? 10);
  const beneficioCupom = configRows.find((c) => c.chave === "beneficio_cupom")?.valor ?? "";

  const vendasPorCiclo = new Map<number, { total: number; itens: typeof vendaList }>();
  for (const v of vendaList) {
    const atual = vendasPorCiclo.get(v.cicloId) ?? { total: 0, itens: [] as typeof vendaList };
    atual.total += v.quantidade;
    atual.itens.push(v);
    vendasPorCiclo.set(v.cicloId, atual);
  }

  const metricasPorCiclo = new Map<number, { postsTotal: number; itens: typeof metricaList }>();
  for (const m of metricaList) {
    const atual = metricasPorCiclo.get(m.cicloId) ?? { postsTotal: 0, itens: [] as typeof metricaList };
    atual.postsTotal += m.postsQtd;
    atual.itens.push(m);
    metricasPorCiclo.set(m.cicloId, atual);
  }

  const ciclosMontados = cicloList.map((c) => {
    const v = vendasPorCiclo.get(c.id) ?? { total: 0, itens: [] };
    const m = metricasPorCiclo.get(c.id) ?? { postsTotal: 0, itens: [] };
    const ultimaMetrica = m.itens.slice().sort((a, b) => (a.dataRegistro < b.dataRegistro ? 1 : -1))[0];
    const avaliacao = avaliarCiclo({
      status: c.status,
      dataInicio: c.dataInicio,
      potesEnviados: c.potesEnviados,
      vendasTotal: v.total,
      postsTotal: m.postsTotal,
    });
    return {
      id: c.id,
      influId: c.influId,
      dataInicio: c.dataInicio,
      potesEnviados: c.potesEnviados,
      status: c.status,
      dataDecisao: c.dataDecisao,
      decididoPor: c.decididoPor,
      motivo: c.motivo,
      vendas: v.itens.map((it) => ({ id: it.id, data: it.data, quantidade: it.quantidade })),
      vendasTotal: v.total,
      postsTotal: m.postsTotal,
      engajamentoMedio: ultimaMetrica?.engajamentoMedio ?? null,
      viewsMedio: ultimaMetrica?.viewsMedio ?? null,
      metricas: m.itens,
      avaliacao,
    };
  });

  const influenciadoresMontados = influList.map((inf) => ({
    id: inf.id,
    nome: inf.nome,
    codigo: inf.codigo,
    tokenAcesso: inf.tokenAcesso,
    ciclos: ciclosMontados
      .filter((c) => c.influId === inf.id)
      .sort((a, b) => (a.dataInicio < b.dataInicio ? 1 : -1)),
  }));

  return NextResponse.json(
    {
      ok: true,
      influenciadores: influenciadoresMontados,
      valorPorVenda,
      beneficioCupom,
    },
    { headers: { "Cache-Control": "no-store, must-revalidate" } }
  );
}
