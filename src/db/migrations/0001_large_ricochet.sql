ALTER TABLE "influenciadores" ADD COLUMN "token_acesso" text;--> statement-breakpoint
ALTER TABLE "influenciadores" ADD CONSTRAINT "influenciadores_token_acesso_unique" UNIQUE("token_acesso");