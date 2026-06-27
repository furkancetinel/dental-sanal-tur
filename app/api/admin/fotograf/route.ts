import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getKlinik, saveKlinik, getToursDir } from "@/lib/config";
import path from "path";
import fs from "fs";
import sharp from "sharp";

export async function POST(req: NextRequest) {
  if (!await isAuthenticated()) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  let formData: FormData;
  try { formData = await req.formData(); }
  catch { return NextResponse.json({ error: "Form verisi okunamadı" }, { status: 400 }); }

  const file = formData.get("file") as File | null;
  const klinikId = formData.get("klinikId") as string | null;
  const odaId = formData.get("odaId") as string | null;

  if (!file || !klinikId || !odaId)
    return NextResponse.json({ error: `Eksik: file=${!!file} klinikId=${klinikId} odaId=${odaId}` }, { status: 400 });

  if (file.size === 0)
    return NextResponse.json({ error: "Dosya boş" }, { status: 400 });

  try {
    const fileName = `${odaId}.jpg`;
    const photosDir = path.join(getToursDir(), klinikId, "photos");
    if (!fs.existsSync(photosDir)) fs.mkdirSync(photosDir, { recursive: true });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Sharp ile sıkıştır — max 4096px, JPEG 85 kalite
    const compressed = await sharp(buffer)
      .resize(4096, 2048, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85, progressive: true })
      .toBuffer();

    fs.writeFileSync(path.join(photosDir, fileName), compressed);

    const fotoUrl = `/api/foto/${klinikId}/${fileName}`;

    const klinikConfig = getKlinik(klinikId);
    if (klinikConfig) {
      const oda = klinikConfig.odalar.find((o) => o.id === odaId);
      if (oda) { oda.foto = fotoUrl; saveKlinik(klinikConfig); }
    }

    return NextResponse.json({ url: fotoUrl, size: compressed.length, original: bytes.byteLength });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Sunucu hatası" }, { status: 500 });
  }
}
