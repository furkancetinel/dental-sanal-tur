"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { TourConfig, Oda } from "../types";

interface Props {
  config: TourConfig;
}

export default function TourViewer({ config }: Props) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const pannellumRef = useRef<any>(null);
  const [activeOda, setActiveOda] = useState<Oda>(config.odalar[0]);
  const [loading, setLoading] = useState(true);
  const [logoError, setLogoError] = useState(false);
  const [pannellumLoaded, setPannellumLoaded] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const kategoriler = config.odalar.reduce((acc, oda) => {
    if (!acc[oda.kategori]) acc[oda.kategori] = [];
    acc[oda.kategori].push(oda);
    return acc;
  }, {} as Record<string, Oda[]>);

  const loadPannellum = useCallback(() => {
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

  useEffect(() => { loadPannellum(); }, []);

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
      minHfov: 30,
      maxHfov: 150,
      showZoomCtrl: false,
      showFullscreenCtrl: false,
      showControls: false,
      hotSpots: oda.hotspotlar.map((h) => ({
        pitch: h.pitch,
        yaw: h.yaw,
        type: "custom",
        text: h.baslik,
        cssClass: "pnlm-hotspot-custom",
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
      <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-center flex-shrink-0">
        <img src="/turuncu360-logo.svg" alt="Turuncu360" className="h-6 w-auto opacity-70" />
      </div>
    </>
  );

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden" style={{ fontFamily: "Poppins, sans-serif", background: "#0a1628" }}>

      {/* Topbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-gray-100 flex-shrink-0 z-10" style={{ minHeight: 52 }}>
        <div className="flex items-center gap-3">
          {/* Mobil hamburger */}
          <button
            className="md:hidden w-8 h-8 flex flex-col items-center justify-center gap-1.5 flex-shrink-0"
            onClick={() => setSidebarOpen((v) => !v)}
          >
            <span className="block w-5 h-0.5 bg-gray-600 rounded" />
            <span className="block w-5 h-0.5 bg-gray-600 rounded" />
            <span className="block w-5 h-0.5 bg-gray-600 rounded" />
          </button>
          {!logoError && config.logo ? (
            <img src={config.logo} alt={config.klinikAdi} className="h-7 w-auto object-contain max-w-[140px]" onError={() => setLogoError(true)} />
          ) : (
            <span className="font-semibold text-gray-800 text-sm">{config.klinikAdi}</span>
          )}
        </div>
        <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full font-medium hidden sm:block">360° Sanal Tur</span>
      </div>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* Desktop Sidebar */}
        <div className="hidden md:flex w-52 bg-white border-r border-gray-100 flex-col flex-shrink-0">
          <SidebarContent />
        </div>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="md:hidden absolute inset-0 z-30 flex">
            <div className="w-64 bg-white flex flex-col shadow-2xl">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="text-sm font-semibold text-gray-700">Odalar</span>
                <button onClick={() => setSidebarOpen(false)} className="text-gray-400 text-xl leading-none">✕</button>
              </div>
              <SidebarContent />
            </div>
            <div className="flex-1 bg-black/40" onClick={() => setSidebarOpen(false)} />
          </div>
        )}

        {/* Viewer */}
        <div className="flex-1 relative">
          {/* Loading screen — turuncu */}
          {loading && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center" style={{ background: "#f0851b" }}>
              <div className="w-12 h-12 border-3 border-white/40 border-t-white rounded-full animate-spin mb-4" style={{ borderWidth: 3 }} />
              <p className="text-white font-semibold text-base">{activeOda.baslik}</p>
              <p className="text-white/70 text-sm mt-1">Yükleniyor...</p>
              <img src="/turuncu360-logo.svg" alt="Turuncu360" className="h-6 w-auto mt-8 opacity-60 brightness-0 invert" />
            </div>
          )}

          <div ref={viewerRef} className="w-full h-full" />

          {/* Oda ismi badge - sağ alt */}
          {!loading && (
            <div className="absolute bottom-14 right-4 sm:bottom-5 sm:right-5 bg-black/60 backdrop-blur-sm rounded-xl px-4 py-2.5 text-white pointer-events-none">
              <p className="text-sm font-semibold leading-tight">{activeOda.baslik}</p>
              {activeOda.aciklama && <p className="text-xs text-white/60 mt-0.5">{activeOda.aciklama}</p>}
            </div>
          )}

          {/* Drag hint - ortada alt */}
          {!loading && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 sm:bottom-5 bg-black/50 text-white/75 text-xs px-4 py-1.5 rounded-full pointer-events-none flex items-center gap-1.5">
              <span>↔</span>
              <span className="hidden sm:inline">Sürükleyerek gezdirin</span>
              <span className="sm:hidden">Kaydır</span>
            </div>
          )}

          {/* Mobil: aktif oda adı üst orta */}
          {!loading && (
            <div className="md:hidden absolute top-3 left-1/2 -translate-x-1/2 bg-black/55 text-white text-xs px-4 py-1.5 rounded-full pointer-events-none font-medium">
              {activeOda.baslik}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .pnlm-hotspot-custom {
          width: 38px !important; height: 38px !important;
          background: rgba(240,133,27,0.92) !important;
          border: 2.5px solid rgba(255,255,255,0.85) !important;
          border-radius: 50% !important; cursor: pointer !important;
          margin: -19px 0 0 -19px !important;
          box-shadow: 0 2px 12px rgba(0,0,0,0.35) !important;
          animation: hs-pulse 2.5s infinite !important;
        }
        .pnlm-hotspot-custom:hover { background: #d4700f !important; transform: scale(1.2) !important; }
        .pnlm-tooltip {
          font-family: Poppins, sans-serif !important;
          font-size: 12px !important; font-weight: 500 !important;
          border-radius: 8px !important; padding: 5px 12px !important;
          background: rgba(0,0,0,0.75) !important;
        }
        @keyframes hs-pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(240,133,27,0.5); }
          50% { box-shadow: 0 0 0 10px rgba(240,133,27,0); }
        }
        .pnlm-load-box { display: none !important; }
        .pnlm-ui .pnlm-controls-container { display: none !important; }
        @media (max-width: 767px) {
          .pnlm-hotspot-custom { width: 44px !important; height: 44px !important; margin: -22px 0 0 -22px !important; }
        }
      `}</style>
    </div>
  );
}
