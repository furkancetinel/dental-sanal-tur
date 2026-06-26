import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getKlinik, saveKlinik } from "@/lib/config";

export async function POST(req: NextRequest) {
  if (!await isAuthenticated()) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  try {
    const { klinikId, baslangicOdaId } = await req.json();
    const config = getKlinik(klinikId);
    if (!config) return NextResponse.json({ error: "Firma bulunamadı" }, { status: 404 });
    config.baslangicOdaId = baslangicOdaId;
    saveKlinik(config);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
