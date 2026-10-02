"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { TIPOS_PIX, formatarChavePix } from "@/lib/pix";
import {
  comissaoDoMes,
  comissaoTotal,
  usaFaixas,
  valorPorUnidade,
  type Faixa,
  type RegraComissao,
} from "@/lib/comissao";

interface Venda {
  id: number;
  data: string;
  quantidade: number;
}

interface Metrica {
  id: number;
  dataRegistro: string;
  postsQtd: number;
  engajamentoMedio: string | null;
  viewsMedio: number | null;
  evidenciaUrl: string | null;
}

interface Avaliacao {
  fase: "ativo" | "risco" | "avaliacao_pendente" | "renovado" | "descartado" | "bloqueado";
  dias: number;
  diasRestantes: number;
  vendasTotal: number;
  postsTotal: number;
  metaUnidades: number;
  bateuMeta: boolean;
}

interface Ciclo {
  id: number;
  influId: number;
  dataInicio: string;
  potesEnviados: number;
  status: string;
  dataDecisao: string | null;
  decididoPor: string | null;
  motivo: string | null;
  vendas: Venda[];
  vendasTotal: number;
  postsTotal: number;
  engajamentoMedio: string | null;
  viewsMedio: number | null;
  metricas: Metrica[];
  avaliacao: Avaliacao;
}

interface Influenciador {
  id: number;
  nome: string;
  codigo: string;
  tokenAcesso: string | null;
  tipoPix: string | null;
  chavePix: string | null;
  titularPix: string | null;
  ciclos: Ciclo[];
}

interface Dados {
  influenciadores: Influenciador[];
  regraComissao: RegraComissao;
  beneficioCupom: string;
  nuvemshop: NuvemshopInfo;
  motoboys: Motoboy[];
}

interface PixInfo {
  tipoPix: string | null;
  chavePix: string | null;
  titularPix: string | null;
}

interface Entrega {
  id: number;
  data: string;
  quantidade: number;
  valorUnitario: number;
  observacao: string | null;
}

interface Motoboy extends PixInfo {
  id: number;
  nome: string;
  valorEntrega: number;
  entregas: Entrega[];
}

interface NuvemshopInfo {
  conectada: boolean;
  appConfigurado: boolean;
  ignorados: { pedido: string; cupom: string; data: string; quantidade: number; motivo: string }[];
}

interface CicloFlat extends Ciclo {
  influNome: string;
  influCodigo: string;
}

const FASE_LABEL: Record<string, { txt: string; cls: string }> = {
  ativo: { txt: "🟢 Ativo", cls: "st-ok" },
  risco: { txt: "⚠️ Risco (sem venda/post)", cls: "st-warn" },
  avaliacao_pendente: { txt: "🔎 Avaliação pendente", cls: "st-action" },
  renovado: { txt: "✅ Renovado", cls: "st-ok" },
  descartado: { txt: "🚫 Descartado", cls: "st-bad" },
  bloqueado: { txt: "⛔ Bloqueado", cls: "st-bad" },
};

function nomeMes(m: string) {
  const nomes = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const [ano, mes] = m.split("-");
  return `${nomes[parseInt(mes) - 1]}/${ano}`;
}

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

async function api(path: string, options?: RequestInit) {
  const res = await fetch(path, {
    ...options,
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
  });
  if (res.status === 401) throw new Error("unauthorized");
  return res.json();
}

export default function Home() {
  const [senha, setSenha] = useState("");
  const [logado, setLogado] = useState(false);
  const [erroLogin, setErroLogin] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [dados, setDados] = useState<Dados | null>(null);

  async function carregar() {
    setCarregando(true);
    try {
      const j = await api("/api/dados");
      if (j.erro) {
        setErroLogin(true);
        setLogado(false);
        return;
      }
      setDados(j);
      setLogado(true);
    } catch {
      setLogado(false);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carrega os dados uma vez ao montar
    carregar();
  }, []);

  async function fazerLogin() {
    setErroLogin(false);
    const j = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ senha }) });
    if (j.erro) {
      setErroLogin(true);
      return;
    }
    await carregar();
  }

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    setLogado(false);
    setDados(null);
    setSenha("");
  }

  if (!logado) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "linear-gradient(160deg,#fdfafc,#f3ecf8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            background: "#fff",
            border: "1px solid #e7dcee",
            borderRadius: 18,
            padding: "40px 34px",
            textAlign: "center",
            maxWidth: 360,
            width: "90%",
            boxShadow: "0 20px 60px rgba(102,72,130,0.12)",
          }}
        >
          <img
            src="/brand/space-supplements-logo.jpg"
            alt="Space Supplements"
            style={{
              width: 96,
              height: 96,
              borderRadius: 20,
              objectFit: "cover",
              margin: "0 auto 18px",
              boxShadow: "0 8px 24px rgba(102,72,130,0.25)",
            }}
          />
          <h2 style={{ fontFamily: "var(--head)", color: "#2d2141", fontSize: 22, marginBottom: 6 }}>
            Gestão de Influenciadores
          </h2>
          <p style={{ color: "#7d6e94", fontSize: 14, marginBottom: 22 }}>Digite a senha para entrar</p>
          <input
            type="password"
            placeholder="senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fazerLogin()}
            style={{
              width: "100%",
              background: "#faf5fb",
              border: "1px solid #e7dcee",
              borderRadius: 10,
              padding: "13px 16px",
              color: "#2d2141",
              fontSize: 15,
              marginBottom: 14,
            }}
          />
          <button className="btn" style={{ width: "100%" }} onClick={fazerLogin}>
            Entrar
          </button>
          {erroLogin && (
            <p style={{ color: "#b5453f", fontSize: 13, marginTop: 12 }}>Senha incorreta.</p>
          )}
        </div>
      </div>
    );
  }

  if (!dados) {
    return <div style={{ padding: 40, color: "#2d2141" }}>Carregando…</div>;
  }

  return <Dashboard dados={dados} recarregar={carregar} logout={logout} carregando={carregando} />;
}

