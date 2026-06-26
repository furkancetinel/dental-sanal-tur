import { redirect } from "next/navigation";
import fs from "fs";
import path from "path";
import { TourConfig } from "./types";

export const dynamic = "force-dynamic";

function getKlinikler(): TourConfig[] {
  const dirs = [
    process.env.DATA_DIR,
    "/data/tours",
    path.join(process.cwd(), "public/tours"),
  ].filter(Boolean) as string[];

  for (const dir of dirs) {
    try {
      if (!fs.existsSync(dir)) continue;
      const folders = fs.readdirSync(dir, { withFileTypes: true })
        .filter(e => e.isDirectory());
      if (folders.length === 0) continue;
      const results = folders.map(e => {
        const configPath = path.join(dir, e.name, "config.json");
        if (!fs.existsSync(configPath)) return null;
        try { return JSON.parse(fs.readFileSync(configPath, "utf-8")) as TourConfig; }
        catch { return null; }
      }).filter(Boolean) as TourConfig[];
      if (results.length > 0) return results;
    } catch {}
  }
  return [];
}

export default function Home() {
  const firmalar = getKlinikler();

  if (firmalar.length === 1) {
    redirect(`/${firmalar[0].id}`);
  }

  return (
    <main style={{ fontFamily: "Poppins, sans-serif" }} className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        <img src="/turuncu360-logo.svg" alt="Turuncu360" className="h-8 mb-8" />
        <h1 className="text-xl font-semibold text-gray-900 mb-1">Sanal Tur Sistemi</h1>
        <p className="text-sm text-gray-400 mb-6">Aktif turlar</p>
        <div className="grid gap-3">
          {firmalar.map((k) => (
            <a
              key={k.id}
              href={`/${k.id}`}
              className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between hover:border-orange-300 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center gap-4">
                {k.logo ? (
                  <img src={k.logo} alt={k.klinikAdi} className="h-8 w-auto object-contain" onError={(e) => (e.currentTarget.style.display = "none")} />
                ) : (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: "#f0851b" }}>
                    {k.klinikAdi[0]}
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-900 text-sm">{k.klinikAdi}</p>
                  <p className="text-xs text-gray-400">{k.odalar.length} oda · 360° Sanal Tur</p>
                </div>
              </div>
              <span className="text-sm font-medium group-hover:translate-x-1 transition-transform" style={{ color: "#f0851b" }}>
                Turu Aç →
              </span>
            </a>
          ))}
          {firmalar.length === 0 && (
            <div className="text-center py-16 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
              Henüz tur eklenmemiş.<br />
              <a href="/admin" className="mt-2 inline-block font-medium" style={{ color: "#f0851b" }}>Admin paneline git →</a>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
