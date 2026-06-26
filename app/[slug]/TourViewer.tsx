"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { TourConfig, Oda } from "../types";

interface Props {
  config: TourConfig;
}

// SVG ikon HTML'leri — hotspot içine inject edilir
const HOTSPOT_IKONLAR: Record<string, string> = {
  ileri: `<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M12 19V5M5 12l7-7 7 7"/></svg>`,
  geri: `<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M12 5v14M5 12l7 7 7-7"/></svg>`,
  kapi: `<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M14 12h.01"/></svg>`,
  yukari: `<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><polyline points="18 15 12 9 6 15"/></svg>`,
  asagi: `<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><polyline points="6 9 12 15 18 9"/></svg>`,
  ilerleme: `<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><polyline points="9 18 15 12 9 6"/></svg>`,
};

export default function TourViewer({ config }: Props) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const pannellumRef = useRef<any>(null);

  // Başlangıç odası: config'den ya da ilk oda
  const baslangicOda = config.odalar.find(o => o.id === config.baslangicOdaId) ?? config.odalar[0];

  const [activeOda, setActiveOda] = useState<Oda>(baslangicOda);
  const [loading, setLoading] = useState(true);
  const [logoError, setLogoError] = useState(false);
  const [pannellumLoaded, setPannellumLoaded] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const initViewer = useCallback((oda: Oda) => {
    if (!pannellumLoaded || !viewerRef.current) return;
    const win = window as any;
    if (!win.pannellum) return;
    if (pannellumRef.current) { try { pannellumRef.current.destroy(); } catch {} pannellumRef.current = null; }
    setLoading(true);

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
      hotSpots: oda.hotspotlar.map((h) => ({
        pitch: h.pitch,
        yaw: h.yaw,
        type: "custom",
        text: h.baslik,
        cssClass: `pnlm-hs pnlm-hs-${h.tip || "ilerleme"}`,
        clickHandlerFunc: (e: any, args: any) => {
          const hedef = config.odalar.find((o) => o.id === args.hedefId);
          if (hedef) goRoom(hedef);
        },
        clickHandlerArgs: { hedefId: h.hedef },
      })),
    });

    pannellumRef.current.on("load", () => setLoading(false));
    pannellumRef.current.on("error", () => setLoading(false));
  }, [pannellumLoaded, config.odalar]);

  function goRoom(oda: Oda) {
    setActiveOda(oda);
    setSidebarOpen(false);
    initViewer(oda);
  }

  useEffect(() => {
    if (pannellumLoaded) initViewer(activeOda);
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
      {/* Turuncu360 beyaz logo kaldırıldı — artık panorama sağ üstünde */}
    </>
  );

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden" style={{ fontFamily: "Poppins, sans-serif", background: "#0a1628" }}>
      {/* Topbar — sadece mobilde görünür */}
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
        <div className="flex-1 relative">
      {/* Turuncu360 logo — sol alt */}
      <div className="absolute bottom-4 left-4 z-10 pointer-events-none">
        <img src="/turuncu360-beyaz.svg" alt="Turuncu360" className="h-7 w-auto opacity-75" />
      </div>

          {loading && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center" style={{ background: "#f0851b" }}>
              <div className="w-12 h-12 rounded-full border-t-white border-white/30 animate-spin mb-4" style={{ borderWidth: 3, borderStyle: "solid" }} />
              <p className="text-white font-semibold text-base">{activeOda.baslik}</p>
              <p className="text-white/70 text-sm mt-1">Yükleniyor...</p>
              <img src="/turuncu360-logo.svg" alt="Turuncu360" className="h-6 w-auto mt-8 opacity-60 brightness-0 invert" />
            </div>
          )}

          <div ref={viewerRef} className="w-full h-full" />

          {!loading && (
            <>
              <div className="absolute bottom-14 right-4 sm:bottom-5 sm:right-5 bg-black/60 backdrop-blur-sm rounded-xl px-4 py-2.5 text-white pointer-events-none">
                <p className="text-sm font-semibold leading-tight">{activeOda.baslik}</p>
                {activeOda.aciklama && <p className="text-xs text-white/60 mt-0.5">{activeOda.aciklama}</p>}
              </div>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 sm:bottom-5 bg-black/50 text-white/75 text-xs px-4 py-1.5 rounded-full pointer-events-none flex items-center gap-1.5">
                <span>↔</span>
                <span className="hidden sm:inline">Sürükleyerek gezdirin</span>
                <span className="sm:hidden">Kaydır</span>
              </div>
              <div className="md:hidden absolute top-3 left-1/2 -translate-x-1/2 bg-black/55 text-white text-xs px-4 py-1.5 rounded-full pointer-events-none font-medium">
                {activeOda.baslik}
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        .pnlm-hs {
          width: 44px !important;
          height: 44px !important;
          margin: -22px 0 0 -22px !important;
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          cursor: pointer !important;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 44 44'%3E%3Ccircle cx='22' cy='22' r='20' fill='rgba(0,0,0,0.25)' stroke='white' stroke-width='1.5' stroke-opacity='0.6'/%3E%3Cpolyline points='17 30 25 22 17 14' fill='none' stroke='white' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") !important;
          background-size: contain !important;
          background-repeat: no-repeat !important;
          background-position: center !important;
          transition: transform 0.15s, opacity 0.15s !important;
          animation: hs-pulse 2.5s ease-in-out infinite !important;
        }
        .pnlm-hs:hover {
          transform: scale(1.15) !important;
          opacity: 0.9 !important;
        }

        /* Tip'e göre farklı oklar */
        .pnlm-hs-ileri {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 44 44'%3E%3Ccircle cx='22' cy='22' r='20' fill='rgba(0,0,0,0.25)' stroke='white' stroke-width='1.5' stroke-opacity='0.6'/%3E%3Cpolyline points='14 27 22 17 30 27' fill='none' stroke='white' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") !important;
        }
        .pnlm-hs-geri {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 44 44'%3E%3Ccircle cx='22' cy='22' r='20' fill='rgba(0,0,0,0.25)' stroke='white' stroke-width='1.5' stroke-opacity='0.6'/%3E%3Cpolyline points='14 17 22 27 30 17' fill='none' stroke='white' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") !important;
        }
        .pnlm-hs-kapi {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 44 44'%3E%3Ccircle cx='22' cy='22' r='20' fill='rgba(0,0,0,0.25)' stroke='white' stroke-width='1.5' stroke-opacity='0.6'/%3E%3Crect x='13' y='10' width='18' height='24' rx='1' fill='none' stroke='white' stroke-width='2'/%3E%3Ccircle cx='27' cy='22' r='1.5' fill='white'/%3E%3Cline x1='13' y1='10' x2='13' y2='34' stroke='white' stroke-width='2'/%3E%3C/svg%3E") !important;
        }
        .pnlm-hs-yukari {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 44 44'%3E%3Ccircle cx='22' cy='22' r='20' fill='rgba(0,0,0,0.25)' stroke='white' stroke-width='1.5' stroke-opacity='0.6'/%3E%3Cpolyline points='14 27 22 17 30 27' fill='none' stroke='white' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") !important;
        }
        .pnlm-hs-asagi {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 44 44'%3E%3Ccircle cx='22' cy='22' r='20' fill='rgba(0,0,0,0.25)' stroke='white' stroke-width='1.5' stroke-opacity='0.6'/%3E%3Cpolyline points='14 17 22 27 30 17' fill='none' stroke='white' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") !important;
        }

        @keyframes hs-pulse {
          0%, 100% { opacity: 0.85; }
          50% { opacity: 1; }
        }

        /* Pannellum tooltip */
        .pnlm-tooltip span {
          font-family: Poppins, sans-serif !important;
          font-size: 12px !important;
          font-weight: 500 !important;
          background: rgba(0,0,0,0.7) !important;
          border-radius: 6px !important;
          padding: 4px 10px !important;
          color: white !important;
          white-space: nowrap !important;
        }
        .pnlm-tooltip span:first-child { display: none !important; }

        .pnlm-load-box { display: none !important; }
        .pnlm-ui .pnlm-controls-container { display: none !important; }

        @media (max-width: 767px) {
          .pnlm-hs { width: 52px !important; height: 52px !important; margin: -26px 0 0 -26px !important; }
        }
      `}</style>
    </div>
  );
}