function Dashboard({
  dados,
  recarregar,
  logout,
  carregando,
}: {
  dados: Dados;
  recarregar: () => Promise<void>;
  logout: () => void;
  carregando: boolean;
}) {
  const ciclosFlat: CicloFlat[] = useMemo(
    () =>
      dados.influenciadores.flatMap((inf) =>
        inf.ciclos.map((c) => ({ ...c, influNome: inf.nome, influCodigo: inf.codigo }))
      ),
    [dados]
  );

  const abertos = ciclosFlat.filter((c) => c.status === "aberto");
  const ativos = abertos.filter((c) => c.avaliacao.fase === "ativo");
  const risco = abertos.filter((c) => c.avaliacao.fase === "risco");
  const pendentes = abertos.filter((c) => c.avaliacao.fase === "avaliacao_pendente");
  const decididos = ciclosFlat
    .filter((c) => c.status !== "aberto")
    .sort((a, b) => (a.dataDecisao || "") < (b.dataDecisao || "") ? 1 : -1);

  const mesAtual = hojeISO().slice(0, 7);
  const allVendas = ciclosFlat.flatMap((c) =>
    c.vendas.map((v) => ({
      ...v,
      cicloId: c.id,
      influId: c.influId,
      influNome: c.influNome,
      influCodigo: c.influCodigo,
    }))
  );

  const mesesDisponiveis = useMemo(() => {
    const set = new Set(allVendas.map((v) => v.data.slice(0, 7)));
    for (const m of dados.motoboys) for (const e of m.entregas) set.add(e.data.slice(0, 7));
    set.add(mesAtual);
    return Array.from(set).sort().reverse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dados]);

  const [mesSelecionado, setMesSelecionado] = useState(mesAtual);

  const pagamentosMotoboy = dados.motoboys
    .map((m) => {
      const doMes = m.entregas.filter((e) => e.data.slice(0, 7) === mesSelecionado);
      return {
        motoboy: m,
        entregasMes: doMes.reduce((s, e) => s + e.quantidade, 0),
        valorMes: doMes.reduce((s, e) => s + e.quantidade * e.valorUnitario, 0),
      };
    })
    .filter((p) => p.entregasMes > 0);
  const totalMotoboy = pagamentosMotoboy.reduce((s, p) => s + p.valorMes, 0);

  const regra = dados.regraComissao;

  const vendasMes = allVendas
    .filter((v) => v.data.slice(0, 7) === mesSelecionado)
    .reduce((s, v) => s + v.quantidade, 0);

  // A faixa é por influenciadora, então o repasse do mês é a soma do cálculo de cada uma.
  const repassePorInfluenciador = dados.influenciadores
    .map((inf) => {
      const vendasDoMes = allVendas
        .filter((v) => v.influId === inf.id && v.data.slice(0, 7) === mesSelecionado)
        .reduce((s, v) => s + v.quantidade, 0);
      return {
        id: inf.id,
        nome: inf.nome,
        codigo: inf.codigo,
        inf,
        vendasDoMes,
        valorUnidade: valorPorUnidade(regra, mesSelecionado, vendasDoMes),
        repasseDoMes: comissaoDoMes(regra, mesSelecionado, vendasDoMes),
      };
    })
    .filter((r) => r.vendasDoMes > 0)
    .sort((a, b) => b.vendasDoMes - a.vendasDoMes);
  const repasseMes = repassePorInfluenciador.reduce((s, r) => s + r.repasseDoMes, 0);

  const totalPotesEnviados = ciclosFlat.reduce((s, c) => s + c.potesEnviados, 0);
  const totalVendasGeral = ciclosFlat.reduce((s, c) => s + c.vendasTotal, 0);
  const repasseTotal = dados.influenciadores.reduce(
    (s, inf) => s + comissaoTotal(regra, allVendas.filter((v) => v.influId === inf.id)),
    0
  );

  async function decidir(cicloId: number, acao: "renovar" | "descartar" | "bloquear") {
    const motivo = window.prompt(
      acao === "renovar"
        ? "Motivo da renovação (o que justificou manter a parceria):"
        : "Motivo da decisão (fica registrado no histórico):"
    );
    if (motivo === null) return;
    if (!motivo.trim()) {
      alert("O motivo é obrigatório.");
      return;
    }
    const j = await api(`/api/ciclos/${cicloId}/decisao`, {
      method: "POST",
      body: JSON.stringify({ acao, motivo }),
    });
    if (j.erro) {
      alert("Erro: " + j.erro);
      return;
    }
    await recarregar();
  }

  async function editarPotes(cicloId: number, potesAtual: number) {
    const resposta = window.prompt("Quantidade correta de potes enviados nesse ciclo:", String(potesAtual));
    if (resposta === null) return;
    const potesEnviados = parseInt(resposta);
    if (Number.isNaN(potesEnviados) || potesEnviados < 0) {
      alert("Digite um número válido (0 ou mais).");
      return;
    }
    const j = await api(`/api/ciclos/${cicloId}`, {
      method: "PATCH",
      body: JSON.stringify({ potesEnviados }),
    });
    if (j.erro) {
      alert("Erro: " + j.erro);
      return;
    }
    await recarregar();
  }

  return (
    <div className="wrap">
      <header>
        <div className="logo">
          <div className="planet">
            <img src="/brand/space-supplements-logo.jpg" alt="Space Supplements" />
          </div>
          <div>
            <h1>Gestão de Influenciadores</h1>
            <span>SPACE SUPPLEMENTS</span>
          </div>
        </div>
        <div className="top-actions">
          <div className="valor-box">
            <label>Mês:</label>
            <select
              value={mesSelecionado}
              onChange={(e) => setMesSelecionado(e.target.value)}
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--line)",
                borderRadius: 8,
                padding: "8px 10px",
                color: "var(--ink)",
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              {mesesDisponiveis.map((m) => (
                <option key={m} value={m}>
                  {nomeMes(m)}
                </option>
              ))}
            </select>
          </div>
          <button className="mini" onClick={logout}>
            Sair
          </button>
        </div>
      </header>

      <div className="stats" id="stats">
        <div className="stat white">
          <div className="k">Ciclos ativos</div>
          <div className="v">{ativos.length + risco.length}</div>
        </div>
        <div className="stat">
          <div className="k">Vendas ({nomeMes(mesSelecionado)})</div>
          <div className="v">{vendasMes}</div>
        </div>
        <div className="stat money">
          <div className="k">Repasse ({nomeMes(mesSelecionado)})</div>
          <div className="v">R$ {repasseMes.toFixed(0)}</div>
        </div>
        <div className={"stat " + (pendentes.length > 0 ? "bad" : "")}>
          <div className="k">Aguardando decisão</div>
          <div className="v">{pendentes.length}</div>
          <div className="sub">ciclos no checkpoint de 60 dias</div>
        </div>
      </div>

      {(pendentes.length > 0 || risco.length > 0) && (
        <div className="alert">
          <h3>🚨 Avaliação pendente — precisa de decisão</h3>
          <p style={{ color: "var(--star)", fontSize: 13.5, marginBottom: 12 }}>
            {pendentes.length} ciclo(s) chegaram aos 60 dias e {risco.length} estão em risco (sem venda
            nem post aos 45 dias). Decida abaixo: renovar, descartar ou bloquear.
          </p>
          <FilaAvaliacao ciclos={[...pendentes, ...risco]} onDecidir={decidir} />
        </div>
      )}

      <div className="panel">
        <h2>💳 Pagamentos do mês</h2>
        <p className="desc">
          Tudo o que há para pagar referente a <b>{nomeMes(mesSelecionado)}</b>: comissões das
          influenciadoras e entregas do motoboy. Use o seletor de mês no topo — por exemplo, setembro
          para pagar no começo de outubro.
        </p>
        <h3 style={{ fontFamily: "var(--head)", fontSize: 16, margin: "4px 0 8px" }}>Influenciadoras</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Influenciador</th>
                <th>Código</th>
                <th>Vendas no mês</th>
                <th>R$ / unidade</th>
                <th>Repasse no mês</th>
                <th>Pagar via PIX</th>
              </tr>
            </thead>
            <tbody>
              {repassePorInfluenciador.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty">
                    Nenhuma venda registrada em {nomeMes(mesSelecionado)}.
                  </td>
                </tr>
              )}
              {repassePorInfluenciador.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{r.nome}</td>
                  <td>{r.codigo ? <span className="codigo">{r.codigo}</span> : "—"}</td>
                  <td>{r.vendasDoMes}</td>
                  <td>R$ {r.valorUnidade.toFixed(2).replace(".", ",")}</td>
                  <td>
                    <span className="repasse" style={{ fontWeight: 700, color: "var(--accent)" }}>
                      R$ {r.repasseDoMes.toFixed(2).replace(".", ",")}
                    </span>
                  </td>
                  <td>
                    <ChavePixResumo inf={r.inf} comCopiar />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="hint">
          {usaFaixas(regra, mesSelecionado)
            ? "Comissão progressiva: a faixa atingida pela influenciadora no mês vale para todas as unidades dela naquele mês."
            : `Mês anterior à comissão progressiva: valor fixo de R$ ${regra.valorFixo
                .toFixed(2)
                .replace(".", ",")} por unidade.`}
        </p>

        <h3 style={{ fontFamily: "var(--head)", fontSize: 16, margin: "22px 0 8px" }}>Motoboy</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Motoboy</th>
                <th>Entregas no mês</th>
                <th>A pagar</th>
                <th>Pagar via PIX</th>
              </tr>
            </thead>
            <tbody>
              {pagamentosMotoboy.length === 0 && (
                <tr>
                  <td colSpan={4} className="empty">
                    Nenhuma entrega lançada em {nomeMes(mesSelecionado)}.
                  </td>
                </tr>
              )}
              {pagamentosMotoboy.map((p) => (
                <tr key={p.motoboy.id}>
                  <td style={{ fontWeight: 600 }}>{p.motoboy.nome}</td>
                  <td>{p.entregasMes}</td>
                  <td>
                    <span style={{ fontWeight: 700, color: "var(--accent)" }}>{brl(p.valorMes)}</span>
                  </td>
                  <td>
                    <ChavePixResumo inf={p.motoboy} comCopiar />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="stats" style={{ marginTop: 18, marginBottom: 0 }}>
          <div className="stat">
            <div className="k">Influenciadoras</div>
            <div className="v">{brl(repasseMes)}</div>
          </div>
          <div className="stat">
            <div className="k">Motoboy</div>
            <div className="v">{brl(totalMotoboy)}</div>
          </div>
          <div className="stat money" style={{ gridColumn: "span 2" }}>
            <div className="k">Total a pagar em {nomeMes(mesSelecionado)}</div>
            <div className="v">{brl(repasseMes + totalMotoboy)}</div>
          </div>
        </div>
      </div>

      <PainelMotoboy motoboys={dados.motoboys} mes={mesSelecionado} onOk={recarregar} />

      <IntegracaoNuvemshop info={dados.nuvemshop} onOk={recarregar} />

      <div className="panel">
        <h2>🔄 Ciclos ativos</h2>
        <p className="desc">
          Cada ciclo dura 60 dias. A meta é vender pelo menos a quantidade de potes enviados
          (break-even em unidades). Abaixo, o progresso de cada influenciador em parceria no momento.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Influenciador</th>
                <th>Código</th>
                <th>Início do ciclo</th>
                <th>Progresso</th>
                <th>Dias restantes</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {[...ativos, ...risco].length === 0 && (
                <tr>
                  <td colSpan={7} className="empty">
                    Nenhum ciclo ativo no momento.
                  </td>
                </tr>
              )}
              {[...ativos, ...risco].map((c) => {
                const semProduto = c.avaliacao.metaUnidades === 0;
                const pct = semProduto
                  ? 100
                  : Math.min(100, (c.avaliacao.vendasTotal / c.avaliacao.metaUnidades) * 100);
                const fase = FASE_LABEL[c.avaliacao.fase];
                return (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.influNome}</td>
                    <td>{c.influCodigo ? <span className="codigo">{c.influCodigo}</span> : "—"}</td>
                    <td>{c.dataInicio}</td>
                    <td style={{ minWidth: 160 }}>
                      {semProduto ? (
                        <div style={{ fontSize: 12, color: "var(--muted)" }}>Produto não entregue</div>
                      ) : (
                        <>
                          <div className={"progress " + (pct >= 100 ? "over" : "")}>
                            <div style={{ width: pct + "%" }} />
                          </div>
                          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                            {c.avaliacao.vendasTotal} / {c.avaliacao.metaUnidades} potes vendidos
                          </div>
                        </>
                      )}
                    </td>
                    <td>{c.avaliacao.diasRestantes}d</td>
                    <td>
                      <span className={"status " + fase.cls}>{fase.txt}</span>
                    </td>
                    <td>
                      <button className="mini" onClick={() => editarPotes(c.id, c.potesEnviados)}>
                        ✎ Potes
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <RegistrarVenda ciclosAbertos={abertos} onOk={recarregar} />
      <RegistrarMetricas ciclosAbertos={abertos} onOk={recarregar} />
      <CadastrarInfluenciador onOk={recarregar} />
      <InfluenciadoresCadastrados influenciadores={dados.influenciadores} onOk={recarregar} />
      <BeneficioCupom inicial={dados.beneficioCupom} />
      <RegraComissaoEditor regra={regra} onOk={recarregar} />

      <div className="panel">
        <h2>🏆 Ranking — vendas e presença</h2>
        <p className="desc">
          Ordenado por vendas no ciclo aberto de cada influenciador. Engajamento, views e posts ajudam a
          identificar quem tem valor de marca além da conversão direta.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Influenciador</th>
                <th>Código</th>
                <th>Vendas no ciclo</th>
                <th>Posts</th>
                <th>Engajamento médio</th>
                <th>Views médio</th>
              </tr>
            </thead>
            <tbody>
              {abertos.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty">
                    Nenhum ciclo aberto ainda.
                  </td>
                </tr>
              )}
              {abertos
                .slice()
                .sort((a, b) => b.vendasTotal - a.vendasTotal)
                .map((c, i) => (
                  <tr key={c.id}>
                    <td>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{c.influNome}</td>
                    <td>{c.influCodigo ? <span className="codigo">{c.influCodigo}</span> : "—"}</td>
                    <td>{c.vendasTotal}</td>
                    <td>{c.postsTotal}</td>
                    <td>{c.engajamentoMedio ? c.engajamentoMedio + "%" : "—"}</td>
                    <td>{c.viewsMedio ?? "—"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <h2>💰 Financeiro do programa</h2>
        <p className="desc">Visão geral de investimento (potes enviados) x retorno (vendas geradas), todos os ciclos.</p>
        <div className="stats" style={{ marginBottom: 0 }}>
          <div className="stat white">
            <div className="k">Potes enviados (total)</div>
            <div className="v">{totalPotesEnviados}</div>
          </div>
          <div className="stat">
            <div className="k">Vendas geradas (total)</div>
            <div className="v">{totalVendasGeral}</div>
          </div>
          <div className="stat money">
            <div className="k">Repasse pago (total)</div>
            <div className="v">R$ {repasseTotal.toFixed(0)}</div>
          </div>
          <div className={"stat " + (totalVendasGeral >= totalPotesEnviados ? "" : "warn")}>
            <div className="k">Break-even do programa</div>
            <div className="v">
              {totalPotesEnviados > 0 ? Math.round((totalVendasGeral / totalPotesEnviados) * 100) : 0}%
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <h2>📜 Histórico de decisões</h2>
        <p className="desc">Todos os ciclos já encerrados (renovados, descartados ou bloqueados), com o motivo registrado.</p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Influenciador</th>
                <th>Ciclo</th>
                <th>Resultado</th>
                <th>Vendas x Meta</th>
                <th>Decidido em</th>
                <th>Por</th>
                <th>Motivo</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {decididos.length === 0 && (
                <tr>
                  <td colSpan={8} className="empty">
                    Nenhuma decisão registrada ainda.
                  </td>
                </tr>
              )}
              {decididos.map((c) => {
                const fase = FASE_LABEL[c.status];
                return (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.influNome}</td>
                    <td>{c.dataInicio}</td>
                    <td>
                      <span className={"status " + fase.cls}>{fase.txt}</span>
                    </td>
                    <td>
                      {c.vendasTotal} / {c.potesEnviados}
                    </td>
                    <td>{c.dataDecisao}</td>
                    <td>{c.decididoPor}</td>
                    <td style={{ color: "var(--muted)" }}>{c.motivo}</td>
                    <td>
                      <button className="mini" onClick={() => editarPotes(c.id, c.potesEnviados)}>
                        ✎ Potes
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {carregando && <p className="hint">Atualizando…</p>}
    </div>
  );
}

function FilaAvaliacao({
  ciclos,
  onDecidir,
}: {
  ciclos: CicloFlat[];
  onDecidir: (id: number, acao: "renovar" | "descartar" | "bloquear") => void;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Influenciador</th>
            <th>Vendas x Meta</th>
            <th>Posts</th>
            <th>Situação</th>
            <th>Decisão</th>
          </tr>
        </thead>
        <tbody>
          {ciclos.map((c) => {
            const fase = FASE_LABEL[c.avaliacao.fase];
            return (
              <tr key={c.id}>
                <td style={{ fontWeight: 600 }}>{c.influNome}</td>
                <td>
                  {c.avaliacao.vendasTotal} / {c.avaliacao.metaUnidades}{" "}
                  {c.avaliacao.bateuMeta ? "✅" : ""}
                </td>
                <td>{c.postsTotal}</td>
                <td>
                  <span className={"status " + fase.cls}>{fase.txt}</span>
                </td>
                <td>
                  <div className="decisao-row">
                    <button className="mini" onClick={() => onDecidir(c.id, "renovar")}>
                      Renovar
                    </button>
                    <button className="mini del" onClick={() => onDecidir(c.id, "descartar")}>
                      Descartar
                    </button>
                    <button className="mini del" onClick={() => onDecidir(c.id, "bloquear")}>
                      Bloquear
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RegistrarVenda({ ciclosAbertos, onOk }: { ciclosAbertos: CicloFlat[]; onOk: () => Promise<void> }) {
  const [cicloId, setCicloId] = useState<number | "">("");
  const [data, setData] = useState(hojeISO());
  const [qtd, setQtd] = useState(1);

  async function registrar() {
    if (!cicloId) {
      alert("Selecione o influenciador");
      return;
    }
    const j = await api("/api/vendas", {
      method: "POST",
      body: JSON.stringify({ cicloId, data, quantidade: qtd }),
    });
    if (j.erro) {
      alert("Erro: " + j.erro);
      return;
    }
    setQtd(1);
    await onOk();
  }

  return (
    <div className="panel">
      <h2>💵 Registrar venda</h2>
      <div className="grid-form" style={{ gridTemplateColumns: "1.5fr 1fr 1fr auto" }}>
        <div className="field">
          <label>Influenciador / ciclo aberto</label>
          <select value={cicloId} onChange={(e) => setCicloId(Number(e.target.value))}>
            <option value="">Selecione…</option>
            {ciclosAbertos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.influNome} {c.influCodigo ? `(${c.influCodigo})` : ""} — desde {c.dataInicio}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Data da venda</label>
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </div>
        <div className="field">
          <label>Quantidade</label>
          <input type="number" min={1} value={qtd} onChange={(e) => setQtd(parseInt(e.target.value) || 1)} />
        </div>
        <div className="field">
          <button className="btn btn-mag" onClick={registrar}>
            Registrar venda
          </button>
        </div>
      </div>
      <p className="hint">Registre conforme os cupons forem usados no checkout — é isso que alimenta o break-even automático do ciclo.</p>
    </div>
  );
}

function RegistrarMetricas({ ciclosAbertos, onOk }: { ciclosAbertos: CicloFlat[]; onOk: () => Promise<void> }) {
  const [cicloId, setCicloId] = useState<number | "">("");
  const [posts, setPosts] = useState(0);
  const [engajamento, setEngajamento] = useState("");
  const [views, setViews] = useState("");
  const [evidencia, setEvidencia] = useState("");

  async function registrar() {
    if (!cicloId) {
      alert("Selecione o influenciador");
      return;
    }
    const j = await api("/api/metricas", {
      method: "POST",
      body: JSON.stringify({
        cicloId,
        postsQtd: posts,
        engajamentoMedio: engajamento,
        viewsMedio: views,
        evidenciaUrl: evidencia,
      }),
    });
    if (j.erro) {
      alert("Erro: " + j.erro);
      return;
    }
    setPosts(0);
    setEngajamento("");
    setViews("");
    setEvidencia("");
    await onOk();
  }

  return (
    <div className="panel">
      <h2>📈 Registrar engajamento, views e presença</h2>
      <div className="grid-form" style={{ gridTemplateColumns: "1.3fr .7fr .8fr .8fr 1.3fr auto" }}>
        <div className="field">
          <label>Influenciador / ciclo aberto</label>
          <select value={cicloId} onChange={(e) => setCicloId(Number(e.target.value))}>
            <option value="">Selecione…</option>
            {ciclosAbertos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.influNome} {c.influCodigo ? `(${c.influCodigo})` : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Posts/stories</label>
          <input type="number" min={0} value={posts} onChange={(e) => setPosts(parseInt(e.target.value) || 0)} />
        </div>
        <div className="field">
          <label>Engajamento (%)</label>
          <input type="number" min={0} step={0.1} value={engajamento} onChange={(e) => setEngajamento(e.target.value)} />
        </div>
        <div className="field">
          <label>Views médio</label>
          <input type="number" min={0} value={views} onChange={(e) => setViews(e.target.value)} />
        </div>
        <div className="field">
          <label>Evidência (link/print)</label>
          <input placeholder="https://…" value={evidencia} onChange={(e) => setEvidencia(e.target.value)} />
        </div>
        <div className="field">
          <button className="btn" onClick={registrar}>
            Salvar
          </button>
        </div>
      </div>
      <p className="hint">
        <b>Presença</b> conta os posts no ciclo — zero posts + zero vendas aos 45 dias dispara o corte
        antecipado automaticamente.
      </p>
    </div>
  );
}

function CadastrarInfluenciador({ onOk }: { onOk: () => Promise<void> }) {
  const [nome, setNome] = useState("");
  const [codigo, setCodigo] = useState("");
  const [dataInicio, setDataInicio] = useState(hojeISO());
  const [potes, setPotes] = useState(2);

  async function salvar() {
    if (!nome.trim()) {
      alert("Digite o nome");
      return;
    }
    const j = await api("/api/influenciadores", {
      method: "POST",
      body: JSON.stringify({ nome, codigo, dataInicio, potesEnviados: potes }),
    });
    if (j.erro) {
      alert("Erro: " + j.erro);
      return;
    }
    setNome("");
    setCodigo("");
    setDataInicio(hojeISO());
    setPotes(2);
    await onOk();
  }

  return (
    <div className="panel">
      <h2>➕ Novo influenciador (abre o 1º ciclo)</h2>
      <div className="grid-form" style={{ gridTemplateColumns: "1.5fr 1fr 1fr .8fr auto" }}>
        <div className="field">
          <label>Nome / @</label>
          <input placeholder="@influencer" value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div className="field">
          <label>Código / cupom</label>
          <input
            placeholder="JOAO10"
            style={{ textTransform: "uppercase" }}
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Início do ciclo (envio do produto)</label>
          <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
        </div>
        <div className="field">
          <label>Potes enviados</label>
          <input
            type="number"
            min={0}
            value={potes}
            onChange={(e) => {
              const v = parseInt(e.target.value);
              setPotes(Number.isNaN(v) ? 0 : v);
            }}
          />
        </div>
        <div className="field">
          <button className="btn" onClick={salvar}>
            Cadastrar
          </button>
        </div>
      </div>
      <p className="hint">
        A meta do ciclo é automática: vender pelo menos a quantidade de potes enviados em 60 dias. Use{" "}
        <b>0</b> se o produto não chegou a ser entregue.
      </p>
    </div>
  );
}

function InfluenciadoresCadastrados({
  influenciadores,
  onOk,
}: {
  influenciadores: Influenciador[];
  onOk: () => Promise<void>;
}) {
  const [editandoPix, setEditandoPix] = useState<number | null>(null);

  async function remover(id: number, nome: string) {
    if (
      !window.confirm(
        `Remover "${nome}"? Isso apaga também todos os ciclos, vendas e métricas dele. Essa ação não pode ser desfeita.`
      )
    ) {
      return;
    }
    const j = await api(`/api/influenciadores/${id}`, { method: "DELETE" });
    if (j.erro) {
      alert("Erro: " + j.erro);
      return;
    }
    await onOk();
  }

  async function gerarToken(id: number): Promise<string | null> {
    const j = await api(`/api/influenciadores/${id}/token`, { method: "POST" });
    if (j.erro) {
      alert("Erro: " + j.erro);
      return null;
    }
    return j.tokenAcesso;
  }

  async function copiarLink(inf: Influenciador) {
    const token = inf.tokenAcesso ?? (await gerarToken(inf.id));
    if (!token) return;
    const link = `${window.location.origin}/p/${token}`;
    try {
      await navigator.clipboard.writeText(link);
      alert(`Link de ${inf.nome} copiado! Mande pra ela pelo WhatsApp:\n\n${link}`);
    } catch {
      window.prompt("Copie o link:", link);
    }
    if (!inf.tokenAcesso) await onOk();
  }

  async function novoLink(inf: Influenciador) {
    if (
      !window.confirm(
        `Gerar um novo link para ${inf.nome}? O link antigo para de funcionar na hora — use se ele vazou ou se a parceria acabou.`
      )
    ) {
      return;
    }
    const token = await gerarToken(inf.id);
    if (!token) return;
    await onOk();
    await copiarLink({ ...inf, tokenAcesso: token });
  }

  return (
    <div className="panel">
      <h2>👥 Influenciadores cadastrados</h2>
      <p className="desc">
        <b>Copiar link</b> gera o acesso individual da influenciadora ao painel dela (cupom, vendas e
        comissão) — mande pelo WhatsApp. <b>Novo link</b> invalida o anterior. <b>Remover</b> é só pra
        cadastro feito por engano (apaga ciclos, vendas e métricas); pra encerrar uma parceria, use
        Descartar/Bloquear na fila de avaliação.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Código</th>
              <th>Ciclos</th>
              <th>Chave PIX</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {influenciadores.length === 0 && (
              <tr>
                <td colSpan={5} className="empty">
                  Nenhum influenciador cadastrado ainda.
                </td>
              </tr>
            )}
            {influenciadores.map((inf) => (
              <Fragment key={inf.id}>
              <tr>
                <td style={{ fontWeight: 600 }}>{inf.nome}</td>
                <td>{inf.codigo ? <span className="codigo">{inf.codigo}</span> : "—"}</td>
                <td>{inf.ciclos.length}</td>
                <td>
                  <ChavePixResumo inf={inf} />
                </td>
                <td>
                  <div className="decisao-row">
                    <button
                      className="mini"
                      onClick={() => setEditandoPix(editandoPix === inf.id ? null : inf.id)}
                    >
                      ✎ PIX
                    </button>
                    <button className="mini" onClick={() => copiarLink(inf)}>
                      🔗 Copiar link
                    </button>
                    <button className="mini" onClick={() => novoLink(inf)}>
                      ↻ Novo link
                    </button>
                    <button className="mini del" onClick={() => remover(inf.id, inf.nome)}>
                      🗑 Remover
                    </button>
                  </div>
                </td>
              </tr>
              {editandoPix === inf.id && (
                <tr>
                  <td colSpan={5} style={{ background: "var(--surface-2)" }}>
                    <EditorPix
                      inf={inf}
                      endpoint={`/api/influenciadores/${inf.id}`}
                      onSalvo={async () => {
                        setEditandoPix(null);
                        await onOk();
                      }}
                      onCancelar={() => setEditandoPix(null)}
                    />
                  </td>
                </tr>
              )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BeneficioCupom({ inicial }: { inicial: string }) {
  const [texto, setTexto] = useState(inicial);
  const [salvo, setSalvo] = useState(false);

  async function salvar() {
    const j = await api("/api/config", { method: "POST", body: JSON.stringify({ beneficioCupom: texto }) });
    if (j.erro) {
      alert("Erro: " + j.erro);
      return;
    }
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2000);
  }

  return (
    <div className="panel">
      <h2>🎁 O que o cupom dá (aparece no painel das influenciadoras)</h2>
      <p className="desc">
        Texto que cada influenciadora vê na seção &quot;O que seu cupom dá&quot; e que vai junto na
        mensagem pronta para divulgar. Igual para todas.
      </p>
      <div className="field">
        <textarea
          rows={3}
          placeholder="Ex: 10% de desconto em qualquer produto do site."
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
      </div>
      <div style={{ marginTop: 12 }}>
        <button className="btn" onClick={salvar}>
          {salvo ? "Salvo ✓" : "Salvar texto"}
        </button>
      </div>
    </div>
  );
}

function RegraComissaoEditor({ regra, onOk }: { regra: RegraComissao; onOk: () => Promise<void> }) {
  const [faixas, setFaixas] = useState<Faixa[]>(regra.faixas);
  const [inicio, setInicio] = useState(regra.inicioFaixas);
  const [valorFixo, setValorFixo] = useState(regra.valorFixo);

  function atualizar(i: number, campo: keyof Faixa, valor: string) {
    setFaixas((fs) => fs.map((f, j) => (j === i ? { ...f, [campo]: Number(valor) } : f)));
  }

  async function salvar() {
    const j = await api("/api/config", {
      method: "POST",
      body: JSON.stringify({ faixasComissao: faixas, inicioFaixas: inicio, valor: valorFixo }),
    });
    if (j.erro) {
      alert(j.erro);
      return;
    }
    await onOk();
    alert("Regra de comissão salva.");
  }

  const ordenadas = faixas.slice().sort((a, b) => a.min - b.min);

  return (
    <div className="panel">
      <h2>💰 Regra de comissão</h2>
      <p className="desc">
        Comissão progressiva por unidade, calculada por influenciadora a cada mês. A faixa atingida vale
        para <b>todas</b> as unidades do mês (ex: 15 vendas → todas a R$ 20).
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>A partir de (unidades no mês)</th>
              <th>Até</th>
              <th>R$ por unidade</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {faixas.map((f, i) => {
              const idx = ordenadas.indexOf(f);
              const proxima = ordenadas[idx + 1];
              return (
                <tr key={i}>
                  <td className="field">
                    <input type="number" min={1} value={f.min} onChange={(e) => atualizar(i, "min", e.target.value)} />
                  </td>
                  <td style={{ color: "var(--muted)" }}>{proxima ? proxima.min - 1 : "∞"}</td>
                  <td className="field">
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={f.valor}
                      onChange={(e) => atualizar(i, "valor", e.target.value)}
                    />
                  </td>
                  <td>
                    {faixas.length > 1 && (
                      <button className="mini del" onClick={() => setFaixas((fs) => fs.filter((_, j) => j !== i))}>
                        ✕
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 10 }}>
        <button
          className="mini"
          onClick={() => {
            const ultima = ordenadas[ordenadas.length - 1];
            setFaixas((fs) => [...fs, { min: (ultima?.min ?? 0) + 10, valor: ultima?.valor ?? 0 }]);
          }}
        >
          + Adicionar faixa
        </button>
      </div>
      <div className="grid-form" style={{ gridTemplateColumns: "1fr 1fr auto", marginTop: 16 }}>
        <div className="field">
          <label>Faixas valem a partir do mês</label>
          <input type="month" value={inicio} onChange={(e) => setInicio(e.target.value)} />
        </div>
        <div className="field">
          <label>Valor fixo antes disso (R$ por unidade)</label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={valorFixo}
            onChange={(e) => setValorFixo(parseFloat(e.target.value) || 0)}
          />
        </div>
        <div className="field">
          <button className="btn" onClick={salvar}>
            Salvar regra
          </button>
        </div>
      </div>
      <p className="hint">
        Meses anteriores à vigência continuam pagos pelo valor fixo, para não alterar o que já foi fechado.
      </p>
    </div>
  );
}

const MOTIVO_IGNORADO: Record<string, string> = {
  cupom_nao_cadastrado: "Cupom não cadastrado no painel",
  sem_ciclo_ativo: "Influenciadora sem ciclo ativo (descartada/bloqueada)",
};

const STATUS_CONEXAO: Record<string, string> = {
  conectada: "✅ Loja conectada! Agora clique em Sincronizar para importar as vendas desde outubro.",
  erro_token: "❌ A Nuvemshop recusou a autorização. Confira o ID e o segredo do app no Vercel e tente de novo.",
  config_faltando: "❌ Faltam NUVEMSHOP_APP_ID / NUVEMSHOP_CLIENT_SECRET no Vercel.",
  faca_login: "❌ Entre no painel antes de conectar a loja.",
};

function IntegracaoNuvemshop({ info, onOk }: { info: NuvemshopInfo; onOk: () => Promise<void> }) {
  const [desde, setDesde] = useState("2026-10-01");
  const [sincronizando, setSincronizando] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);
  const [aviso] = useState(() =>
    typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("nuvemshop")
  );

  async function sincronizar() {
    setSincronizando(true);
    setResultado(null);
    try {
      const j = await api("/api/nuvemshop/sincronizar", { method: "POST", body: JSON.stringify({ desde }) });
      if (j.erro) {
        setResultado("❌ Erro: " + j.erro);
        return;
      }
      setResultado(
        `✅ ${j.pedidosLidos} pedidos lidos · ${j.importado} vendas com cupom de influenciadora registradas` +
          (j.removido ? ` · ${j.removido} removidas (canceladas/estornadas)` : "") +
          (j.cupom_nao_cadastrado + j.sem_ciclo_ativo
            ? ` · ${j.cupom_nao_cadastrado + j.sem_ciclo_ativo} não contabilizadas (veja abaixo)`
            : "")
      );
      await onOk();
    } finally {
      setSincronizando(false);
    }
  }

  return (
    <div className="panel">
      <h2>🛒 Integração Nuvemshop</h2>
      {aviso && STATUS_CONEXAO[aviso] && <p className="hint" style={{ marginBottom: 12 }}>{STATUS_CONEXAO[aviso]}</p>}

      {!info.conectada ? (
        <>
          <p className="desc">
            Conecte a loja para que todo pedido pago com cupom de influenciadora entre sozinho no painel
            (e saia se for cancelado ou estornado).
          </p>
          {info.appConfigurado ? (
            <a className="btn" href="/api/nuvemshop/instalar" style={{ display: "inline-block", textDecoration: "none" }}>
              Conectar Nuvemshop
            </a>
          ) : (
            <p className="hint">
              Falta configurar o app: adicione <b>NUVEMSHOP_APP_ID</b> e <b>NUVEMSHOP_CLIENT_SECRET</b> nas
              variáveis de ambiente do Vercel e faça redeploy.
            </p>
          )}
        </>
      ) : (
        <>
          <p className="desc">
            ✅ Loja conectada. Pedidos pagos com cupom entram automaticamente; cancelamentos e estornos são
            removidos. Uma sincronização diária cobre qualquer aviso perdido.
          </p>
          <div className="grid-form" style={{ gridTemplateColumns: "220px auto", justifyContent: "start" }}>
            <div className="field">
              <label>Importar pedidos desde</label>
              <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
            </div>
            <div className="field">
              <button className="btn" onClick={sincronizar} disabled={sincronizando}>
                {sincronizando ? "Sincronizando…" : "Sincronizar agora"}
              </button>
            </div>
          </div>
          {resultado && <p className="hint">{resultado}</p>}
        </>
      )}

      {info.ignorados.length > 0 && (
        <>
          <h3 style={{ fontFamily: "var(--head)", fontSize: 16, margin: "20px 0 6px" }}>
            Pedidos com cupom que não entraram na comissão
          </h3>
          <p className="desc">
            Cupom digitado diferente do cadastro? Corrija o código da influenciadora e sincronize de novo. Cupom
            de quem foi descartada? Considere desativar o cupom na Nuvemshop.
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Data</th>
                  <th>Cupom</th>
                  <th>Potes</th>
                  <th>Motivo</th>
                </tr>
              </thead>
              <tbody>
                {info.ignorados.map((p) => (
                  <tr key={p.pedido}>
                    <td>#{p.pedido}</td>
                    <td>{p.data}</td>
                    <td>
                      <span className="codigo">{p.cupom}</span>
                    </td>
                    <td>{p.quantidade}</td>
                    <td style={{ color: "var(--muted)" }}>{MOTIVO_IGNORADO[p.motivo] ?? p.motivo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function CopiarTexto({ texto, rotulo = "Copiar" }: { texto: string; rotulo?: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      className="mini"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texto);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 2000);
        } catch {
          window.prompt("Copie:", texto);
        }
      }}
    >
      {copiado ? "Copiado ✓" : rotulo}
    </button>
  );
}

function ChavePixResumo({ inf, comCopiar }: { inf: PixInfo; comCopiar?: boolean }) {
  if (!inf.chavePix) {
    return <span style={{ color: "#a86423", fontSize: 13 }}>⚠️ sem PIX</span>;
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: 13.5 }}>{formatarChavePix(inf.tipoPix, inf.chavePix)}</div>
        <div style={{ fontSize: 12, color: "var(--muted)" }}>
          {TIPOS_PIX[inf.tipoPix as keyof typeof TIPOS_PIX] ?? inf.tipoPix} · {inf.titularPix}
        </div>
      </div>
      {comCopiar && <CopiarTexto texto={inf.chavePix} />}
    </div>
  );
}

function EditorPix({
  inf,
  endpoint,
  onSalvo,
  onCancelar,
}: {
  inf: PixInfo;
  endpoint: string;
  onSalvo: () => Promise<void>;
  onCancelar: () => void;
}) {
  const [tipo, setTipo] = useState(inf.tipoPix ?? "cpf");
  const [chave, setChave] = useState(inf.chavePix ? formatarChavePix(inf.tipoPix, inf.chavePix) : "");
  const [titular, setTitular] = useState(inf.titularPix ?? "");
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(limpar = false) {
    setErro(null);
    const j = await api(endpoint, {
      method: "PATCH",
      body: JSON.stringify(limpar ? { chavePix: "" } : { tipoPix: tipo, chavePix: chave, titularPix: titular }),
    });
    if (j.erro) {
      setErro(j.erro);
      return;
    }
    await onSalvo();
  }

  return (
    <div>
      <div className="grid-form" style={{ gridTemplateColumns: "170px 1.2fr 1.2fr auto auto" }}>
        <div className="field">
          <label>Tipo de chave</label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {Object.entries(TIPOS_PIX).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Chave PIX</label>
          <input value={chave} onChange={(e) => setChave(e.target.value)} placeholder="Digite a chave" />
        </div>
        <div className="field">
          <label>Nome do titular</label>
          <input value={titular} onChange={(e) => setTitular(e.target.value)} placeholder="Como aparece no banco" />
        </div>
        <div className="field">
          <button className="btn" onClick={() => salvar()}>
            Salvar
          </button>
        </div>
        <div className="field">
          <button className="mini" onClick={onCancelar}>
            Cancelar
          </button>
        </div>
      </div>
      {erro && <p style={{ color: "#b5453f", fontSize: 13, marginTop: 8 }}>{erro}</p>}
      {inf.chavePix && (
        <p className="hint">
          <button className="mini del" onClick={() => salvar(true)}>
            Remover chave
          </button>
        </p>
      )}
    </div>
  );
}

function PainelMotoboy({
  motoboys,
  mes,
  onOk,
}: {
  motoboys: Motoboy[];
  mes: string;
  onOk: () => Promise<void>;
}) {
  const [motoboyId, setMotoboyId] = useState<number | "">("");
  const [data, setData] = useState(hojeISO());
  const [qtd, setQtd] = useState(1);
  const [obs, setObs] = useState("");
  const [novoNome, setNovoNome] = useState("");
  const [novoValor, setNovoValor] = useState(10);
  const [editandoPix, setEditandoPix] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // Com um motoboy só, já vem selecionado.
  const idSelecionado = motoboyId || (motoboys.length === 1 ? motoboys[0].id : "");

  async function chamar(path: string, method: string, body?: unknown) {
    setErro(null);
    const j = await api(path, { method, body: body ? JSON.stringify(body) : undefined });
    if (j.erro) {
      setErro(j.erro);
      return false;
    }
    await onOk();
    return true;
  }

  async function lancar() {
    const ok = await chamar("/api/entregas", "POST", {
      motoboyId: idSelecionado,
      data,
      quantidade: qtd,
      observacao: obs,
    });
    if (ok) {
      setQtd(1);
      setObs("");
    }
  }

  async function cadastrar() {
    const ok = await chamar("/api/motoboys", "POST", { nome: novoNome, valorEntrega: novoValor });
    if (ok) setNovoNome("");
  }

  async function mudarValor(m: Motoboy) {
    const r = window.prompt(
      `Novo valor por entrega para ${m.nome} (vale só para lançamentos a partir de agora):`,
      String(m.valorEntrega)
    );
    if (r === null) return;
    await chamar(`/api/motoboys/${m.id}`, "PATCH", { valorEntrega: r.replace(",", ".") });
  }

  async function remover(m: Motoboy) {
    if (!window.confirm(`Remover ${m.nome}? Apaga também todas as entregas lançadas para ele.`)) return;
    await chamar(`/api/motoboys/${m.id}`, "DELETE");
  }

  async function apagarEntrega(e: Entrega, nome: string) {
    if (!window.confirm(`Apagar o lançamento de ${e.quantidade} entrega(s) de ${nome} em ${e.data}?`)) return;
    await chamar(`/api/entregas/${e.id}`, "DELETE");
  }

  const lancamentosMes = motoboys
    .flatMap((m) => m.entregas.map((e) => ({ ...e, nome: m.nome })))
    .filter((e) => e.data.slice(0, 7) === mes)
    .sort((a, b) => (a.data < b.data ? 1 : -1));

  const titulo = { fontFamily: "var(--head)", fontSize: 16, margin: "22px 0 8px" };

  return (
    <div className="panel">
      <h2>🛵 Entregas do motoboy</h2>
      <p className="desc">
        Lance as entregas feitas pelo motoboy (as feitas por Uber ficam de fora). O valor por entrega é
        gravado em cada lançamento, então mudar o valor depois não altera meses já pagos.
      </p>
      {erro && <p style={{ color: "#b5453f", fontSize: 13, marginBottom: 10 }}>{erro}</p>}

      {motoboys.length > 0 && (
        <div className="grid-form" style={{ gridTemplateColumns: "1.2fr 1fr .7fr 1.4fr auto" }}>
          <div className="field">
            <label>Motoboy</label>
            <select value={idSelecionado} onChange={(e) => setMotoboyId(Number(e.target.value))}>
              {motoboys.length > 1 && <option value="">Selecione…</option>}
              {motoboys.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome} ({brl(m.valorEntrega)}/entrega)
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Data</label>
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          <div className="field">
            <label>Entregas</label>
            <input type="number" min={1} value={qtd} onChange={(e) => setQtd(parseInt(e.target.value) || 1)} />
          </div>
          <div className="field">
            <label>Observação (opcional)</label>
            <input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex: pedidos #510, #512" />
          </div>
          <div className="field">
            <button className="btn btn-mag" onClick={lancar}>
              Lançar
            </button>
          </div>
        </div>
      )}

      {motoboys.length > 0 && (
        <>
          <h3 style={titulo}>Lançamentos de {nomeMes(mes)}</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Motoboy</th>
                  <th>Entregas</th>
                  <th>R$ / entrega</th>
                  <th>Total</th>
                  <th>Observação</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lancamentosMes.length === 0 && (
                  <tr>
                    <td colSpan={7} className="empty">
                      Nenhuma entrega lançada em {nomeMes(mes)}.
                    </td>
                  </tr>
                )}
                {lancamentosMes.map((e) => (
                  <tr key={e.id}>
                    <td>{e.data}</td>
                    <td style={{ fontWeight: 600 }}>{e.nome}</td>
                    <td>{e.quantidade}</td>
                    <td>{brl(e.valorUnitario)}</td>
                    <td style={{ fontWeight: 700, color: "var(--accent)" }}>{brl(e.quantidade * e.valorUnitario)}</td>
                    <td style={{ color: "var(--muted)" }}>{e.observacao}</td>
                    <td>
                      <button className="mini del" onClick={() => apagarEntrega(e, e.nome)}>
                        🗑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h3 style={titulo}>Motoboys cadastrados</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>R$ / entrega</th>
              <th>Chave PIX</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {motoboys.map((m) => (
              <Fragment key={m.id}>
                <tr>
                  <td style={{ fontWeight: 600 }}>{m.nome}</td>
                  <td>{brl(m.valorEntrega)}</td>
                  <td>
                    <ChavePixResumo inf={m} />
                  </td>
                  <td>
                    <div className="decisao-row">
                      <button className="mini" onClick={() => setEditandoPix(editandoPix === m.id ? null : m.id)}>
                        ✎ PIX
                      </button>
                      <button className="mini" onClick={() => mudarValor(m)}>
                        ✎ Valor
                      </button>
                      <button className="mini del" onClick={() => remover(m)}>
                        🗑 Remover
                      </button>
                    </div>
                  </td>
                </tr>
                {editandoPix === m.id && (
                  <tr>
                    <td colSpan={4} style={{ background: "var(--surface-2)" }}>
                      <EditorPix
                        inf={m}
                        endpoint={`/api/motoboys/${m.id}`}
                        onSalvo={async () => {
                          setEditandoPix(null);
                          await onOk();
                        }}
                        onCancelar={() => setEditandoPix(null)}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            <tr>
              <td className="field">
                <input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Nome do motoboy" />
              </td>
              <td className="field">
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={novoValor}
                  onChange={(e) => setNovoValor(parseFloat(e.target.value) || 0)}
                />
              </td>
              <td colSpan={2}>
                <button className="btn" onClick={cadastrar}>
                  + Cadastrar motoboy
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
