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
        clickHandlerFunc: () => {
          const hedef = config.odalar.find((o) => o.id === h.hedef);
          if (hedef) goRoom(hedef);
        },
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

  const SidebarContent = () => (
    <>
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
      {/* Topbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-gray-100 flex-shrink-0 z-10" style={{ minHeight: 60 }}>
        <div className="flex items-center gap-3">
          {/* Mobil hamburger - solda */}
          <button className="md:hidden w-8 h-8 flex flex-col items-center justify-center gap-1.5 flex-shrink-0" onClick={() => setSidebarOpen(v => !v)}>
            <span className="block w-5 h-0.5 bg-gray-600 rounded" />
            <span className="block w-5 h-0.5 bg-gray-600 rounded" />
            <span className="block w-5 h-0.5 bg-gray-600 rounded" />
          </button>
        </div>

        {/* Logo - desktop solda, mobilde tam ortada */}
        <div className="absolute left-1/2 -translate-x-1/2 md:static md:translate-x-0 md:left-auto">
          {!logoError && config.logo ? (
            <img src={config.logo} alt={config.klinikAdi} className="h-10 w-auto object-contain max-w-[180px]" onError={() => setLogoError(true)} />
          ) : (
            <span className="font-semibold text-gray-800 text-sm">{config.klinikAdi}</span>
          )}
        </div>

        <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full font-medium hidden sm:block">360° Sanal Tur</span>
        {/* Mobilde sağ taraf boşluk dengesi için */}
        <div className="w-8 md:hidden" />
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Desktop Sidebar */}
        <div className="hidden md:flex w-52 bg-white border-r border-gray-100 flex-col flex-shrink-0">
          <SidebarContent />
        </div>

        {/* Mobile Sidebar */}
        {sidebarOpen && (
          <div className="md:hidden absolute inset-0 z-30 flex">
            <div className="w-64 bg-white flex flex-col shadow-2xl">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="text-sm font-semibold text-gray-700">Odalar</span>
                <button onClick={() => setSidebarOpen(false)} className="text-gray-400 text-xl">✕</button>
              </div>
              <SidebarContent />
            </div>
            <div className="flex-1 bg-black/40" onClick={() => setSidebarOpen(false)} />
          </div>
        )}

        {/* Viewer */}
        <div className="flex-1 relative">
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
        /* Tüm hotspot tipleri için ortak stil */
        .pnlm-hs {
          width: 44px !important; height: 44px !important;
          border-radius: 50% !important; cursor: pointer !important;
          margin: -22px 0 0 -22px !important;
          display: flex !important; align-items: center !important; justify-content: center !important;
          border: 2.5px solid rgba(255,255,255,0.85) !important;
          box-shadow: 0 2px 12px rgba(0,0,0,0.4) !important;
          transition: transform 0.15s !important;
          background: rgba(240,133,27,0.92) !important;
        }
        .pnlm-hs:hover { transform: scale(1.2) !important; background: #d4700f !important; }

        /* Kapı ikonu — farklı renk */
        .pnlm-hs-kapi { background: rgba(30,80,180,0.92) !important; }
        .pnlm-hs-kapi:hover { background: rgba(20,60,150,1) !important; }

        /* Geri ikonu */
        .pnlm-hs-geri { background: rgba(100,100,100,0.85) !important; }
        .pnlm-hs-geri:hover { background: rgba(70,70,70,1) !important; }

        /* SVG ikonları inject et */
        .pnlm-hs::after {
          content: "" !important;
          display: block !important;
          width: 20px !important; height: 20px !important;
          background-size: contain !important;
          background-repeat: no-repeat !important;
          background-position: center !important;
          filter: brightness(0) invert(1) !important;
        }

        /* İlerleme - sağ ok */
        .pnlm-hs-ilerleme::after {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round' xmlns='http://www.w3.org/2000/svg'%3E%3Cpolyline points='9 18 15 12 9 6'/%3E%3C/svg%3E") !important;
        }
        /* İleri - yukarı ok */
        .pnlm-hs-ileri::after {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M12 19V5M5 12l7-7 7 7'/%3E%3C/svg%3E") !important;
        }
        /* Geri - aşağı ok */
        .pnlm-hs-geri::after {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M12 5v14M5 12l7 7 7-7'/%3E%3C/svg%3E") !important;
        }
        /* Kapı */
        .pnlm-hs-kapi::after {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='3' y='3' width='18' height='18' rx='2'/%3E%3Cpath d='M9 3v18'/%3E%3Ccircle cx='14' cy='12' r='1' fill='white'/%3E%3C/svg%3E") !important;
        }
        /* Yukarı */
        .pnlm-hs-yukari::after {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round' xmlns='http://www.w3.org/2000/svg'%3E%3Cpolyline points='18 15 12 9 6 15'/%3E%3C/svg%3E") !important;
        }
        /* Aşağı */
        .pnlm-hs-asagi::after {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round' xmlns='http://www.w3.org/2000/svg'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") !important;
        }

        /* Pulse animasyonu */
        @keyframes hs-pulse {
          0%,100% { box-shadow: 0 2px 12px rgba(0,0,0,0.4), 0 0 0 0 rgba(240,133,27,0.5); }
          50% { box-shadow: 0 2px 12px rgba(0,0,0,0.4), 0 0 0 10px rgba(240,133,27,0); }
        }
        .pnlm-hs { animation: hs-pulse 2.5s infinite !important; }
        .pnlm-hs-kapi { animation: none !important; }

        .pnlm-tooltip { font-family: Poppins, sans-serif !important; font-size: 12px !important; font-weight: 500 !important; border-radius: 8px !important; padding: 5px 12px !important; }
        .pnlm-load-box { display: none !important; }
        .pnlm-ui .pnlm-controls-container { display: none !important; }

        @media (max-width: 767px) {
          .pnlm-hs { width: 50px !important; height: 50px !important; margin: -25px 0 0 -25px !important; }
        }
      `}</style>
    </div>
  );
}
