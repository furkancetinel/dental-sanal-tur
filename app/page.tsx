import Link from "next/link";
import fs from "fs";
import path from "path";
import { TourConfig } from "./types";

function getKlinikler(): TourConfig[] {
  const toursDir = path.join(process.cwd(), "public/tours");
  if (!fs.existsSync(toursDir)) return [];
  const folders = fs.readdirSync(toursDir);
  return folders
    .map((folder) => {
      const configPath = path.join(toursDir, folder, "config.json");
      if (!fs.existsSync(configPath)) return null;
      return JSON.parse(fs.readFileSync(configPath, "utf-8")) as TourConfig;
    })
    .filter(Boolean) as TourConfig[];
}

export default function Home() {
  const klinikler = getKlinikler();
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Sanal Tur Sistemi</h1>
        <p className="text-gray-500 text-sm mb-8">Aktif klinik turları</p>
        <div className="grid gap-4">
          {klinikler.map((k) => (
            <Link
              key={k.id}
              href={"/tur/" + k.id}
              className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between hover:border-blue-300 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center gap-4">
                {k.logo ? (
                  <img src={k.logo} alt={k.klinikAdi} className="h-8 w-auto object-contain" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                    {k.klinikAdi[0]}
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-900 text-sm">{k.klinikAdi}</p>
                  <p className="text-xs text-gray-400">{k.odalar.length} oda · 360° Sanal Tur</p>
                </div>
              </div>
              <span className="text-blue-600 text-sm font-medium group-hover:translate-x-1 transition-transform">
                Turu Aç →
              </span>
            </Link>
          ))}
          {klinikler.length === 0 && (
            <div className="text-center py-16 text-gray-400 text-sm">Henüz klinik eklenmemiş.</div>
          )}
        </div>
      </div>
    </main>
  );
}
