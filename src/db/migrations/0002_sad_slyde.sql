CREATE TABLE "pedidos_ignorados" (
	"id" serial PRIMARY KEY NOT NULL,
	"pedido_nuvemshop" text NOT NULL,
	"numero" text,
	"cupom" text NOT NULL,
	"data" date NOT NULL,
	"quantidade" integer NOT NULL,
	"motivo" text NOT NULL,
	"criado_em" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pedidos_ignorados_pedido_nuvemshop_unique" UNIQUE("pedido_nuvemshop")
);
--> statement-breakpoint
ALTER TABLE "vendas" ADD COLUMN "origem" text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "vendas" ADD COLUMN "pedido_nuvemshop" text;--> statement-breakpoint
ALTER TABLE "vendas" ADD CONSTRAINT "vendas_pedido_nuvemshop_unique" UNIQUE("pedido_nuvemshop");