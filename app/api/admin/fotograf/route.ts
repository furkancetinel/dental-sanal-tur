import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getKlinik, saveKlinik } from "@/lib/config";
import path from "path";
import fs from "fs";

export async function POST(req: NextRequest) {
  if (!await isAuthenticated()) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Form verisi okunamadı" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const klinikId = formData.get("klinikId") as string | null;
  const odaId = formData.get("odaId") as string | null;

  if (!file || !klinikId || !odaId) {
    return NextResponse.json({ error: `Eksik parametre: file=${!!file} klinikId=${klinikId} odaId=${odaId}` }, { status: 400 });
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "Dosya boş" }, { status: 400 });
  }

  try {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const fileName = `${odaId}.${ext}`;
    const photosDir = path.join(process.cwd(), "public", "tours", klinikId, "photos");

    if (!fs.existsSync(photosDir)) fs.mkdirSync(photosDir, { recursive: true });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    fs.writeFileSync(path.join(photosDir, fileName), buffer);

    const fotoUrl = `/tours/${klinikId}/photos/${fileName}`;

    // Config güncelle
    const klinikConfig = getKlinik(klinikId);
    if (klinikConfig) {
      const oda = klinikConfig.odalar.find((o) => o.id === odaId);
      if (oda) {
        oda.foto = fotoUrl;
        saveKlinik(klinikConfig);
      }
    }

    return NextResponse.json({ url: fotoUrl, size: buffer.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Sunucu hatası" }, { status: 500 });
  }
}
