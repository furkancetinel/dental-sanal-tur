"use client";

import { useEffect, useRef, useState, useCallback, memo } from "react";
import { TourConfig, Oda } from "../types";

interface Props { config: TourConfig; }

function worldToScreen(yaw: number, pitch: number, camYaw: number, camPitch: number, hfov: number, aspect: number) {
  let dy = yaw - camYaw;
  if (dy > 180) dy -= 360;
  if (dy < -180) dy += 360;
  const dp = pitch - camPitch;
  const x = 0.5 + dy / hfov;
  const y = 0.5 - dp / (hfov / aspect);
  const visible = Math.abs(dy) < hfov * 0.5 && Math.abs(dp) < (hfov / aspect) * 0.5;
  return { x, y, visible };
}

const TIP_ROTATION: Record<string, string> = {
  ilerleme: "rotate(0deg)", ileri: "rotate(0deg)", geri: "rotate(180deg)",
  kapi: "rotate(0deg)", "kapi-gir": "rotate(0deg)", "kapi-cik": "rotate(180deg)",
  yukari: "rotate(0deg)", asagi: "rotate(180deg)",
};

const KAPI_SVG_GIR = `<svg width="42" height="42" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="16" y="8" width="28" height="44" rx="2" stroke="white" stroke-width="1.5" fill="rgba(255,255,255,0.08)"/><line x1="16" y1="8" x2="16" y2="52" stroke="white" stroke-width="2.5" stroke-linecap="round"/><circle cx="38" cy="30" r="2" fill="white"/><polyline points="4 30 16 23 16 37 4 30" stroke="white" stroke-width="1.5" stroke-linejoin="round" fill="rgba(255,255,255,0.15)"/></svg>`;
const KAPI_SVG_CIK = `<svg width="42" height="42" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="16" y="8" width="28" height="44" rx="2" stroke="white" stroke-width="1.5" fill="rgba(255,255,255,0.08)"/><line x1="16" y1="8" x2="16" y2="52" stroke="white" stroke-width="2.5" stroke-linecap="round"/><circle cx="38" cy="30" r="2" fill="white"/><polyline points="56 30 44 23 44 37 56 30" stroke="white" stroke-width="1.5" stroke-linejoin="round" fill="rgba(255,255,255,0.15)"/></svg>`;

const Sidebar = memo(function Sidebar({ config, kategoriler, activeOdaId, logoError, setLogoError, onRoom, showLogo = true }: {
  config: TourConfig; kategoriler: Record<string, Oda[]>; activeOdaId: string;
  logoError: boolean; setLogoError: (v: boolean) => void; onRoom: (oda: Oda) => void; showLogo?: boolean;
}) {
  return (
    <div className="flex flex-col h-full min-h-0">
      {showLogo && (
        <div className="flex items-center justify-center px-4 py-5 flex-shrink-0">
          {!logoError && config.logo ? (
            <img src={config.logo} alt={config.klinikAdi} className="h-11 w-auto object-contain max-w-[170px]" onError={() => setLogoError(true)} />
          ) : <span className="font-semibold text-gray-800 text-sm text-center">{config.klinikAdi}</span>}
        </div>
      )}
      <div className="flex-1 overflow-y-auto min-h-0">
        {Object.entries(kategoriler).map(([kat, odalar]) => (
          <div key={kat}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-4 pt-4 pb-2">{kat}</p>
            {odalar.map((oda) => (
              <button key={oda.id} onClick={() => onRoom(oda)}
                className="w-full flex items-center px-4 py-2.5 text-left text-sm transition-all"
                style={activeOdaId === oda.id ? { background: "#f0851b", color: "#fff", fontWeight: 500 } : { color: "#4b5563" }}
                onMouseEnter={(e) => { if (activeOdaId !== oda.id) (e.currentTarget as HTMLElement).style.background = "#fff7ed"; }}
                onMouseLeave={(e) => { if (activeOdaId !== oda.id) (e.currentTarget as HTMLElement).style.background = ""; }}
              ><span className="truncate">{oda.baslik}</span></button>
            ))}
          </div>
        ))}
      </div>
      <div className="flex-shrink-0 flex items-center justify-center px-4 py-2 border-t border-gray-100">
        <img src="/turuncu360-renkli.svg" alt="Turuncu360" className="h-12 w-auto" />
      </div>
    </div>
  );
});

