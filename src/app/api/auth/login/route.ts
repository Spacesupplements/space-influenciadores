import { NextResponse } from "next/server";
import { checkPassword, createSession } from "@/lib/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const senha = body?.senha ?? "";
  if (!checkPassword(senha)) {
    return NextResponse.json({ erro: "senha_invalida" }, { status: 401 });
  }
  await createSession();
  return NextResponse.json({ ok: true });
}
