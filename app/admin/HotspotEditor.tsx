"use client";
import { useEffect, useRef, useState } from "react";
import { Oda, Hotspot } from "../types";

interface Props {
  oda: Oda;
  tumOdalar: Oda[];
  onSave: (hotspotlar: Hotspot[], yaw: number, pitch: number, hfov: number) => void;
  onClose: () => void;
}

export default function HotspotEditor({ oda, tumOdalar, onSave, onClose }: Props) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const pannellumRef = useRef<any>(null);
  const [hotspotlar, setHotspotlar] = useState<Hotspot[]>([...oda.hotspotlar]);
  const [yaw, setYaw] = useState(oda.baslangicYaw ?? 0);
  const [pitch, setPitch] = useState(oda.baslangicPitch ?? 0);
  const [hfov, setHfov] = useState((oda as any).baslangicHfov ?? 100);
  const [mode, setMode] = useState<"view" | "add">("view");
  const [pending, setPending] = useState<{ yaw: number; pitch: number } | null>(null);
  const [hedefOda, setHedefOda] = useState("");
  const [hedefBaslik, setHedefBaslik] = useState("");
  const [hedefTip, setHedefTip] = useState("ilerleme");
  const [loaded, setLoaded] = useState(false);
  const modeRef = useRef(mode);
  modeRef.current = mode;

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
    if (loaded) initViewer(yaw, pitch, hfov);
  }, [loaded]);

  useEffect(() => {
    if (loaded && pannellumRef.current) rebuildHotspots();
  }, [hotspotlar]);

  function buildHotspotDefs(hs: Hotspot[]) {
    return hs.map((h, i) => ({
      pitch: h.pitch,
      yaw: h.yaw,
      type: "custom",
      text: h.baslik,
      cssClass: "pnlm-hs-admin",
      clickHandlerFunc: () => {
        if (confirm(`"${h.baslik}" hotspotunu sil?`)) {
          setHotspotlar((prev) => prev.filter((_, idx) => idx !== i));
        }
      },
    }));
  }

  function initViewer(startYaw: number, startPitch: number, startHfov: number) {
    if (!viewerRef.current) return;
    if (pannellumRef.current) {
      if ((pannellumRef.current as any)._clickHandler) {
        (pannellumRef.current as any)._container?.removeEventListener("click", (pannellumRef.current as any)._clickHandler);
      }
      try { pannellumRef.current.destroy(); } catch {}
      pannellumRef.current = null;
    }

    pannellumRef.current = (window as any).pannellum.viewer(viewerRef.current, {
      type: "equirectangular",
      panorama: oda.foto,
      autoLoad: true,
      yaw: startYaw,
      pitch: startPitch,
      hfov: startHfov,
      minHfov: 10,
      maxHfov: 170,
      showZoomCtrl: false,
      showFullscreenCtrl: false,
      showControls: false,
      hotSpots: buildHotspotDefs(hotspotlar),
    });

    let mouseDownPos = { x: 0, y: 0 };

    const mouseDownHandler = (e: MouseEvent) => {
      mouseDownPos = { x: e.clientX, y: e.clientY };
    };

    const clickHandler = (e: MouseEvent) => {
      if (modeRef.current !== "add") return;
      if (!pannellumRef.current) return;
      // Sürükleme ile tıklamayı ayırt et
      const dx = Math.abs(e.clientX - mouseDownPos.x);
      const dy = Math.abs(e.clientY - mouseDownPos.y);
      if (dx > 5 || dy > 5) return;

      const container = viewerRef.current!;
      const rect = container.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;   // 0-1
      const py = (e.clientY - rect.top) / rect.height;    // 0-1

      const curYaw = pannellumRef.current.getYaw();
      const curPitch = pannellumRef.current.getPitch();
      const hfov = pannellumRef.current.getHfov();
      const vfov = hfov * (rect.height / rect.width);

      const clickYaw   = curYaw   + (px - 0.5) * hfov;
      const clickPitch = curPitch - (py - 0.5) * vfov;

      setPending({
        yaw:   Math.round(clickYaw   * 10) / 10,
        pitch: Math.round(clickPitch * 10) / 10,
      });
    };

    const container = viewerRef.current;
    container.addEventListener("mousedown", mouseDownHandler);
    container.addEventListener("click", clickHandler);
    (pannellumRef.current as any)._clickHandler = clickHandler;
    (pannellumRef.current as any)._mouseDownHandler = mouseDownHandler;
    (pannellumRef.current as any)._container = container;
  }

  function rebuildHotspots() {
    if (!pannellumRef.current) return;
    const curYaw = pannellumRef.current.getYaw();
    const curPitch = pannellumRef.current.getPitch();
    const curHfov = pannellumRef.current.getHfov();
    if ((pannellumRef.current as any)._clickHandler) {
      (pannellumRef.current as any)._container?.removeEventListener("click", (pannellumRef.current as any)._clickHandler);
      (pannellumRef.current as any)._container?.removeEventListener("mousedown", (pannellumRef.current as any)._mouseDownHandler);
    }
    initViewer(curYaw, curPitch, curHfov);
  }

  function syncFromViewer() {
    if (!pannellumRef.current) return;
    const y = Math.round(pannellumRef.current.getYaw() * 10) / 10;
    const p = Math.round(pannellumRef.current.getPitch() * 10) / 10;
    const h = Math.round(pannellumRef.current.getHfov() * 10) / 10;
    setYaw(y); setPitch(p); setHfov(h);
    return { y, p, h };
  }

  function applyToViewer(y: number, p: number, h: number) {
    if (!pannellumRef.current) return;
    // Pannellum setHfov, mevcut maxHfov sınırını aşamaz
    // Önce maxHfov'u güncelle, sonra değeri set et
    try {
      pannellumRef.current.setYaw(y, false);
      pannellumRef.current.setPitch(p, false);
      // hfov için viewer'ı yeniden başlat — pannellum setHfov çok kısıtlayıcı
      const curYaw = pannellumRef.current.getYaw();
      const curPitch = pannellumRef.current.getPitch();
      initViewer2(curYaw, curPitch, h);
    } catch {}
  }

  function initViewer2(startYaw: number, startPitch: number, startHfov: number) {
    if (!viewerRef.current) return;
    if (pannellumRef.current) {
      if ((pannellumRef.current as any)._clickHandler) {
        (pannellumRef.current as any)._container?.removeEventListener("click", (pannellumRef.current as any)._clickHandler);
      }
      try { pannellumRef.current.destroy(); } catch {}
      pannellumRef.current = null;
    }
    initViewer(startYaw, startPitch, startHfov);
  }

  function setStartPosition() {
    const vals = syncFromViewer();
    if (vals) alert(`Başlangıç konumu ayarlandı:\nYaw: ${vals.y}° · Pitch: ${vals.p}° · Zoom: ${vals.h}°`);
  }

  function addHotspot() {
    if (!pending || !hedefOda) return;
    const baslik = hedefBaslik || tumOdalar.find((o) => o.id === hedefOda)?.baslik || hedefOda;
    setHotspotlar((prev) => [...prev, { hedef: hedefOda, yaw: pending.yaw, pitch: pending.pitch, baslik, tip: hedefTip as any }]);
    setPending(null); setHedefOda(""); setHedefBaslik(""); setHedefTip("ilerleme"); setMode("view");
  }

  const diger = tumOdalar.filter((o) => o.id !== oda.id);

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-3">
      <div className="bg-white rounded-2xl w-full flex flex-col overflow-hidden" style={{ maxWidth: 1100, height: "92vh", fontFamily: "Poppins, sans-serif" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="font-semibold text-gray-900 text-sm">Hotspot & Kamera Editörü</h2>
            <p className="text-xs text-gray-400">📍 {oda.baslik}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { const v = syncFromViewer(); setMode(mode === "add" ? "view" : "add"); }}
              className="text-xs px-3 py-1.5 rounded-lg font-medium text-white"
              style={{ background: mode === "add" ? "#ef4444" : "#f0851b" }}
            >
              {mode === "add" ? "✕ İptal" : "+ Hotspot Ekle"}
            </button>
            <button
              onClick={() => { const v = syncFromViewer(); if (v) onSave(hotspotlar, v.y, v.p, v.h); }}
              className="text-xs bg-gray-900 text-white px-4 py-1.5 rounded-lg font-medium"
            >
              Kaydet
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none w-7 h-7 flex items-center justify-center">✕</button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Panorama */}
          <div className="flex-1 relative bg-gray-900">
            {mode === "add" && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-orange-500 text-white text-xs px-5 py-2 rounded-full font-medium shadow-lg pointer-events-none">
                Panoramada bir noktaya tıklayın
              </div>
            )}
            <div ref={viewerRef} className="w-full h-full" />
          </div>

          {/* Sağ panel */}
          <div className="w-72 border-l border-gray-100 flex flex-col overflow-hidden bg-white">

            {/* Kamera ayarları */}
            <div className="p-4 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Başlangıç Kamerası</p>

              <label className="text-xs text-gray-500 mb-1 block">Yatay Açı (Yaw): <span className="font-medium text-gray-800">{yaw}°</span></label>
              <input type="range" min="-180" max="180" step="0.5" value={yaw}
                onChange={(e) => { const v = Number(e.target.value); setYaw(v); applyToViewer(v, pitch, hfov); }}
                className="w-full mb-3" style={{ accentColor: "#f0851b" }}
              />

              <label className="text-xs text-gray-500 mb-1 block">Dikey Açı (Pitch): <span className="font-medium text-gray-800">{pitch}°</span></label>
              <input type="range" min="-90" max="90" step="0.5" value={pitch}
                onChange={(e) => { const v = Number(e.target.value); setPitch(v); applyToViewer(yaw, v, hfov); }}
                className="w-full mb-3" style={{ accentColor: "#f0851b" }}
              />

              <label className="text-xs text-gray-500 mb-1 block">Zoom (Hfov): <span className="font-medium text-gray-800">{hfov}°</span> <span className="text-gray-300">(küçük = yakın)</span></label>
              <input type="range" min="10" max="150" step="1" value={hfov}
                onChange={(e) => { const v = Number(e.target.value); setHfov(v); applyToViewer(yaw, pitch, v); }}
                className="w-full mb-3" style={{ accentColor: "#f0851b" }}
              />

              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Yaw", val: yaw, set: (v: number) => { setYaw(v); applyToViewer(v, pitch, hfov); } },
                  { label: "Pitch", val: pitch, set: (v: number) => { setPitch(v); applyToViewer(yaw, v, hfov); } },
                  { label: "Zoom", val: hfov, set: (v: number) => { setHfov(v); applyToViewer(yaw, pitch, v); } },
                ].map(({ label, val, set }) => (
                  <div key={label}>
                    <p className="text-xs text-gray-400 mb-1">{label}</p>
                    <input
                      type="number"
                      value={val}
                      onChange={(e) => set(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-orange-400 text-center"
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={setStartPosition}
                className="w-full mt-3 text-xs border py-2 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                style={{ borderColor: "#f0851b", color: "#f0851b" }}
              >
                📍 Panoramadan Al
              </button>
              <p className="text-xs text-gray-400 mt-1 text-center">Panoramayı istediğiniz konuma getirip tıklayın</p>
            </div>

            {/* Pending hotspot */}
            {pending && (
              <div className="p-4 bg-orange-50 border-b border-orange-100">
                <p className="text-xs font-semibold text-orange-800 mb-3">Yeni Hotspot</p>
                <p className="text-xs text-orange-500 mb-3 font-mono">Yaw: {pending.yaw}° · Pitch: {pending.pitch}°</p>
                <select
                  value={hedefOda}
                  onChange={(e) => setHedefOda(e.target.value)}
                  className="w-full border border-orange-200 rounded-lg px-3 py-2 text-xs mb-2 focus:outline-none bg-white"
                >
                  <option value="">Hedef oda seçin...</option>
                  {diger.map((o) => <option key={o.id} value={o.id}>{o.baslik}</option>)}
                </select>
                {/* İkon tipi seçimi */}
                <p className="text-xs text-gray-500 mb-1">İkon tipi</p>
                <div className="grid grid-cols-5 gap-1 mb-2">
                  {[
                    { val: "ilerleme", label: "→",   title: "İlerleme" },
                    { val: "ileri",    label: "↑",   title: "İleri" },
                    { val: "geri",     label: "↓",   title: "Geri" },
                    { val: "kapi-gir", label: "Giriş", title: "Kapı Girişi" },
                    { val: "kapi-cik", label: "Çıkış", title: "Kapı Çıkışı" },
                  ].map(({ val, label, title }) => (
                    <button
                      key={val}
                      onClick={() => setHedefTip(val)}
                      title={title}
                      className="py-1.5 rounded-lg text-sm border transition-all"
                      style={hedefTip === val
                        ? { background: "#f0851b", color: "white", borderColor: "#f0851b" }
                        : { background: "white", color: "#666", borderColor: "#fbd5a8" }
                      }
                    >{label}</button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Buton yazısı (opsiyonel)"
                  value={hedefBaslik}
                  onChange={(e) => setHedefBaslik(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addHotspot()}
                  className="w-full border border-orange-200 rounded-lg px-3 py-2 text-xs mb-3 focus:outline-none"
                />
                <div className="flex gap-2">
                  <button onClick={addHotspot} disabled={!hedefOda} className="flex-1 py-2 rounded-lg text-white text-xs font-medium disabled:opacity-40" style={{ background: "#f0851b" }}>Ekle</button>
                  <button onClick={() => setPending(null)} className="flex-1 py-2 rounded-lg text-gray-500 text-xs border border-gray-200">İptal</button>
                </div>
              </div>
            )}

            {/* Hotspot listesi */}
            <div className="flex-1 overflow-y-auto p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Hotspotlar ({hotspotlar.length})</p>
              {hotspotlar.length === 0 && (
                <p className="text-xs text-gray-400">Henüz hotspot eklenmemiş.<br/>+ Hotspot Ekle butonuna basıp panoramada bir noktaya tıklayın.</p>
              )}
              {hotspotlar.map((h, i) => (
                <div key={i} className="flex items-start justify-between bg-gray-50 rounded-lg px-3 py-2.5 mb-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{h.baslik}</p>
                    <p className="text-xs text-gray-400">→ {h.hedef}</p>
                    <p className="text-xs text-gray-300 font-mono">Y:{h.yaw}° P:{h.pitch}°</p>
                  </div>
                  <button onClick={() => setHotspotlar((prev) => prev.filter((_, idx) => idx !== i))} className="text-red-300 hover:text-red-500 text-sm ml-2 flex-shrink-0">✕</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .pnlm-hs-admin {
          width: 34px !important; height: 34px !important;
          background: rgba(240,133,27,0.92) !important;
          border: 2.5px solid rgba(255,255,255,0.85) !important;
          border-radius: 50% !important; cursor: pointer !important;
          margin: -17px 0 0 -17px !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;
          transition: transform 0.15s !important;
        }
        .pnlm-hs-admin:hover { background: #c8640a !important; transform: scale(1.2) !important; }
        .pnlm-tooltip { font-family: Poppins, sans-serif !important; font-size: 12px !important; border-radius: 6px !important; }
        .pnlm-ui .pnlm-controls-container { display: none !important; }
      `}</style>
    </div>
  );
}
