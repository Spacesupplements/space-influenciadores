"use client";

import { useEffect, useMemo, useState } from "react";

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
  ciclos: Ciclo[];
}

interface Dados {
  influenciadores: Influenciador[];
  valorPorVenda: number;
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

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

async function api(path: string, options?: RequestInit) {
  const res = await fetch(path, {
    ...options,
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
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const [valorVenda, setValorVenda] = useState(dados.valorPorVenda);

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
    set.add(mesAtual);
    return Array.from(set).sort().reverse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dados]);

  const [mesSelecionado, setMesSelecionado] = useState(mesAtual);

  const vendasMes = allVendas
    .filter((v) => v.data.slice(0, 7) === mesSelecionado)
    .reduce((s, v) => s + v.quantidade, 0);
  const repasseMes = vendasMes * valorVenda;

  const repassePorInfluenciador = dados.influenciadores
    .map((inf) => {
      const vendasDoMes = allVendas
        .filter((v) => v.influId === inf.id && v.data.slice(0, 7) === mesSelecionado)
        .reduce((s, v) => s + v.quantidade, 0);
      return { id: inf.id, nome: inf.nome, codigo: inf.codigo, vendasDoMes, repasseDoMes: vendasDoMes * valorVenda };
    })
    .filter((r) => r.vendasDoMes > 0)
    .sort((a, b) => b.vendasDoMes - a.vendasDoMes);

  const totalPotesEnviados = ciclosFlat.reduce((s, c) => s + c.potesEnviados, 0);
  const totalVendasGeral = ciclosFlat.reduce((s, c) => s + c.vendasTotal, 0);
  const repasseTotal = totalVendasGeral * valorVenda;

  async function salvarValor(v: number) {
    setValorVenda(v);
    await api("/api/config", { method: "POST", body: JSON.stringify({ valor: v }) });
  }

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
          <div className="valor-box">
            <label>R$ por venda:</label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={valorVenda}
              onChange={(e) => salvarValor(parseFloat(e.target.value) || 0)}
            />
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
        <h2>💳 Repasse do mês</h2>
        <p className="desc">
          Vendas e repasse por influenciador em <b>{nomeMes(mesSelecionado)}</b> — some as vendas de
          todos os ciclos dele nesse mês, mesmo que tenha havido renovação no meio do período. Use o
          seletor de mês no topo pra ver, por exemplo, agosto pra pagar em setembro.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Influenciador</th>
                <th>Código</th>
                <th>Vendas no mês</th>
                <th>Repasse no mês</th>
              </tr>
            </thead>
            <tbody>
              {repassePorInfluenciador.length === 0 && (
                <tr>
                  <td colSpan={4} className="empty">
                    Nenhuma venda registrada em {nomeMes(mesSelecionado)}.
                  </td>
                </tr>
              )}
              {repassePorInfluenciador.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{r.nome}</td>
                  <td>{r.codigo ? <span className="codigo">{r.codigo}</span> : "—"}</td>
                  <td>{r.vendasDoMes}</td>
                  <td>
                    <span className="repasse" style={{ fontWeight: 700, color: "var(--accent)" }}>
                      R$ {r.repasseDoMes.toFixed(2).replace(".", ",")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {repassePorInfluenciador.length > 0 && (
          <p className="hint">
            Total a repassar em <b>{nomeMes(mesSelecionado)}</b>:{" "}
            <b>R$ {repasseMes.toFixed(2).replace(".", ",")}</b>
          </p>
        )}
      </div>

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
              </tr>
            </thead>
            <tbody>
              {[...ativos, ...risco].length === 0 && (
                <tr>
                  <td colSpan={6} className="empty">
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
              </tr>
            </thead>
            <tbody>
              {decididos.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty">
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