export default function TourViewer({ config }: Props) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const pannellumRef = useRef<any>(null);
  const rafRef = useRef<number>(0);
  const activeOdaRef = useRef<Oda | null>(null);
  const smoothPositionsRef = useRef<{ x: number; y: number; visible: boolean }[]>([]);
  const hsPositionsRef = useRef<{ x: number; y: number; visible: boolean }[]>([]);

  const baslangicOda = (() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.replace("#", "");
      const found = config.odalar.find(o => o.id === hash);
      if (found) return found;
    }
    return config.odalar.find(o => o.id === config.baslangicOdaId) ?? config.odalar[0];
  })();

  const [activeOda, setActiveOda] = useState<Oda>(baslangicOda);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [pannellumLoaded, setPannellumLoaded] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tooltip, setTooltip] = useState<string | null>(null);
  const [hsPositions, setHsPositions] = useState<{ x: number; y: number; visible: boolean }[]>([]);

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
        const oda = activeOdaRef.current!;
        const newPos = oda.hotspotlar.map(h => worldToScreen(h.yaw, h.pitch, camYaw, camPitch, hfov, aspect));
        const LERP = 0.18;
        const smoothed = newPos.map((p, i) => {
          const prev = smoothPositionsRef.current[i];
          if (!prev) return p;
          return { x: prev.x + (p.x - prev.x) * LERP, y: prev.y + (p.y - prev.y) * LERP, visible: p.visible };
        });
        smoothPositionsRef.current = smoothed;
        let changed = smoothed.length !== hsPositionsRef.current.length;
        if (!changed) {
          for (let i = 0; i < smoothed.length; i++) {
            const p = hsPositionsRef.current[i], n = smoothed[i];
            if (!p || Math.abs(p.x - n.x) > 0.0005 || Math.abs(p.y - n.y) > 0.0005 || p.visible !== n.visible) { changed = true; break; }
          }
        }
        if (changed) { hsPositionsRef.current = smoothed; setHsPositions([...smoothed]); }
      } catch {}
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
  }

  const initViewer = useCallback((oda: Oda) => {
    if (!pannellumLoaded || !viewerRef.current) return;
    const win = window as any;
    if (!win.pannellum) return;

    cancelAnimationFrame(rafRef.current);
    if (pannellumRef.current) {
      if ((pannellumRef.current as any)._cleanup) { try { (pannellumRef.current as any)._cleanup(); } catch {} }
      try { pannellumRef.current.destroy(); } catch {}
      pannellumRef.current = null;
    }

    setLoading(true);
    setLoadError(false);
    setHsPositions([]);
    smoothPositionsRef.current = [];

    const isMobile = /iPhone|Android.*Mobile|iPod/i.test(navigator.userAgent);
    const connection = (navigator as any).connection;
    const effectiveType = connection?.effectiveType || "4g";
    const downlink = connection?.downlink || 10;

    // Eski/zayıf cihaz tespiti — medium kullan
    const iPhoneMatch = navigator.userAgent.match(/iPhone OS (\d+)_/);
    const iOSVersion = iPhoneMatch ? parseInt(iPhoneMatch[1]) : 99;
    const isOlderIPhone = /iPhone/.test(navigator.userAgent) && iOSVersion <= 15;

    // Eski Android — düşük RAM veya eski GPU
    const androidMatch = navigator.userAgent.match(/Android (\d+)/);
    const androidVersion = androidMatch ? parseInt(androidMatch[1]) : 99;
    const isWeakAndroid = /Android/.test(navigator.userAgent) && (
      androidVersion <= 10 ||
      /Redmi|Galaxy A[0-9]|Galaxy M|Galaxy J|Moto G|Nokia|Realme|OPPO A|Vivo Y/i.test(navigator.userAgent)
    );

    const isLowEndDevice = isOlderIPhone || isWeakAndroid;

    const thumbUrl  = oda.foto.replace(/(\.[^.]+)$/, "-thumb$1");
    const mediumUrl = oda.foto.replace(/(\.[^.]+)$/, "-medium$1");
    const fullUrl   = oda.foto;

    let startUrl: string, fallbackUrl: string;
    if (isLowEndDevice) {
      startUrl = mediumUrl; fallbackUrl = thumbUrl;
    } else if (!isMobile) {
      startUrl = fullUrl; fallbackUrl = mediumUrl;
    } else if (effectiveType === "4g" && downlink >= 5) {
      startUrl = fullUrl; fallbackUrl = mediumUrl;
    } else {
      startUrl = mediumUrl; fallbackUrl = thumbUrl;
    }

    let destroyed = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    function cleanup() { destroyed = true; timers.forEach(clearTimeout); }

    function createViewer(url: string) {
      if (destroyed || !viewerRef.current) return;
      try {
        if (pannellumRef.current) { try { pannellumRef.current.destroy(); } catch {} pannellumRef.current = null; }
        pannellumRef.current = win.pannellum.viewer(viewerRef.current, {
          type: "equirectangular", panorama: url, autoLoad: true,
          yaw: oda.baslangicYaw ?? 0, pitch: oda.baslangicPitch ?? 0,
          hfov: oda.baslangicHfov ?? 100, minHfov: 10, maxHfov: 170,
          showZoomCtrl: false, showFullscreenCtrl: false, showControls: false, hotSpots: [],
        });
      } catch (e) {
        if (!destroyed) { setLoading(false); setLoadError(true); }
      }
    }

    createViewer(startUrl);

    if (pannellumRef.current) {
      let firstLoad = false;
      pannellumRef.current.on("load", () => {
        if (destroyed || firstLoad) return;
        firstLoad = true;
        setLoading(false);
        startLoop();
      });
      pannellumRef.current.on("error", () => {
        if (destroyed || firstLoad) return;
        firstLoad = true;
        createViewer(fallbackUrl);
        if (pannellumRef.current) {
          pannellumRef.current.on("load", () => { setLoading(false); startLoop(); });
          pannellumRef.current.on("error", () => { setLoading(false); setLoadError(true); });
        }
      });
      const t = setTimeout(() => {
        if (!destroyed && !firstLoad) { firstLoad = true; createViewer(fallbackUrl); }
      }, 10000);
      timers.push(t);
      (pannellumRef.current as any)._cleanup = cleanup;
    }
  }, [pannellumLoaded]);

  const goRoomCb = useCallback((oda: Oda) => {
    if (pannellumRef.current && (pannellumRef.current as any)._cleanup) {
      try { (pannellumRef.current as any)._cleanup(); } catch {}
    }
    cancelAnimationFrame(rafRef.current);
    setActiveOda(oda);
    setSidebarOpen(false);
    if (typeof window !== "undefined") window.history.replaceState(null, "", `#${oda.id}`);
    initViewer(oda);
    oda.hotspotlar.forEach(h => {
      const hedef = config.odalar.find(o => o.id === h.hedef);
      if (hedef?.foto) { const img = new Image(); img.src = hedef.foto; }
    });
  }, [initViewer, config.odalar]);

  useEffect(() => {
    if (pannellumLoaded) initViewer(activeOda);
    return () => cancelAnimationFrame(rafRef.current);
  }, [pannellumLoaded]);

  return (
    <div style={{ fontFamily: "Poppins, sans-serif", position: "fixed", inset: 0, display: "flex", flexDirection: "column", background: "#111" }}>
      <div className="md:hidden flex items-center justify-between px-4 py-2.5 bg-white border-b border-gray-100 flex-shrink-0 z-10" style={{ minHeight: 56 }}>
        <button className="w-8 h-8 flex flex-col items-center justify-center gap-1.5" onClick={() => setSidebarOpen(v => !v)}>
          <span className="block w-5 h-0.5 bg-gray-600 rounded" /><span className="block w-5 h-0.5 bg-gray-600 rounded" /><span className="block w-5 h-0.5 bg-gray-600 rounded" />
        </button>
        <div className="absolute left-1/2 -translate-x-1/2">
          {!logoError && config.logo ? <img src={config.logo} alt={config.klinikAdi} className="h-11 w-auto object-contain max-w-[170px]" onError={() => setLogoError(true)} />
            : <span className="font-semibold text-gray-800 text-sm">{config.klinikAdi}</span>}
        </div>
        <div className="w-8" />
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden", position: "relative", minHeight: 0 }}>
        <div className="hidden md:flex flex-col flex-shrink-0 bg-white border-r border-gray-100" style={{ width: 208, overflow: "hidden", zIndex: 10 }}>
          <Sidebar config={config} kategoriler={kategoriler} activeOdaId={activeOda.id} logoError={logoError} setLogoError={setLogoError} onRoom={goRoomCb} />
        </div>
        {sidebarOpen && (
          <div className="md:hidden absolute inset-0 z-30 flex">
            <div className="w-64 bg-white flex flex-col shadow-2xl" style={{ overflow: "hidden" }}>
              <div className="flex items-center justify-end px-4 pt-4 pb-2 flex-shrink-0">
                <button onClick={() => setSidebarOpen(false)} className="text-gray-400 text-xl">✕</button>
              </div>
              <Sidebar config={config} kategoriler={kategoriler} activeOdaId={activeOda.id} logoError={logoError} setLogoError={setLogoError} onRoom={goRoomCb} showLogo={false} />
            </div>
            <div className="flex-1 bg-black/40" onClick={() => setSidebarOpen(false)} />
          </div>
        )}

        <div style={{ flex: 1, position: "relative", overflow: "hidden", minWidth: 0, minHeight: 0, background: "#111" }}>
          {loading && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center" style={{ background: "#f0851b" }}>
              <div className="w-12 h-12 rounded-full animate-spin mb-4" style={{ borderWidth: 3, borderStyle: "solid", borderColor: "rgba(255,255,255,0.3)", borderTopColor: "white" }} />
              <p className="text-white font-semibold text-base">{activeOda?.baslik ?? ""}</p>
              <p className="text-white/70 text-sm mt-1">Yükleniyor...</p>
              <div className="mt-6 w-48 h-1 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white/70 rounded-full" style={{ animation: "progress-bar 10s ease-in-out forwards" }} />
              </div>
            </div>
          )}
          {loadError && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-gray-900 text-white px-8 text-center">
              <p className="text-4xl mb-4">⚠️</p>
              <p className="font-semibold text-lg mb-2">Fotoğraf yüklenemedi</p>
              <p className="text-white/60 text-sm mb-6">İnternet bağlantınızı kontrol edin</p>
              <button onClick={() => { setLoadError(false); initViewer(activeOda); }} className="px-6 py-2.5 rounded-xl text-white font-medium text-sm" style={{ background: "#f0851b" }}>Tekrar Dene</button>
            </div>
          )}

          <div ref={viewerRef} className="w-full h-full" />

          <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
            {!loading && activeOda.hotspotlar.map((h, i) => {
              const pos = hsPositions[i];
              if (!pos || !pos.visible) return null;
              const tip = h.tip || "ilerleme";
              const isKapi = tip === "kapi-gir" || tip === "kapi" || tip === "kapi-cik";
              const scaleY = Math.max(0.08, 0.3 + h.pitch / 120);
              const rotZ = parseFloat((TIP_ROTATION[tip] || "rotate(0deg)").replace("rotate(", "").replace("deg)", ""));
              return (
                <div key={i} className="absolute pointer-events-auto"
                  style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%`, transform: "translate(-50%, -50%)" }}
                  onMouseEnter={() => setTooltip(h.baslik)} onMouseLeave={() => setTooltip(null)}
                  onClick={() => { const hedef = config.odalar.find(o => o.id === h.hedef); if (hedef) goRoomCb(hedef); }}>
                  {tooltip === h.baslik && (
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap text-white text-xs font-medium px-3 py-1.5 rounded-lg pointer-events-none" style={{ background: "rgba(0,0,0,0.75)" }}>
                      {h.baslik}
                    </div>
                  )}
                  {isKapi ? (
                    <div className="cursor-pointer" style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.8))" }}
                      dangerouslySetInnerHTML={{ __html: tip === "kapi-cik" ? KAPI_SVG_CIK : KAPI_SVG_GIR }} />
                  ) : (
                    <div className="flex flex-col items-center cursor-pointer"
                      style={{ transform: `rotate(${rotZ}deg) scaleY(${scaleY})`, filter: "drop-shadow(0 1px 6px rgba(0,0,0,0.8))" }}>
                      <svg width="40" height="52" viewBox="0 0 40 52" fill="none" style={{ animation: "hs-arrow-1 1.2s ease-in-out infinite" }}>
                        <polyline points="4 44 20 8 36 44" stroke="white" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" opacity="0.4"/>
                      </svg>
                      <svg width="40" height="52" viewBox="0 0 40 52" fill="none" style={{ marginTop: -22, animation: "hs-arrow-2 1.2s ease-in-out infinite" }}>
                        <polyline points="4 44 20 8 36 44" stroke="white" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!loading && (
            <div className="absolute bottom-14 right-4 sm:bottom-5 sm:right-5 bg-black/60 backdrop-blur-sm rounded-xl px-4 py-2.5 text-white pointer-events-none z-10">
              <p className="text-sm font-semibold leading-tight">{activeOda.baslik}</p>
              {activeOda.aciklama && <p className="text-xs text-white/60 mt-0.5">{activeOda.aciklama}</p>}
            </div>
          )}
          {!loading && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 sm:bottom-5 bg-black/50 text-white/75 text-xs px-4 py-1.5 rounded-full pointer-events-none z-10">
              Sürükleyerek gezdirin
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes progress-bar { 0% { width: 0%; } 90% { width: 95%; } }
        @keyframes hs-arrow-1 { 0%, 100% { opacity: 0.2; transform: translateY(4px); } 50% { opacity: 0.5; transform: translateY(0px); } }
        @keyframes hs-arrow-2 { 0%, 100% { opacity: 0.7; transform: translateY(4px); } 50% { opacity: 1; transform: translateY(0px); } }
        .pnlm-container { background: #111 !important; }
        .pnlm-load-box { display: none !important; }
        .pnlm-ui .pnlm-controls-container { display: none !important; }
      `}</style>
    </div>
  );
}
