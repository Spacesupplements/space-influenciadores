CREATE TABLE "ciclos" (
	"id" serial PRIMARY KEY NOT NULL,
	"influ_id" integer NOT NULL,
	"data_inicio" date NOT NULL,
	"potes_enviados" integer DEFAULT 2 NOT NULL,
	"status" text DEFAULT 'aberto' NOT NULL,
	"data_decisao" date,
	"decidido_por" text,
	"motivo" text,
	"criado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "config" (
	"chave" text PRIMARY KEY NOT NULL,
	"valor" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "influenciadores" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"codigo" text DEFAULT '',
	"criado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "metricas_ciclo" (
	"id" serial PRIMARY KEY NOT NULL,
	"ciclo_id" integer NOT NULL,
	"data_registro" date NOT NULL,
	"posts_qtd" integer DEFAULT 0 NOT NULL,
	"engajamento_medio" numeric(6, 2),
	"views_medio" integer,
	"evidencia_url" text
);
--> statement-breakpoint
CREATE TABLE "vendas" (
	"id" serial PRIMARY KEY NOT NULL,
	"ciclo_id" integer NOT NULL,
	"data" date NOT NULL,
	"quantidade" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ciclos" ADD CONSTRAINT "ciclos_influ_id_influenciadores_id_fk" FOREIGN KEY ("influ_id") REFERENCES "public"."influenciadores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metricas_ciclo" ADD CONSTRAINT "metricas_ciclo_ciclo_id_ciclos_id_fk" FOREIGN KEY ("ciclo_id") REFERENCES "public"."ciclos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendas" ADD CONSTRAINT "vendas_ciclo_id_ciclos_id_fk" FOREIGN KEY ("ciclo_id") REFERENCES "public"."ciclos"("id") ON DELETE cascade ON UPDATE no action;