import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getAllKlinikler, saveKlinik, deleteKlinik, slugify, getToursDir } from "@/lib/config";
import { TourConfig } from "@/app/types";

export async function GET() {
  if (!await isAuthenticated()) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  try {
    return NextResponse.json(getAllKlinikler());
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!await isAuthenticated()) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  try {
    const body = await req.json();
    if (!body.klinikAdi) return NextResponse.json({ error: "Firma adı gerekli" }, { status: 400 });
    const id = slugify(body.klinikAdi);
    const config: TourConfig = {
      id,
      klinikAdi: body.klinikAdi,
      logo: body.logo || "",
      renk: body.renk || "#f0851b",
      website: body.website || "",
      telefon: body.telefon || "",
      odalar: [],
    };
    saveKlinik(config);
    return NextResponse.json(config);
  } catch (e: any) {
    console.error("Klinik ekle hatası:", e);
    return NextResponse.json({ error: e.message || "Sunucu hatası" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!await isAuthenticated()) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  try {
    const { id } = await req.json();
    deleteKlinik(id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
