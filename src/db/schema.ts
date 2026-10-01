import { pgTable, serial, text, integer, date, numeric, timestamp } from "drizzle-orm/pg-core";

export const influenciadores = pgTable("influenciadores", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  codigo: text("codigo").default(""),
  // Segredo do link do portal da influenciadora (/p/<token>). Nulo até o 1º link ser gerado.
  tokenAcesso: text("token_acesso").unique(),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
});

// status: 'aberto' | 'renovado' | 'descartado' | 'bloqueado'
export const ciclos = pgTable("ciclos", {
  id: serial("id").primaryKey(),
  influId: integer("influ_id").notNull().references(() => influenciadores.id, { onDelete: "cascade" }),
  dataInicio: date("data_inicio").notNull(),
  potesEnviados: integer("potes_enviados").notNull().default(2),
  status: text("status").notNull().default("aberto"),
  dataDecisao: date("data_decisao"),
  decididoPor: text("decidido_por"),
  motivo: text("motivo"),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
});

export const vendas = pgTable("vendas", {
  id: serial("id").primaryKey(),
  cicloId: integer("ciclo_id").notNull().references(() => ciclos.id, { onDelete: "cascade" }),
  data: date("data").notNull(),
  quantidade: integer("quantidade").notNull().default(1),
});

export const metricasCiclo = pgTable("metricas_ciclo", {
  id: serial("id").primaryKey(),
  cicloId: integer("ciclo_id").notNull().references(() => ciclos.id, { onDelete: "cascade" }),
  dataRegistro: date("data_registro").notNull(),
  postsQtd: integer("posts_qtd").notNull().default(0),
  engajamentoMedio: numeric("engajamento_medio", { precision: 6, scale: 2 }),
  viewsMedio: integer("views_medio"),
  evidenciaUrl: text("evidencia_url"),
});

export const config = pgTable("config", {
  chave: text("chave").primaryKey(),
  valor: text("valor").notNull(),
});
