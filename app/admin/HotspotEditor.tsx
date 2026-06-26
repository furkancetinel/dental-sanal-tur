"use client";
import { useEffect, useRef, useState } from "react";
import { Oda, Hotspot } from "../types";

interface Props {
  oda: Oda;
  tumOdalar: Oda[];
  onSave: (hotspotlar: Hotspot[], yaw: number, pitch: number) => void;
  onClose: () => void;
}

export default function HotspotEditor({ oda, tumOdalar, onSave, onClose }: Props) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const pannellumRef = useRef<any>(null);
  const [hotspotlar, setHotspotlar] = useState<Hotspot[]>([...oda.hotspotlar]);
  const [baslangicYaw, setBaslangicYaw] = useState(oda.baslangicYaw);
  const [baslangicPitch, setBaslangicPitch] = useState(oda.baslangicPitch);
  const [mode, setMode] = useState<"view" | "add">("view");
  const [pendingHotspot, setPendingHotspot] = useState<{ yaw: number; pitch: number } | null>(null);
  const [hedefOda, setHedefOda] = useState<string>("");
  const [hedefBaslik, setHedefBaslik] = useState<string>("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!(window as any).pannellum) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css";
      document.head.appendChild(link);
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js";
      script.onload = () => setLoaded(true);
      document.head.appendChild(script);
    } else {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded || !viewerRef.current) return;
    initViewer();
  }, [loaded]);

  useEffect(() => {
    if (!loaded || !pannellumRef.current) return;
    refreshHotspots();
  }, [hotspotlar]);

  function buildHotspots() {
    return hotspotlar.map((h, i) => ({
      pitch: h.pitch,
      yaw: h.yaw,
      type: "custom",
      text: h.baslik,
      cssClass: "pnlm-hotspot-admin",
      clickHandlerFunc: () => {
        if (window.confirm(`"${h.baslik}" hotspotunu sil?`)) {
          setHotspotlar((prev) => prev.filter((_, idx) => idx !== i));
        }
      },
    }));
  }

  function initViewer() {
    if (pannellumRef.current) { try { pannellumRef.current.destroy(); } catch {} }
    pannellumRef.current = (window as any).pannellum.viewer(viewerRef.current, {
      type: "equirectangular",
      panorama: oda.foto,
      autoLoad: true,
      yaw: baslangicYaw,
      pitch: baslangicPitch,
      hfov: 100,
      showZoomCtrl: false,
      showFullscreenCtrl: false,
      showControls: false,
      hotSpots: buildHotspots(),
    });

    pannellumRef.current.on("mouseup", (_: any, coords: any) => {
      if (mode !== "add" || !coords) return;
      setPendingHotspot({ yaw: Math.round(coords.yaw * 10) / 10, pitch: Math.round(coords.pitch * 10) / 10 });
    });
  }

  function refreshHotspots() {
    if (!pannellumRef.current) return;
    const yaw = pannellumRef.current.getYaw();
    const pitch = pannellumRef.current.getPitch();
    pannellumRef.current.destroy();
    pannellumRef.current = (window as any).pannellum.viewer(viewerRef.current, {
      type: "equirectangular",
      panorama: oda.foto,
      autoLoad: true,
      yaw,
      pitch,
      hfov: 100,
      showZoomCtrl: false,
      showFullscreenCtrl: false,
      showControls: false,
      hotSpots: buildHotspots(),
    });
    pannellumRef.current.on("mouseup", (_: any, coords: any) => {
      if (mode !== "add" || !coords) return;
      setPendingHotspot({ yaw: Math.round(coords.yaw * 10) / 10, pitch: Math.round(coords.pitch * 10) / 10 });
    });
  }

  function setStartPosition() {
    if (!pannellumRef.current) return;
    const y = Math.round(pannellumRef.current.getYaw() * 10) / 10;
    const p = Math.round(pannellumRef.current.getPitch() * 10) / 10;
    setBaslangicYaw(y);
    setBaslangicPitch(p);
    alert(`Başlangıç konumu ayarlandı: Yaw ${y}°, Pitch ${p}°`);
  }

  function addHotspot() {
    if (!pendingHotspot || !hedefOda) return;
    const baslik = hedefBaslik || tumOdalar.find((o) => o.id === hedefOda)?.baslik || hedefOda;
    const yeni: Hotspot = { hedef: hedefOda, yaw: pendingHotspot.yaw, pitch: pendingHotspot.pitch, baslik };
    setHotspotlar((prev) => [...prev, yeni]);
    setPendingHotspot(null);
    setHedefOda("");
    setHedefBaslik("");
    setMode("view");
  }

  const diger = tumOdalar.filter((o) => o.id !== oda.id);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-5xl flex flex-col" style={{ height: "90vh", fontFamily: "Poppins, sans-serif" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900 text-sm">Hotspot Editörü — {oda.baslik}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Panoramada gezin, nokta ekleyin</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={setStartPosition}
              className="text-xs border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50"
            >
              📍 Başlangıç Konumunu Ayarla
            </button>
            <button
              onClick={() => setMode(mode === "add" ? "view" : "add")}
              className="text-xs px-3 py-1.5 rounded-lg text-white font-medium"
              style={{ background: mode === "add" ? "#ef4444" : "#f0851b" }}
            >
              {mode === "add" ? "✕ İptal" : "+ Hotspot Ekle"}
            </button>
            <button
              onClick={() => onSave(hotspotlar, baslangicYaw, baslangicPitch)}
              className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg font-medium"
            >
              Kaydet
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none px-1">✕</button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Panorama */}
          <div className="flex-1 relative">
            {mode === "add" && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-orange-500 text-white text-xs px-4 py-2 rounded-full font-medium">
                Tıklayarak hotspot noktası seçin
              </div>
            )}
            <div ref={viewerRef} className="w-full h-full" />
          </div>

          {/* Sağ panel */}
          <div className="w-64 border-l border-gray-100 flex flex-col overflow-hidden">
            {/* Pending hotspot */}
            {pendingHotspot && (
              <div className="p-4 bg-orange-50 border-b border-orange-100">
                <p className="text-xs font-semibold text-orange-800 mb-3">Yeni Hotspot</p>
                <p className="text-xs text-orange-600 mb-3">Yaw: {pendingHotspot.yaw}° / Pitch: {pendingHotspot.pitch}°</p>
                <select
                  value={hedefOda}
                  onChange={(e) => setHedefOda(e.target.value)}
                  className="w-full border border-orange-200 rounded-lg px-3 py-2 text-xs mb-2 focus:outline-none focus:border-orange-400 bg-white"
                >
                  <option value="">Hedef oda seçin...</option>
                  {diger.map((o) => (
                    <option key={o.id} value={o.id}>{o.baslik}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Buton yazısı (opsiyonel)"
                  value={hedefBaslik}
                  onChange={(e) => setHedefBaslik(e.target.value)}
                  className="w-full border border-orange-200 rounded-lg px-3 py-2 text-xs mb-3 focus:outline-none focus:border-orange-400"
                />
                <button
                  onClick={addHotspot}
                  disabled={!hedefOda}
                  className="w-full py-2 rounded-lg text-white text-xs font-medium disabled:opacity-40"
                  style={{ background: "#f0851b" }}
                >
                  Ekle
                </button>
              </div>
            )}

            {/* Hotspot listesi */}
            <div className="flex-1 overflow-y-auto p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Hotspotlar ({hotspotlar.length})
              </p>
              {hotspotlar.length === 0 && (
                <p className="text-xs text-gray-400">Henüz hotspot eklenmemiş.</p>
              )}
              {hotspotlar.map((h, i) => (
                <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 mb-2">
                  <div>
                    <p className="text-xs font-medium text-gray-800">{h.baslik}</p>
                    <p className="text-xs text-gray-400">→ {h.hedef}</p>
                    <p className="text-xs text-gray-300">Y:{h.yaw}° P:{h.pitch}°</p>
                  </div>
                  <button
                    onClick={() => setHotspotlar((prev) => prev.filter((_, idx) => idx !== i))}
                    className="text-red-400 hover:text-red-600 text-sm"
                  >✕</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .pnlm-hotspot-admin {
          width: 32px !important; height: 32px !important;
          background: rgba(240,133,27,0.9) !important;
          border: 2px solid white !important;
          border-radius: 50% !important;
          cursor: pointer !important;
          margin: -16px 0 0 -16px !important;
        }
        .pnlm-hotspot-admin:hover { background: #c8640a !important; transform: scale(1.2) !important; }
        .pnlm-ui .pnlm-controls-container { display: none !important; }
      `}</style>
    </div>
  );
}
