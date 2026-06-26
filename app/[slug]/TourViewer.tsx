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

  // Group rooms by category
  const kategoriler = config.odalar.reduce((acc, oda) => {
    if (!acc[oda.kategori]) acc[oda.kategori] = [];
    acc[oda.kategori].push(oda);
    return acc;
  }, {} as Record<string, Oda[]>);

  const loadPannellum = useCallback(() => {
    if (pannellumLoaded) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js";
    script.onload = () => setPannellumLoaded(true);
    document.head.appendChild(script);
  }, [pannellumLoaded]);

  useEffect(() => {
    loadPannellum();
  }, [loadPannellum]);

  const initViewer = useCallback(
    (oda: Oda) => {
      if (!pannellumLoaded || !viewerRef.current) return;
      const win = window as any;
      if (!win.pannellum) return;

      if (pannellumRef.current) {
        try { pannellumRef.current.destroy(); } catch {}
        pannellumRef.current = null;
      }

      setLoading(true);

      const hotspots = oda.hotspotlar.map((h) => ({
        pitch: h.pitch,
        yaw: h.yaw,
        type: "custom",
        text: h.baslik,
        cssClass: "pnlm-hotspot-custom",
        clickHandlerFunc: () => {
          const hedef = config.odalar.find((o) => o.id === h.hedef);
          if (hedef) goRoom(hedef);
        },
      }));

      pannellumRef.current = win.pannellum.viewer(viewerRef.current, {
        type: "equirectangular",
        panorama: oda.foto,
        autoLoad: true,
        yaw: oda.baslangicYaw,
        pitch: oda.baslangicPitch,
        hfov: oda.baslangicHfov ?? 100,
        showZoomCtrl: false,
        showFullscreenCtrl: true,
        showControls: false,
        hotSpots: hotspots,
        strings: { loadingLabel: "Yükleniyor..." },
      });

      pannellumRef.current.on("load", () => setLoading(false));
      pannellumRef.current.on("error", () => setLoading(false));
    },
    [pannellumLoaded, config.odalar]
  );

  function goRoom(oda: Oda) {
    setActiveOda(oda);
    initViewer(oda);
  }

  useEffect(() => {
    if (pannellumLoaded) initViewer(activeOda);
  }, [pannellumLoaded]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-gray-900" style={{ fontFamily: "Poppins, sans-serif" }}>
      {/* Topbar */}
      <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-100 flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          {!logoError ? (
            <img
              src={config.logo}
              alt={config.klinikAdi}
              className="h-8 w-auto object-contain"
              onError={() => setLogoError(true)}
            />
          ) : (
            <span className="font-semibold text-gray-800 text-sm">{config.klinikAdi}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full font-medium">
            360° Sanal Tur
          </span>
        </div>
      </div>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-52 bg-white border-r border-gray-100 flex flex-col flex-shrink-0">
          <div className="flex-1 overflow-y-auto">
            {Object.entries(kategoriler).map(([kat, odalar]) => (
              <div key={kat}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-4 pt-4 pb-2">
                  {kat}
                </p>
                {odalar.map((oda) => (
                  <button
                    key={oda.id}
                    onClick={() => goRoom(oda)}
                    className={`w-full flex items-center px-4 py-2.5 text-left text-sm transition-all ${
                      activeOda.id === oda.id
                        ? "text-white font-medium"
                        : "text-gray-600 hover:bg-orange-50 hover:text-gray-900"
                    }`}
                    style={activeOda.id === oda.id ? { background: "#f0851b" } : {}}
                  >
                    <span className="truncate">{oda.baslik}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
          {/* Turuncu360 logo */}
          <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-center">
            <img src="/turuncu360-logo.svg" alt="Turuncu360" className="h-6 w-auto opacity-80" />
          </div>
        </div>

        {/* Viewer */}
        <div className="flex-1 relative">
          {loading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-gray-900">
              <div className="text-center">
                <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: "#f0851b", borderTopColor: "transparent" }} />
                <p className="text-white text-sm font-medium">{activeOda.baslik}</p>
                <p className="text-gray-400 text-xs mt-1">Yükleniyor...</p>
              </div>
            </div>
          )}

          <div ref={viewerRef} className="w-full h-full" />

          {/* Room info badge */}
          <div className="absolute bottom-5 right-5 bg-black/60 backdrop-blur-sm rounded-xl px-4 py-3 text-white pointer-events-none">
            <p className="text-sm font-semibold">{activeOda.baslik}</p>
            <p className="text-xs text-white/60 mt-0.5">{activeOda.aciklama}</p>
          </div>

          {/* Drag hint */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-black/50 text-white/80 text-xs px-4 py-2 rounded-full pointer-events-none flex items-center gap-2">
            <span>↔</span> Sürükleyerek gezdirin
          </div>
        </div>
      </div>

      <style>{`
        .pnlm-hotspot-custom {
          width: 36px !important;
          height: 36px !important;
          background: rgba(240,133,27,0.9) !important;
          border: 2px solid rgba(255,255,255,0.8) !important;
          border-radius: 50% !important;
          cursor: pointer !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-size: 16px !important;
          animation: pnlm-pulse 2.5s infinite !important;
          margin: -18px 0 0 -18px !important;
        }
        .pnlm-hotspot-custom:hover { background: rgba(200,100,10,1) !important; transform: scale(1.2) !important; }
        .pnlm-tooltip { font-family: Poppins, sans-serif !important; font-size: 12px !important; }
        @keyframes pnlm-pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(240,133,27,0.5); }
          50% { box-shadow: 0 0 0 8px rgba(240,133,27,0); }
        }
        .pnlm-load-box { font-family: Poppins, sans-serif !important; }
        .pnlm-ui .pnlm-controls-container { display: none !important; }
      `}</style>
    </div>
  );
}
