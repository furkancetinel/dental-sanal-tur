"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { TourConfig, Oda, Hotspot } from "../types";

interface Props { config: TourConfig; }

// Yaw/pitch → ekran x/y (0-1 arası)
function worldToScreen(yaw: number, pitch: number, camYaw: number, camPitch: number, hfov: number, aspect: number): { x: number; y: number; visible: boolean } {
  const vfov = hfov / aspect;
  let dy = yaw - camYaw;
  // -180/+180 wrap
  if (dy > 180) dy -= 360;
  if (dy < -180) dy += 360;
  const dp = pitch - camPitch;
  const x = 0.5 + dy / hfov;
  const y = 0.5 - dp / vfov;
  const visible = Math.abs(dy) < hfov * 0.5 && Math.abs(dp) < vfov * 0.5;
  return { x, y, visible };
}

const TIP_ICONS: Record<string, string> = {
  ilerleme: "→",
  ileri: "↑",
  geri: "↓",
  kapi: "🚪",
  yukari: "↑",
  asagi: "↓",
};

const TIP_SVG: Record<string, string> = {
  ilerleme: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`,
  ileri:    `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>`,
  geri:     `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`,
  kapi:     `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="2" width="18" height="20" rx="1"/><path d="M9 2v20"/><circle cx="15" cy="12" r="1" fill="white"/></svg>`,
  yukari:   `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>`,
  asagi:    `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`,
};

export default function TourViewer({ config }: Props) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const pannellumRef = useRef<any>(null);
  const rafRef = useRef<number>(0);

  const baslangicOda = config.odalar.find(o => o.id === config.baslangicOdaId) ?? config.odalar[0];
  const [activeOda, setActiveOda] = useState<Oda>(baslangicOda);
  const [loading, setLoading] = useState(true);
  const [logoError, setLogoError] = useState(false);
  const [pannellumLoaded, setPannellumLoaded] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tooltip, setTooltip] = useState<string | null>(null);
  // Hotspot pozisyonları — her frame güncellenir
  const [hsPositions, setHsPositions] = useState<{ x: number; y: number; visible: boolean }[]>([]);

  const activeOdaRef = useRef(activeOda);
  activeOdaRef.current = activeOda;

  const kategoriler = config.odalar.reduce((acc, oda) => {
    if (!acc[oda.kategori]) acc[oda.kategori] = [];
    acc[oda.kategori].push(oda);
    return acc;
  }, {} as Record<string, Oda[]>);

  useEffect(() => {
    if ((window as any).pannellum) { setPannellumLoaded(true); return; }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css";
    document.head.appendChild(link);
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js";
    script.onload = () => setPannellumLoaded(true);
    document.head.appendChild(script);
  }, []);

  // RAF loop — pannellum kamerasını okuyup hotspot pozisyonlarını güncelle
  function startLoop() {
    cancelAnimationFrame(rafRef.current);
    function loop() {
      if (!pannellumRef.current || !viewerRef.current) { rafRef.current = requestAnimationFrame(loop); return; }
      try {
        const camYaw = pannellumRef.current.getYaw();
        const camPitch = pannellumRef.current.getPitch();
        const hfov = pannellumRef.current.getHfov();
        const rect = viewerRef.current.getBoundingClientRect();
        const aspect = rect.width / rect.height;
        const oda = activeOdaRef.current;
        const positions = oda.hotspotlar.map(h => worldToScreen(h.yaw, h.pitch, camYaw, camPitch, hfov, aspect));
        setHsPositions(positions);
      } catch {}
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
  }

  const initViewer = useCallback((oda: Oda) => {
    if (!pannellumLoaded || !viewerRef.current) return;
    const win = window as any;
    if (!win.pannellum) return;
    if (pannellumRef.current) { try { pannellumRef.current.destroy(); } catch {} pannellumRef.current = null; }
    setLoading(true);
    setHsPositions([]);

    pannellumRef.current = win.pannellum.viewer(viewerRef.current, {
      type: "equirectangular",
      panorama: oda.foto,
      autoLoad: true,
      yaw: oda.baslangicYaw ?? 0,
      pitch: oda.baslangicPitch ?? 0,
      hfov: oda.baslangicHfov ?? 100,
      minHfov: 10,
      maxHfov: 170,
      showZoomCtrl: false,
      showFullscreenCtrl: false,
      showControls: false,
      hotSpots: [], // pannellum hotspot YOK — biz yönetiyoruz
    });

    pannellumRef.current.on("load", () => { setLoading(false); startLoop(); });
    pannellumRef.current.on("error", () => setLoading(false));
  }, [pannellumLoaded]);

  function goRoom(oda: Oda) {
    setActiveOda(oda);
    setSidebarOpen(false);
    cancelAnimationFrame(rafRef.current);
    initViewer(oda);
  }

  useEffect(() => {
    if (pannellumLoaded) initViewer(activeOda);
    return () => cancelAnimationFrame(rafRef.current);
  }, [pannellumLoaded]);

  const SidebarContent = ({ showLogo = false }: { showLogo?: boolean }) => (
    <>
      {showLogo && (
        <div className="flex items-center justify-center px-4 py-5">
          {!logoError && config.logo ? (
            <img src={config.logo} alt={config.klinikAdi} className="h-11 w-auto object-contain max-w-[170px]" onError={() => setLogoError(true)} />
          ) : (
            <span className="font-semibold text-gray-800 text-sm text-center">{config.klinikAdi}</span>
          )}
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        {Object.entries(kategoriler).map(([kat, odalar]) => (
          <div key={kat}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-4 pt-4 pb-2">{kat}</p>
            {odalar.map((oda) => (
              <button
                key={oda.id}
                onClick={() => goRoom(oda)}
                className="w-full flex items-center px-4 py-2.5 text-left text-sm transition-all"
                style={activeOda.id === oda.id
                  ? { background: "#f0851b", color: "#fff", fontWeight: 500 }
                  : { color: "#4b5563" }
                }
                onMouseEnter={(e) => { if (activeOda.id !== oda.id) (e.currentTarget as HTMLElement).style.background = "#fff7ed"; }}
                onMouseLeave={(e) => { if (activeOda.id !== oda.id) (e.currentTarget as HTMLElement).style.background = ""; }}
              >
                <span className="truncate">{oda.baslik}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </>
  );

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden" style={{ fontFamily: "Poppins, sans-serif", background: "#0a1628" }}>

      {/* Topbar — sadece mobil */}
      <div className="md:hidden flex items-center justify-between px-4 py-2.5 bg-white border-b border-gray-100 flex-shrink-0 z-10" style={{ minHeight: 56 }}>
        <button className="w-8 h-8 flex flex-col items-center justify-center gap-1.5 flex-shrink-0" onClick={() => setSidebarOpen(v => !v)}>
          <span className="block w-5 h-0.5 bg-gray-600 rounded" />
          <span className="block w-5 h-0.5 bg-gray-600 rounded" />
          <span className="block w-5 h-0.5 bg-gray-600 rounded" />
        </button>
        <div className="absolute left-1/2 -translate-x-1/2">
          {!logoError && config.logo ? (
            <img src={config.logo} alt={config.klinikAdi} className="h-11 w-auto object-contain max-w-[170px]" onError={() => setLogoError(true)} />
          ) : (
            <span className="font-semibold text-gray-800 text-sm">{config.klinikAdi}</span>
          )}
        </div>
        <div className="w-8" />
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Desktop Sidebar */}
        <div className="hidden md:flex w-52 bg-white border-r border-gray-100 flex-col flex-shrink-0">
          <SidebarContent showLogo={true} />
        </div>

        {/* Mobile Sidebar */}
        {sidebarOpen && (
          <div className="md:hidden absolute inset-0 z-30 flex">
            <div className="w-64 bg-white flex flex-col shadow-2xl">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="text-sm font-semibold text-gray-700">Odalar</span>
                <button onClick={() => setSidebarOpen(false)} className="text-gray-400 text-xl">✕</button>
              </div>
              <SidebarContent showLogo={false} />
            </div>
            <div className="flex-1 bg-black/40" onClick={() => setSidebarOpen(false)} />
          </div>
        )}

        {/* Viewer */}
        <div className="flex-1 relative overflow-hidden">
          {/* Loading */}
          {loading && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center" style={{ background: "#f0851b" }}>
              <div className="w-12 h-12 rounded-full animate-spin mb-4" style={{ borderWidth: 3, borderStyle: "solid", borderColor: "rgba(255,255,255,0.3)", borderTopColor: "white" }} />
              <p className="text-white font-semibold text-base">{activeOda.baslik}</p>
              <p className="text-white/70 text-sm mt-1">Yükleniyor...</p>
              <img src="/turuncu360-logo.svg" alt="Turuncu360" className="h-6 w-auto mt-8 opacity-60 brightness-0 invert" />
            </div>
          )}

          {/* Pannellum container */}
          <div ref={viewerRef} className="w-full h-full" />

          {/* Hotspot overlay — pannellum'dan bağımsız React katmanı */}
          <div ref={overlayRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
            {!loading && activeOda.hotspotlar.map((h, i) => {
              const pos = hsPositions[i];
              if (!pos || !pos.visible) return null;
              const tip = h.tip || "ilerleme";
              return (
                <div
                  key={i}
                  className="absolute pointer-events-auto"
                  style={{
                    left: `${pos.x * 100}%`,
                    top: `${pos.y * 100}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                  onMouseEnter={() => setTooltip(h.baslik)}
                  onMouseLeave={() => setTooltip(null)}
                  onClick={() => {
                    const hedef = config.odalar.find(o => o.id === h.hedef);
                    if (hedef) goRoom(hedef);
                  }}
                >
                  {/* Tooltip */}
                  {tooltip === h.baslik && (
                    <div
                      className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap text-white text-xs font-medium px-3 py-1.5 rounded-lg pointer-events-none"
                      style={{ background: "rgba(0,0,0,0.75)", fontFamily: "Poppins, sans-serif" }}
                    >
                      {h.baslik}
                    </div>
                  )}
                  {/* Hotspot butonu */}
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-110 active:scale-95"
                    style={{
                      background: "rgba(255,255,255,0.15)",
                      border: "2px solid rgba(255,255,255,0.8)",
                      backdropFilter: "blur(4px)",
                      boxShadow: "0 2px 16px rgba(0,0,0,0.3)",
                      animation: "hs-pulse 2.5s ease-in-out infinite",
                    }}
                    dangerouslySetInnerHTML={{ __html: TIP_SVG[tip] || TIP_SVG.ilerleme }}
                  />
                </div>
              );
            })}
          </div>

          {/* Turuncu360 logo — sol alt */}
          <div className="absolute bottom-4 left-4 z-10 pointer-events-none">
            <img src="/turuncu360-beyaz.svg" alt="Turuncu360" className="h-7 w-auto opacity-75" />
          </div>

          {/* Oda badge — sağ alt */}
          {!loading && (
            <div className="absolute bottom-14 right-4 sm:bottom-5 sm:right-5 bg-black/60 backdrop-blur-sm rounded-xl px-4 py-2.5 text-white pointer-events-none z-10">
              <p className="text-sm font-semibold leading-tight">{activeOda.baslik}</p>
              {activeOda.aciklama && <p className="text-xs text-white/60 mt-0.5">{activeOda.aciklama}</p>}
            </div>
          )}

          {/* Drag hint */}
          {!loading && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 sm:bottom-5 bg-black/50 text-white/75 text-xs px-4 py-1.5 rounded-full pointer-events-none z-10 flex items-center gap-1.5">
              <span>↔</span>
              <span className="hidden sm:inline">Sürükleyerek gezdirin</span>
              <span className="sm:hidden">Kaydır</span>
            </div>
          )}

          {/* Mobil oda adı */}
          {!loading && (
            <div className="md:hidden absolute top-3 left-1/2 -translate-x-1/2 bg-black/55 text-white text-xs px-4 py-1.5 rounded-full pointer-events-none z-10 font-medium">
              {activeOda.baslik}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes hs-pulse {
          0%, 100% { box-shadow: 0 2px 16px rgba(0,0,0,0.3), 0 0 0 0 rgba(255,255,255,0.3); }
          50% { box-shadow: 0 2px 16px rgba(0,0,0,0.3), 0 0 0 8px rgba(255,255,255,0); }
        }
        .pnlm-load-box { display: none !important; }
        .pnlm-ui .pnlm-controls-container { display: none !important; }
      `}</style>
    </div>
  );
}
