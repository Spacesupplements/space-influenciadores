import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { influenciadores, ciclos, vendas, config } from "@/db/schema";
import { avaliarCiclo } from "@/lib/regras";
import {
  comissaoDoMes,
  comissaoTotal,
  lerRegraComissao,
  proximaFaixa,
  usaFaixas,
  valorPorUnidade,
} from "@/lib/comissao";
import { BotaoCopiar } from "./BotaoCopiar";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Space · Meu painel de parceria",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function nomeMes(yyyyMm: string, comAno = true) {
  const [ano, mes] = yyyyMm.split("-");
  const nome = MESES[parseInt(mes) - 1];
  return comAno ? `${nome}/${ano}` : nome;
}

function reais(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function PortalInfluenciadora({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = await getDb();

  const [inf] = await db.select().from(influenciadores).where(eq(influenciadores.tokenAcesso, token));
  if (!inf) notFound();

  const ciclosDela = await db.select().from(ciclos).where(eq(ciclos.influId, inf.id));
  const cicloIds = ciclosDela.map((c) => c.id);
  const vendasDela = cicloIds.length
    ? await db.select().from(vendas).where(inArray(vendas.cicloId, cicloIds))
    : [];
  const configRows = await db.select().from(config);

  const regra = lerRegraComissao(configRows);
  const beneficio = configRows.find((c) => c.chave === "beneficio_cupom")?.valor ?? "";

  const mesAtual = new Date().toISOString().slice(0, 7);
  const porMes = new Map<string, number>();
  for (const v of vendasDela) {
    const m = v.data.slice(0, 7);
    porMes.set(m, (porMes.get(m) ?? 0) + v.quantidade);
  }
  const vendasMes = porMes.get(mesAtual) ?? 0;
  const proxima = proximaFaixa(regra, mesAtual, vendasMes);
  const vendasTotal = vendasDela.reduce((s, v) => s + v.quantidade, 0);
  const meses = Array.from(porMes.keys()).sort().reverse();

  const cicloAberto = ciclosDela
    .filter((c) => c.status === "aberto")
    .sort((a, b) => (a.dataInicio < b.dataInicio ? 1 : -1))[0];
  const progresso = cicloAberto
    ? avaliarCiclo({
        status: cicloAberto.status,
        dataInicio: cicloAberto.dataInicio,
        potesEnviados: cicloAberto.potesEnviados,
        vendasTotal: vendasDela
          .filter((v) => v.cicloId === cicloAberto.id)
          .reduce((s, v) => s + v.quantidade, 0),
        postsTotal: 0,
      })
    : null;

  const cupom = inf.codigo || "";
  const nomeLimpo = inf.nome.replace(/^@/, "").split(" ")[0];
  const primeiroNome = nomeLimpo.charAt(0).toUpperCase() + nomeLimpo.slice(1);
  const mensagem =
    `Use meu cupom ${cupom} na Space Supplements!` +
    (beneficio ? ` ${beneficio}` : "") +
    `\nusespacesupplements.com.br`;

  return (
    <div className="wrap" style={{ maxWidth: 760 }}>
      <header>
        <div className="logo">
          <div className="planet">
            <img src="/brand/space-supplements-logo.jpg" alt="Space Supplements" />
          </div>
          <div>
            <h1>Olá, {primeiroNome}!</h1>
            <span>PARCERIA SPACE SUPPLEMENTS</span>
          </div>
        </div>
        {cupom && (
          <div className="valor-box">
            <label>Seu cupom:</label>
            <span className="codigo" style={{ fontSize: 15 }}>{cupom}</span>
            <BotaoCopiar texto={cupom} rotulo="Copiar" />
          </div>
        )}
      </header>

      <div className="panel">
        <h2>Este mês ({nomeMes(mesAtual, false)})</h2>
        <div className="stats" style={{ gridTemplateColumns: "1fr 1fr", marginBottom: 0 }}>
          <div className="stat white">
            <div className="k">Potes vendidos com seu cupom</div>
            <div className="v">{vendasMes}</div>
          </div>
          <div className="stat money">
            <div className="k">Sua comissão no mês</div>
            <div className="v">{reais(comissaoDoMes(regra, mesAtual, vendasMes))}</div>
            <div className="sub">{reais(valorPorUnidade(regra, mesAtual, vendasMes))} por pote vendido</div>
          </div>
        </div>
        {proxima && (
          <p className="hint">
            🚀 Faltam <b>{proxima.faltam} {proxima.faltam === 1 ? "pote" : "potes"}</b> este mês para
            todas as suas vendas do mês passarem a valer <b>{reais(proxima.valor)}</b> cada.
          </p>
        )}
        {usaFaixas(regra, mesAtual) && (
          <div className="table-wrap" style={{ marginTop: 14 }}>
            <table>
              <thead>
                <tr>
                  <th>Vendas no mês</th>
                  <th>Comissão por pote</th>
                </tr>
              </thead>
              <tbody>
                {regra.faixas.map((f, i) => {
                  const ate = regra.faixas[i + 1] ? regra.faixas[i + 1].min - 1 : null;
                  const atual = vendasMes >= f.min && (ate === null || vendasMes <= ate);
                  return (
                    <tr key={f.min} style={atual ? { background: "var(--lilac-soft)", fontWeight: 700 } : undefined}>
                      <td>{ate ? `${f.min} a ${ate}` : `${f.min} ou mais`}</td>
                      <td>
                        {reais(f.valor)}
                        {atual ? " ← você está aqui" : ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {progresso && cicloAberto && cicloAberto.potesEnviados > 0 && (
        <div className="panel">
          <h2>Ciclo atual</h2>
          <div className={"progress " + (progresso.bateuMeta ? "over" : "")} style={{ marginTop: 8 }}>
            <div
              style={{
                width: Math.min(100, (progresso.vendasTotal / progresso.metaUnidades) * 100) + "%",
              }}
            />
          </div>
          <p className="hint">
            {progresso.bateuMeta ? (
              <>
                <b>{progresso.vendasTotal} potes vendidos</b> neste ciclo — meta de{" "}
                {progresso.metaUnidades} batida, parabéns! 🚀
              </>
            ) : (
              <>
                <b>
                  {progresso.vendasTotal} de {progresso.metaUnidades} potes vendidos
                </b>{" "}
                neste ciclo
              </>
            )}
            {progresso.diasRestantes > 0 ? ` · faltam ${progresso.diasRestantes} dias` : ""}
          </p>
        </div>
      )}

      <div className="panel">
        <h2>Desde o início</h2>
        <div className="stats" style={{ gridTemplateColumns: "1fr 1fr", marginBottom: 0 }}>
          <div className="stat white">
            <div className="k">Potes vendidos</div>
            <div className="v">{vendasTotal}</div>
          </div>
          <div className="stat money">
            <div className="k">Comissão acumulada</div>
            <div className="v">{reais(comissaoTotal(regra, vendasDela))}</div>
          </div>
        </div>
      </div>

      <div className="panel">
        <h2>Mês a mês</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Mês</th>
                <th>Potes vendidos</th>
                <th>Comissão</th>
              </tr>
            </thead>
            <tbody>
              {meses.length === 0 && (
                <tr>
                  <td colSpan={3} className="empty">
                    Ainda sem vendas pelo seu cupom. Assim que alguém usar, aparece aqui.
                  </td>
                </tr>
              )}
              {meses.map((m) => (
                <tr key={m}>
                  <td style={{ fontWeight: 600 }}>{nomeMes(m)}</td>
                  <td>{porMes.get(m)}</td>
                  <td>{reais(comissaoDoMes(regra, m, porMes.get(m) ?? 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="hint">A comissão de cada mês é paga no início do mês seguinte.</p>
      </div>

      {cupom && (
        <div className="panel">
          <h2>O que seu cupom dá</h2>
          {beneficio ? (
            <p style={{ lineHeight: 1.6, marginBottom: 16, whiteSpace: "pre-line" }}>{beneficio}</p>
          ) : (
            <p className="desc">Use seu cupom {cupom} no site usespacesupplements.com.br.</p>
          )}
          <BotaoCopiar texto={mensagem} rotulo="Copiar mensagem para divulgar" grande />
        </div>
      )}

      <p className="hint" style={{ textAlign: "center" }}>
        As vendas aparecem aqui assim que são registradas pela equipe Space.
      </p>
    </div>
  );
}
