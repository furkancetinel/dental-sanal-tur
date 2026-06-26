import fs from "fs";
import path from "path";
import { TourConfig } from "@/app/types";

// /data/tours — Coolify'da bu klasör volume ile mount edilir, deploy'da sıfırlanmaz
// Geliştirme ortamında public/tours kullanılır
const DATA_DIR = process.env.NODE_ENV === "production"
  ? "/data/tours"
  : path.join(process.cwd(), "public/tours");

export function getToursDir(): string {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  return DATA_DIR;
}

export function getAllKlinikler(): TourConfig[] {
  const dir = getToursDir();
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => {
      const configPath = path.join(dir, e.name, "config.json");
      if (!fs.existsSync(configPath)) return null;
      try { return JSON.parse(fs.readFileSync(configPath, "utf-8")) as TourConfig; }
      catch { return null; }
    })
    .filter(Boolean) as TourConfig[];
}

export function getKlinik(slug: string): TourConfig | null {
  const configPath = path.join(getToursDir(), slug, "config.json");
  if (!fs.existsSync(configPath)) return null;
  try { return JSON.parse(fs.readFileSync(configPath, "utf-8")); }
  catch { return null; }
}

export function saveKlinik(config: TourConfig) {
  const dir = path.join(getToursDir(), config.id);
  const photosDir = path.join(dir, "photos");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(photosDir)) fs.mkdirSync(photosDir, { recursive: true });
  fs.writeFileSync(path.join(dir, "config.json"), JSON.stringify(config, null, 2));
}

export function deleteKlinik(slug: string) {
  const dir = path.join(getToursDir(), slug);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true });
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s")
    .replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Fotoğraf yolunu döner — production'da /api/foto/[...path] üzerinden serve edilir
export function getFotoUrl(klinikId: string, fileName: string): string {
  return `/api/foto/${klinikId}/${fileName}`;
}

export function getFotoPath(klinikId: string, fileName: string): string {
  return path.join(getToursDir(), klinikId, "photos", fileName);
}
