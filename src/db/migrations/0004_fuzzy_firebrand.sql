CREATE TABLE "entregas" (
	"id" serial PRIMARY KEY NOT NULL,
	"motoboy_id" integer NOT NULL,
	"data" date NOT NULL,
	"quantidade" integer NOT NULL,
	"valor_unitario" numeric(10, 2) NOT NULL,
	"observacao" text,
	"criado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "motoboys" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"valor_entrega" numeric(10, 2) DEFAULT '10' NOT NULL,
	"tipo_pix" text,
	"chave_pix" text,
	"titular_pix" text,
	"criado_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "entregas" ADD CONSTRAINT "entregas_motoboy_id_motoboys_id_fk" FOREIGN KEY ("motoboy_id") REFERENCES "public"."motoboys"("id") ON DELETE cascade ON UPDATE no action;