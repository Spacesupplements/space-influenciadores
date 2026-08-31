# Space · Gestão de Influenciadores

Dashboard de gestão de parcerias com influenciadores por **ciclos de 60 dias**: cada ciclo tem uma meta automática de venda (break-even em unidades = potes enviados), corte antecipado por inatividade, e uma fila de avaliação para decidir renovar/descartar/bloquear com motivo registrado.

## Rodando localmente

```bash
npm install
npm run dev
```

Abre em `http://localhost:3000`. Não precisa de banco externo: o app usa um Postgres local embutido ([PGlite](https://pglite.dev)) que roda em `.pglite-data/` (ignorado pelo git). As tabelas são criadas automaticamente na primeira execução.

Senha de acesso local: veja `APP_PASSWORD` em `.env.local` (padrão `space2026`).

## Deploy no Vercel

1. **Criar o banco Postgres** (Neon, via [integração do Vercel](https://vercel.com/integrations/neon) ou direto em neon.tech). Copie a connection string.
2. **Aplicar o schema no banco novo:**
   ```bash
   DATABASE_URL="postgres://..." npm run db:migrate:prod
   ```
3. **Configurar as variáveis de ambiente no projeto Vercel:**
   - `DATABASE_URL` — connection string do Neon
   - `APP_PASSWORD` — senha de acesso ao dashboard
   - `SESSION_SECRET` — string aleatória longa (ex: `openssl rand -hex 32`)
4. **Deploy:** conectar o repositório no Vercel (ou `vercel deploy` pela CLI).

## Migrando os dados do sistema antigo (cPanel)

O sistema anterior (PHP + MySQL, preservado em `legacy-php/`) fica acessível pelas credenciais em `legacy-php/config.php`. Para trazer os influenciadores e vendas já cadastrados:

```bash
OLD_DB_HOST=... OLD_DB_NOME=... OLD_DB_USER=... OLD_DB_SENHA=... \
DATABASE_URL="postgres://..." \
npm run migrate:cpanel
```

Cada influenciador antigo vira um ciclo "aberto" com a data de início original — reveja no dashboard quem já passou dos 60 dias, pois vai cair direto na fila de avaliação pendente.

## Estrutura

- `src/db/schema.ts` — modelo de dados (influenciadores, ciclos, vendas, métricas, config).
- `src/lib/regras.ts` — regra de negócio (break-even automático, corte antecipado aos 45 dias, checkpoint aos 60).
- `src/app/api/*` — API routes.
- `src/app/page.tsx` — dashboard.
- `legacy-php/` — sistema antigo, mantido como referência/backup até a migração ser confirmada.
