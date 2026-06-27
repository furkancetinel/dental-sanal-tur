import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getKlinik, saveKlinik, getToursDir } from "@/lib/config";
import path from "path";
import fs from "fs";

export async function POST(req: NextRequest) {
  if (!await isAuthenticated()) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  let formData: FormData;
  try { formData = await req.formData(); }
  catch { return NextResponse.json({ error: "Form verisi okunamadı" }, { status: 400 }); }

  const file = formData.get("file") as File | null;
  const klinikId = formData.get("klinikId") as string | null;
  const odaId = formData.get("odaId") as string | null;
  const quality = (formData.get("quality") as string) || "full"; // thumb | medium | full

  if (!file || !klinikId || !odaId)
    return NextResponse.json({ error: `Eksik parametreler` }, { status: 400 });
  if (file.size === 0)
    return NextResponse.json({ error: "Dosya boş" }, { status: 400 });

  try {
    const suffix = quality === "full" ? "" : `-${quality}`;
    const fileName = `${odaId}${suffix}.jpg`;
    const photosDir = path.join(getToursDir(), klinikId, "photos");
    if (!fs.existsSync(photosDir)) fs.mkdirSync(photosDir, { recursive: true });

    const bytes = await file.arrayBuffer();
    fs.writeFileSync(path.join(photosDir, fileName), Buffer.from(bytes));

    const fotoUrl = `/api/foto/${klinikId}/${odaId}.jpg`;

    // Sadece full kaliteyi config'e kaydet
    if (quality === "full") {
      const klinikConfig = getKlinik(klinikId);
      if (klinikConfig) {
        const oda = klinikConfig.odalar.find((o) => o.id === odaId);
        if (oda) { oda.foto = fotoUrl; saveKlinik(klinikConfig); }
      }
    }

    return NextResponse.json({ url: fotoUrl, quality });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Sunucu hatası" }, { status: 500 });
  }
}
