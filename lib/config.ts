import fs from "fs";
import path from "path";
import { TourConfig, Oda } from "@/app/types";

const TOURS_DIR = path.join(process.cwd(), "public/tours");

export function getToursDir() {
  if (!fs.existsSync(TOURS_DIR)) fs.mkdirSync(TOURS_DIR, { recursive: true });
  return TOURS_DIR;
}

export function getAllKlinikler(): TourConfig[] {
  const dir = getToursDir();
  const folders = fs.readdirSync(dir);
  return folders
    .map((folder) => {
      const configPath = path.join(dir, folder, "config.json");
      if (!fs.existsSync(configPath)) return null;
      try {
        return JSON.parse(fs.readFileSync(configPath, "utf-8")) as TourConfig;
      } catch {
        return null;
      }
    })
    .filter(Boolean) as TourConfig[];
}

export function getKlinik(slug: string): TourConfig | null {
  const configPath = path.join(TOURS_DIR, slug, "config.json");
  if (!fs.existsSync(configPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(configPath, "utf-8"));
  } catch {
    return null;
  }
}

export function saveKlinik(config: TourConfig) {
  const dir = path.join(TOURS_DIR, config.id);
  const photosDir = path.join(dir, "photos");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(photosDir)) fs.mkdirSync(photosDir, { recursive: true });
  fs.writeFileSync(path.join(dir, "config.json"), JSON.stringify(config, null, 2));
}

export function deleteKlinik(slug: string) {
  const dir = path.join(TOURS_DIR, slug);
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
