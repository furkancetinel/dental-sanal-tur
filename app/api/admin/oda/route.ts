import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getKlinik, saveKlinik, slugify } from "@/lib/config";
import { Oda } from "@/app/types";

export async function POST(req: NextRequest) {
  if (!await isAuthenticated()) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  const body = await req.json();
  const { klinikId, oda } = body;
  const config = getKlinik(klinikId);
  if (!config) return NextResponse.json({ error: "Klinik bulunamadı" }, { status: 404 });

  const id = oda.id || slugify(oda.baslik);
  const yeniOda: Oda = {
    id,
    baslik: oda.baslik,
    kategori: oda.kategori || "Klinikler",
    aciklama: oda.aciklama || "",
    ikon: oda.ikon || "tooth",
    foto: oda.foto || "",
    baslangicYaw: oda.baslangicYaw || 0,
    baslangicPitch: oda.baslangicPitch || 0,
    hotspotlar: oda.hotspotlar || [],
  };

  const idx = config.odalar.findIndex((o) => o.id === id);
  if (idx >= 0) {
    config.odalar[idx] = yeniOda;
  } else {
    config.odalar.push(yeniOda);
  }
  saveKlinik(config);
  return NextResponse.json(yeniOda);
}

export async function DELETE(req: NextRequest) {
  if (!await isAuthenticated()) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  const { klinikId, odaId } = await req.json();
  const config = getKlinik(klinikId);
  if (!config) return NextResponse.json({ error: "Klinik bulunamadı" }, { status: 404 });
  config.odalar = config.odalar.filter((o) => o.id !== odaId);
  saveKlinik(config);
  return NextResponse.json({ ok: true });
}
