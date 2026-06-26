"use client";
import { useState, useRef } from "react";
import { TourConfig, Oda, Hotspot } from "../types";
import HotspotEditor from "./HotspotEditor";

interface Props { initialKlinikler: TourConfig[] }

const KATEGORILER = ["Klinikler", "Alanlar"];
const IKONLAR = [
  { value: "tooth", label: "Klinik" },
  { value: "armchair", label: "Bekleme" },
  { value: "route", label: "Koridor" },
  { value: "shield-check", label: "Sterilizasyon" },
  { value: "scan", label: "Röntgen" },
  { value: "coffee", label: "Mutfak" },
];

export default function AdminClient({ initialKlinikler }: Props) {
  const [klinikler, setKlinikler] = useState<TourConfig[]>(initialKlinikler);
  const [aktifKlinik, setAktifKlinik] = useState<TourConfig | null>(klinikler[0] || null);
  const [hotspotEditorOda, setHotspotEditorOda] = useState<Oda | null>(null);
  const [yeniKlinikForm, setYeniKlinikForm] = useState(false);
  const [yeniOdaForm, setYeniOdaForm] = useState(false);
  const [uploadingOda, setUploadingOda] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadOdaRef = useRef<string>("");

  const [klinikForm, setKlinikForm] = useState({ klinikAdi: "", logo: "", website: "", telefon: "" });
  const [odaForm, setOdaForm] = useState({ baslik: "", kategori: "Klinikler", aciklama: "", ikon: "tooth" });

  function flash(text: string) { setMsg(text); setTimeout(() => setMsg(""), 3000); }

  async function fetchKlinikler() {
    const res = await fetch("/api/admin/klinik");
    const data = await res.json();
    setKlinikler(data);
    if (aktifKlinik) {
      const updated = data.find((k: TourConfig) => k.id === aktifKlinik.id);
      setAktifKlinik(updated || null);
    }
  }

  async function klinikEkle() {
    if (!klinikForm.klinikAdi) return;
    setSaving(true);
    await fetch("/api/admin/klinik", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(klinikForm) });
    await fetchKlinikler();
    setKlinikForm({ klinikAdi: "", logo: "", website: "", telefon: "" });
    setYeniKlinikForm(false);
    flash("Klinik eklendi ✓");
    setSaving(false);
  }

  async function klinikSil(id: string) {
    if (!confirm("Bu kliniği silmek istediğinizden emin misiniz?")) return;
    await fetch("/api/admin/klinik", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    await fetchKlinikler();
    if (aktifKlinik?.id === id) setAktifKlinik(null);
    flash("Klinik silindi");
  }

  async function odaEkle() {
    if (!aktifKlinik || !odaForm.baslik) return;
    setSaving(true);
    await fetch("/api/admin/oda", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ klinikId: aktifKlinik.id, oda: odaForm }) });
    await fetchKlinikler();
    setOdaForm({ baslik: "", kategori: "Klinikler", aciklama: "", ikon: "tooth" });
    setYeniOdaForm(false);
    flash("Oda eklendi ✓");
    setSaving(false);
  }

  async function odaSil(odaId: string) {
    if (!aktifKlinik || !confirm("Bu odayı silmek istediğinizden emin misiniz?")) return;
    await fetch("/api/admin/oda", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ klinikId: aktifKlinik.id, odaId }) });
    await fetchKlinikler();
    flash("Oda silindi");
  }

  async function fotografYukle(file: File, odaId: string) {
    if (!aktifKlinik) return;
    setUploadingOda(odaId);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("klinikId", aktifKlinik.id);
    fd.append("odaId", odaId);
    await fetch("/api/admin/fotograf", { method: "POST", body: fd });
    await fetchKlinikler();
    setUploadingOda(null);
    flash("Fotoğraf yüklendi ✓");
  }

  async function hotspotKaydet(oda: Oda, hotspotlar: Hotspot[], yaw: number, pitch: number) {
    if (!aktifKlinik) return;
    await fetch("/api/admin/oda", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ klinikId: aktifKlinik.id, oda: { ...oda, hotspotlar, baslangicYaw: yaw, baslangicPitch: pitch } }),
    });
    await fetchKlinikler();
    setHotspotEditorOda(null);
    flash("Hotspotlar kaydedildi ✓");
  }

  return (
    <div style={{ fontFamily: "Poppins, sans-serif" }} className="min-h-screen bg-gray-50 flex flex-col">
      {/* Topbar */}
      <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/turuncu360-logo.svg" alt="Turuncu360" className="h-7" />
          <span className="text-gray-300">|</span>
          <span className="text-sm font-medium text-gray-600">Admin Paneli</span>
        </div>
        {msg && <span className="text-sm text-green-600 font-medium">{msg}</span>}
        <a href="/" target="_blank" className="text-xs text-gray-400 hover:text-gray-600">Siteyi Görüntüle →</a>
      </div>

      <div className="flex flex-1 overflow-hidden" style={{ height: "calc(100vh - 53px)" }}>
        {/* Sol: Klinik listesi */}
        <div className="w-64 bg-white border-r border-gray-100 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Klinikler</span>
            <button onClick={() => setYeniKlinikForm(true)} className="text-xs font-medium" style={{ color: "#f0851b" }}>+ Ekle</button>
          </div>

          {yeniKlinikForm && (
            <div className="p-3 border-b border-gray-100 bg-orange-50">
              <input className="w-full border border-orange-200 rounded-lg px-3 py-2 text-xs mb-2 focus:outline-none" placeholder="Klinik adı *" value={klinikForm.klinikAdi} onChange={(e) => setKlinikForm({ ...klinikForm, klinikAdi: e.target.value })} />
              <input className="w-full border border-orange-200 rounded-lg px-3 py-2 text-xs mb-2 focus:outline-none" placeholder="Logo URL" value={klinikForm.logo} onChange={(e) => setKlinikForm({ ...klinikForm, logo: e.target.value })} />
              <input className="w-full border border-orange-200 rounded-lg px-3 py-2 text-xs mb-2 focus:outline-none" placeholder="Website" value={klinikForm.website} onChange={(e) => setKlinikForm({ ...klinikForm, website: e.target.value })} />
              <input className="w-full border border-orange-200 rounded-lg px-3 py-2 text-xs mb-3 focus:outline-none" placeholder="Telefon" value={klinikForm.telefon} onChange={(e) => setKlinikForm({ ...klinikForm, telefon: e.target.value })} />
              <div className="flex gap-2">
                <button onClick={klinikEkle} disabled={saving} className="flex-1 py-2 rounded-lg text-white text-xs font-medium" style={{ background: "#f0851b" }}>Kaydet</button>
                <button onClick={() => setYeniKlinikForm(false)} className="flex-1 py-2 rounded-lg text-gray-500 text-xs border border-gray-200">İptal</button>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {klinikler.map((k) => (
              <div
                key={k.id}
                onClick={() => setAktifKlinik(k)}
                className={`px-4 py-3 cursor-pointer flex items-center justify-between group border-b border-gray-50 ${aktifKlinik?.id === k.id ? "bg-orange-50 border-l-2" : "hover:bg-gray-50"}`}
                style={aktifKlinik?.id === k.id ? { borderLeftColor: "#f0851b" } : {}}
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">{k.klinikAdi}</p>
                  <p className="text-xs text-gray-400">{k.odalar.length} oda</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); klinikSil(k.id); }} className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 text-sm">✕</button>
              </div>
            ))}
          </div>
        </div>

        {/* Sağ: Oda yönetimi */}
        <div className="flex-1 overflow-y-auto p-6">
          {!aktifKlinik ? (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">Soldan bir klinik seçin</div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">{aktifKlinik.klinikAdi}</h1>
                  <p className="text-xs text-gray-400 mt-0.5">
                    <a href={`/${aktifKlinik.id}`} target="_blank" className="text-orange-500 hover:underline">
                      sanaltur.turuncu360.com/{aktifKlinik.id} ↗
                    </a>
                  </p>
                </div>
                <button
                  onClick={() => setYeniOdaForm(true)}
                  className="px-4 py-2 rounded-lg text-white text-sm font-medium"
                  style={{ background: "#f0851b" }}
                >
                  + Oda Ekle
                </button>
              </div>

              {/* Yeni oda formu */}
              {yeniOdaForm && (
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-5 mb-6">
                  <p className="text-sm font-semibold text-gray-800 mb-4">Yeni Oda</p>
                  <div className="grid grid-cols-2 gap-3">
                    <input className="border border-orange-200 rounded-lg px-3 py-2 text-sm focus:outline-none col-span-2" placeholder="Oda adı *" value={odaForm.baslik} onChange={(e) => setOdaForm({ ...odaForm, baslik: e.target.value })} />
                    <select className="border border-orange-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white" value={odaForm.kategori} onChange={(e) => setOdaForm({ ...odaForm, kategori: e.target.value })}>
                      {KATEGORILER.map((k) => <option key={k}>{k}</option>)}
                    </select>
                    <select className="border border-orange-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white" value={odaForm.ikon} onChange={(e) => setOdaForm({ ...odaForm, ikon: e.target.value })}>
                      {IKONLAR.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
                    </select>
                    <input className="border border-orange-200 rounded-lg px-3 py-2 text-sm focus:outline-none col-span-2" placeholder="Açıklama (opsiyonel)" value={odaForm.aciklama} onChange={(e) => setOdaForm({ ...odaForm, aciklama: e.target.value })} />
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button onClick={odaEkle} disabled={saving} className="px-5 py-2 rounded-lg text-white text-sm font-medium" style={{ background: "#f0851b" }}>Kaydet</button>
                    <button onClick={() => setYeniOdaForm(false)} className="px-5 py-2 rounded-lg text-gray-500 text-sm border border-gray-200">İptal</button>
                  </div>
                </div>
              )}

              {/* Oda kartları */}
              <div className="grid gap-4">
                {aktifKlinik.odalar.map((oda) => (
                  <div key={oda.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <div className="flex items-start gap-4 p-4">
                      {/* Fotoğraf önizleme */}
                      <div className="w-32 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 relative">
                        {oda.foto ? (
                          <img src={oda.foto} alt={oda.baslik} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">Fotoğraf yok</div>
                        )}
                        {uploadingOda === oda.id && (
                          <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#f0851b", borderTopColor: "transparent" }} />
                          </div>
                        )}
                      </div>

                      {/* Bilgi */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{oda.baslik}</p>
                            <p className="text-xs text-gray-400">{oda.kategori} · {oda.aciklama}</p>
                            <p className="text-xs text-gray-300 mt-1">{oda.hotspotlar.length} hotspot · Yaw: {oda.baslangicYaw}°</p>
                          </div>
                          <button onClick={() => odaSil(oda.id)} className="text-gray-300 hover:text-red-400 text-sm ml-2">✕</button>
                        </div>

                        <div className="flex items-center gap-2 mt-3">
                          {/* Fotoğraf yükle */}
                          <button
                            onClick={() => { uploadOdaRef.current = oda.id; fileInputRef.current?.click(); }}
                            className="text-xs border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50"
                          >
                            {oda.foto ? "📷 Fotoğrafı Değiştir" : "📷 Fotoğraf Yükle"}
                          </button>
                          {/* Hotspot editörü */}
                          <button
                            onClick={() => setHotspotEditorOda(oda)}
                            disabled={!oda.foto}
                            className="text-xs px-3 py-1.5 rounded-lg text-white font-medium disabled:opacity-40"
                            style={{ background: "#f0851b" }}
                          >
                            🎯 Hotspot Düzenle ({oda.hotspotlar.length})
                          </button>
                        </div>
                        {!oda.foto && <p className="text-xs text-orange-400 mt-1">Hotspot eklemek için önce fotoğraf yükleyin</p>}
                      </div>
                    </div>
                  </div>
                ))}

                {aktifKlinik.odalar.length === 0 && (
                  <div className="text-center py-12 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
                    Henüz oda eklenmemiş. Yukarıdan ekleyin.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && uploadOdaRef.current) fotografYukle(file, uploadOdaRef.current);
          e.target.value = "";
        }}
      />

      {/* Hotspot Editor Modal */}
      {hotspotEditorOda && aktifKlinik && (
        <HotspotEditor
          oda={hotspotEditorOda}
          tumOdalar={aktifKlinik.odalar}
          onSave={(h, y, p) => hotspotKaydet(hotspotEditorOda, h, y, p)}
          onClose={() => setHotspotEditorOda(null)}
        />
      )}
    </div>
  );
}
