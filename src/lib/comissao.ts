export interface Faixa {
  min: number; // a partir de quantas unidades no mês
  valor: number; // R$ por unidade
}

export interface RegraComissao {
  valorFixo: number; // R$ por unidade nos meses anteriores à vigência das faixas
  faixas: Faixa[];
  inicioFaixas: string; // "YYYY-MM"
}

export const FAIXAS_PADRAO: Faixa[] = [
  { min: 1, valor: 15 },
  { min: 11, valor: 20 },
  { min: 21, valor: 25 },
  { min: 41, valor: 30 },
];
export const INICIO_FAIXAS_PADRAO = "2026-10";

export function lerRegraComissao(configRows: { chave: string; valor: string }[]): RegraComissao {
  const get = (chave: string) => configRows.find((c) => c.chave === chave)?.valor;
  let faixas = FAIXAS_PADRAO;
  try {
    const salvo = get("faixas_comissao");
    if (salvo) faixas = normalizarFaixas(JSON.parse(salvo));
  } catch {
    // config corrompida: cai no padrão em vez de derrubar o painel
  }
  return {
    valorFixo: Number(get("valor_por_venda") ?? 10),
    faixas,
    inicioFaixas: get("inicio_faixas") || INICIO_FAIXAS_PADRAO,
  };
}

export function normalizarFaixas(entrada: unknown): Faixa[] {
  if (!Array.isArray(entrada)) throw new Error("faixas_invalidas");
  const faixas = entrada
    .map((f) => ({ min: Math.floor(Number(f?.min)), valor: Number(f?.valor) }))
    .filter((f) => Number.isFinite(f.min) && f.min >= 1 && Number.isFinite(f.valor) && f.valor >= 0)
    .sort((a, b) => a.min - b.min);
  if (faixas.length === 0 || faixas[0].min !== 1) throw new Error("faixas_invalidas");
  if (new Set(faixas.map((f) => f.min)).size !== faixas.length) throw new Error("faixas_invalidas");
  return faixas;
}

export function usaFaixas(regra: RegraComissao, mes: string) {
  return mes >= regra.inicioFaixas;
}

/** Valor por unidade no mês. A faixa atingida vale para TODAS as unidades do mês. */
export function valorPorUnidade(regra: RegraComissao, mes: string, unidades: number): number {
  if (!usaFaixas(regra, mes)) return regra.valorFixo;
  let valor = regra.faixas[0].valor;
  for (const f of regra.faixas) {
    if (unidades >= f.min) valor = f.valor;
  }
  return valor;
}

export function comissaoDoMes(regra: RegraComissao, mes: string, unidades: number): number {
  return unidades * valorPorUnidade(regra, mes, unidades);
}

export function proximaFaixa(
  regra: RegraComissao,
  mes: string,
  unidades: number
): { faltam: number; valor: number } | null {
  if (!usaFaixas(regra, mes)) return null;
  const prox = regra.faixas.find((f) => f.min > unidades && f.min > 1);
  return prox ? { faltam: prox.min - unidades, valor: prox.valor } : null;
}

/** Soma a comissão mês a mês de uma lista de vendas de UMA influenciadora. */
export function comissaoTotal(regra: RegraComissao, vendas: { data: string; quantidade: number }[]) {
  const porMes = new Map<string, number>();
  for (const v of vendas) {
    const m = v.data.slice(0, 7);
    porMes.set(m, (porMes.get(m) ?? 0) + v.quantidade);
  }
  let total = 0;
  for (const [mes, un] of porMes) total += comissaoDoMes(regra, mes, un);
  return total;
}
