import { NextRequest, NextResponse } from "next/server";
import { checkPassword, setSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  if (!checkPassword(password)) {
    return NextResponse.json({ error: "Şifre yanlış" }, { status: 401 });
  }
  await setSession();
  return NextResponse.json({ ok: true });
}
