import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { chamarApi, salvarCredenciais } from "@/lib/nuvemshop";

const EVENTOS = ["order/paid", "order/updated", "order/cancelled", "order/voided"];

// A Nuvemshop volta pra cá com ?code=... depois que o gestor autoriza o app.
// Exige a sessão de admin: só quem está logado no painel consegue conectar a loja.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const voltar = (status: string) => NextResponse.redirect(new URL(`/?nuvemshop=${status}`, url.origin));

  if (!(await isAuthed())) return voltar("faca_login");

  const code = url.searchParams.get("code");
  const clientId = process.env.NUVEMSHOP_APP_ID;
  const clientSecret = process.env.NUVEMSHOP_CLIENT_SECRET;
  if (!code || !clientId || !clientSecret) return voltar("config_faltando");

  const res = await fetch("https://www.tiendanube.com/apps/authorize/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
    }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.access_token || !j.user_id) {
    console.error("Nuvemshop token exchange falhou", res.status, j);
    return voltar("erro_token");
  }

  const cred = { storeId: String(j.user_id), token: String(j.access_token) };
  await salvarCredenciais(cred.storeId, cred.token);

  // (Re)cadastra os webhooks apontando para este domínio, removendo os antigos do app.
  const destino = `${url.origin}/api/nuvemshop/webhook`;
  const existentes = await chamarApi(cred, "/webhooks").then((r) => (r.ok ? r.json() : []));
  for (const w of existentes as { id: number; url: string; event: string }[]) {
    await chamarApi(cred, `/webhooks/${w.id}`, { method: "DELETE" });
  }
  for (const event of EVENTOS) {
    const r = await chamarApi(cred, "/webhooks", { method: "POST", body: JSON.stringify({ event, url: destino }) });
    if (!r.ok) console.error("Falha ao registrar webhook", event, r.status, await r.text());
  }

  return voltar("conectada");
}
