import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getKlinik, saveKlinik } from "@/lib/config";
import path from "path";
import fs from "fs";

export async function POST(req: NextRequest) {
  if (!await isAuthenticated()) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const klinikId = formData.get("klinikId") as string;
  const odaId = formData.get("odaId") as string;

  if (!file || !klinikId || !odaId) {
    return NextResponse.json({ error: "Eksik parametre" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const fileName = `${odaId}.${ext}`;
  const photosDir = path.join(process.cwd(), "public/tours", klinikId, "photos");

  if (!fs.existsSync(photosDir)) fs.mkdirSync(photosDir, { recursive: true });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const filePath = path.join(photosDir, fileName);
  fs.writeFileSync(filePath, buffer);

  const fotoUrl = `/tours/${klinikId}/photos/${fileName}`;

  // Config'i güncelle
  const klinikConfig = getKlinik(klinikId);
  if (klinikConfig) {
    const oda = klinikConfig.odalar.find((o) => o.id === odaId);
    if (oda) {
      oda.foto = fotoUrl;
      saveKlinik(klinikConfig);
    }
  }

  return NextResponse.json({ url: fotoUrl });
}
