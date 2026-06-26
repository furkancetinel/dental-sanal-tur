import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getAllKlinikler, saveKlinik, deleteKlinik, slugify } from "@/lib/config";
import { TourConfig } from "@/app/types";

export async function GET() {
  if (!await isAuthenticated()) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  return NextResponse.json(getAllKlinikler());
}

export async function POST(req: NextRequest) {
  if (!await isAuthenticated()) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  const body = await req.json();
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
}

export async function DELETE(req: NextRequest) {
  if (!await isAuthenticated()) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  const { id } = await req.json();
  deleteKlinik(id);
  return NextResponse.json({ ok: true });
}
