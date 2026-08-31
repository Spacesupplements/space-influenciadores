export const CICLO_DIAS = 60;
export const CORTE_ANTECIPADO_DIAS = 45;

export type FaseCiclo =
  | "ativo"
  | "risco"
  | "avaliacao_pendente"
  | "renovado"
  | "descartado"
  | "bloqueado";

export function diasDesde(dataISO: string): number {
  const inicio = new Date(dataISO + "T12:00:00");
  const hoje = new Date();
  return Math.max(0, Math.floor((hoje.getTime() - inicio.getTime()) / 86400000));
}

export interface CicloAvaliado {
  fase: FaseCiclo;
  dias: number;
  diasRestantes: number;
  vendasTotal: number;
  postsTotal: number;
  metaUnidades: number;
  bateuMeta: boolean;
}

/**
 * Aplica a regra de negócio: break-even em unidades no dia 60, com corte
 * antecipado aos 45 dias se não houver nenhuma venda nem nenhum post.
 * Ciclos já decididos (renovado/descartado/bloqueado) retornam a fase decidida.
 */
export function avaliarCiclo(params: {
  status: string;
  dataInicio: string;
  potesEnviados: number;
  vendasTotal: number;
  postsTotal: number;
}): CicloAvaliado {
  const { status, dataInicio, potesEnviados, vendasTotal, postsTotal } = params;
  const dias = diasDesde(dataInicio);
  const bateuMeta = vendasTotal >= potesEnviados;

  let fase: FaseCiclo;
  if (status !== "aberto") {
    fase = status as FaseCiclo;
  } else if (dias >= CICLO_DIAS) {
    fase = "avaliacao_pendente";
  } else if (dias >= CORTE_ANTECIPADO_DIAS && vendasTotal === 0 && postsTotal === 0) {
    fase = "risco";
  } else {
    fase = "ativo";
  }

  return {
    fase,
    dias,
    diasRestantes: Math.max(0, CICLO_DIAS - dias),
    vendasTotal,
    postsTotal,
    metaUnidades: potesEnviados,
    bateuMeta,
  };
}
