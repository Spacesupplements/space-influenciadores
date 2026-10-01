import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";

// Leva o gestor para a tela de autorização do app na Nuvemshop.
export async function GET(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.redirect(new URL("/", req.url));
  }
  const appId = process.env.NUVEMSHOP_APP_ID;
  if (!appId) {
    return NextResponse.json({ erro: "Configure NUVEMSHOP_APP_ID no Vercel." }, { status: 500 });
  }
  return NextResponse.redirect(`https://www.nuvemshop.com.br/apps/${encodeURIComponent(appId)}/authorize`);
}
