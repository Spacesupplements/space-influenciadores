import { pgTable, serial, text, integer, date, numeric, timestamp } from "drizzle-orm/pg-core";

export const influenciadores = pgTable("influenciadores", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  codigo: text("codigo").default(""),
  // Segredo do link do portal da influenciadora (/p/<token>). Nulo até o 1º link ser gerado.
  tokenAcesso: text("token_acesso").unique(),
  // Dados para pagar a comissão. Só o painel admin edita (o portal só exibe).
  tipoPix: text("tipo_pix"), // 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria'
  chavePix: text("chave_pix"),
  titularPix: text("titular_pix"),
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
  origem: text("origem").notNull().default("manual"), // 'manual' | 'nuvemshop'
  // ID do pedido na Nuvemshop: garante que reenvios do mesmo aviso não dupliquem a venda.
  pedidoNuvemshop: text("pedido_nuvemshop").unique(),
});

// Pedidos pagos com cupom que NÃO entraram na comissão (cupom desconhecido ou
// influenciadora sem ciclo ativo), pra o gestor revisar.
export const pedidosIgnorados = pgTable("pedidos_ignorados", {
  id: serial("id").primaryKey(),
  pedidoNuvemshop: text("pedido_nuvemshop").notNull().unique(),
  numero: text("numero"),
  cupom: text("cupom").notNull(),
  data: date("data").notNull(),
  quantidade: integer("quantidade").notNull(),
  motivo: text("motivo").notNull(), // 'cupom_nao_cadastrado' | 'sem_ciclo_ativo'
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
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

export const motoboys = pgTable("motoboys", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  valorEntrega: numeric("valor_entrega", { precision: 10, scale: 2 }).notNull().default("10"),
  tipoPix: text("tipo_pix"),
  chavePix: text("chave_pix"),
  titularPix: text("titular_pix"),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
});

export const entregas = pgTable("entregas", {
  id: serial("id").primaryKey(),
  motoboyId: integer("motoboy_id").notNull().references(() => motoboys.id, { onDelete: "cascade" }),
  data: date("data").notNull(),
  quantidade: integer("quantidade").notNull(),
  // Valor por entrega no momento do lançamento: mudar o valor depois não altera meses já pagos.
  valorUnitario: numeric("valor_unitario", { precision: 10, scale: 2 }).notNull(),
  observacao: text("observacao"),
  criadoEm: timestamp("criado_em").defaultNow().notNull(),
});
