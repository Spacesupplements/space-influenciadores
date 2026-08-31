import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { isAuthed } from "@/lib/auth";
import { getDb } from "@/db/client";
import { influenciadores } from "@/db/schema";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed())) {
    return NextResponse.json({ erro: "senha_invalida" }, { status: 401 });
  }
  const { id } = await params;
  const db = await getDb();
  await db.delete(influenciadores).where(eq(influenciadores.id, Number(id)));
  return NextResponse.json({ ok: true });
}
