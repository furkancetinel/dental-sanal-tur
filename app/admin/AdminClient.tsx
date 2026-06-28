"use client";
import { useState, useRef } from "react";
import { TourConfig, Oda, Hotspot } from "../types";
import HotspotEditor from "./HotspotEditor";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Props { initialKlinikler: TourConfig[] }

const KATEGORI_ONERILERI = ["Klinikler", "Alanlar", "Ofisler", "Ortak Alanlar"];
const ACIKLAMA_ONERILERI = ["Muayene & Tedavi", "Bekleme Salonu", "Sterilizasyon", "Röntgen", "Koridor", "Mutfak", "Toplantı Odası", "Resepsiyon"];

export default function AdminClient({ initialKlinikler }: Props) {
  const [firmalar, setFirmalar] = useState<TourConfig[]>(initialKlinikler);
  const [aktifFirma, setAktifFirma] = useState<TourConfig | null>(initialKlinikler[0] || null);
  const [hotspotEditorOda, setHotspotEditorOda] = useState<Oda | null>(null);
  const [yeniFirmaForm, setYeniFirmaForm] = useState(false);
  const [yeniOdaForm, setYeniOdaForm] = useState(false);
  const [uploadingOda, setUploadingOda] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadOdaIdRef = useRef<string>("");

  const [editingOdaId, setEditingOdaId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ baslik: "", kategori: "", aciklama: "" });
  const [firmaForm, setFirmaForm] = useState({ klinikAdi: "", logo: "", website: "", telefon: "" });
  const [odaForm, setOdaForm] = useState({ baslik: "", kategori: "Klinikler", aciklama: "" });

  function flash(text: string, type: "success" | "error" = "success") {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3500);
  }

  async function fetchFirmalar(keepId?: string) {
    try {
      const res = await fetch("/api/admin/klinik");
      if (!res.ok) throw new Error();
      const data: TourConfig[] = await res.json();
      setFirmalar(data);
      const id = keepId ?? aktifFirma?.id;
      if (id) {
        const updated = data.find((k) => k.id === id);
        setAktifFirma(updated ?? data[0] ?? null);
      } else {
        setAktifFirma(data[0] ?? null);
      }
    } catch {
      flash("Veri yüklenemedi", "error");
    }
  }

  async function firmaEkle() {
    if (!firmaForm.klinikAdi.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/klinik", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(firmaForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      await fetchFirmalar(data.id);
      setFirmaForm({ klinikAdi: "", logo: "", website: "", telefon: "" });
      setYeniFirmaForm(false);
      flash("Firma eklendi ✓");
    } catch (e: any) {
      flash(`Hata: ${e.message}`, "error");
    }
    setSaving(false);
  }

  async function firmaSil(id: string) {
    if (!confirm("Bu firmayı silmek istediğinizden emin misiniz?")) return;
    try {
      await fetch("/api/admin/klinik", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      await fetchFirmalar();
      flash("Firma silindi");
    } catch {
      flash("Hata oluştu", "error");
    }
  }

  async function odaEkle() {
    if (!aktifFirma || !odaForm.baslik.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/oda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ klinikId: aktifFirma.id, oda: odaForm }),
      });
      if (!res.ok) throw new Error();
      await fetchFirmalar(aktifFirma.id);
      setOdaForm({ baslik: "", kategori: "Klinikler", aciklama: "" });
      setYeniOdaForm(false);
      flash("Oda eklendi ✓");
    } catch {
      flash("Hata oluştu", "error");
    }
    setSaving(false);
  }

  async function odaSil(odaId: string) {
    if (!aktifFirma || !confirm("Bu odayı silmek istediğinizden emin misiniz?")) return;
    try {
      await fetch("/api/admin/oda", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ klinikId: aktifFirma.id, odaId }),
      });
      await fetchFirmalar(aktifFirma.id);
      flash("Oda silindi");
    } catch {
      flash("Hata oluştu", "error");
    }
  }

  async function odaDuzenle(oda: Oda) {
    if (!aktifFirma) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/oda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          klinikId: aktifFirma.id,
          oda: { ...oda, baslik: editForm.baslik, kategori: editForm.kategori, aciklama: editForm.aciklama },
        }),
      });
      if (!res.ok) throw new Error();
      await fetchFirmalar(aktifFirma.id);
      setEditingOdaId(null);
      flash("Oda güncellendi ✓");
    } catch {
      flash("Güncelleme hatası", "error");
    }
    setSaving(false);
  }

  async function compressImage(file: File, maxWidth: number, quality: number): Promise<File> {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let w = img.width, h = img.height;

        // Çok büyük fotoğraflar için ara adım — direkt 4096px çizemez
        const MAX_CANVAS = 4096;
        if (w > MAX_CANVAS || h > MAX_CANVAS) {
          // Önce yarı boyuta küçült
          const step = document.createElement("canvas");
          const sw = Math.min(w, MAX_CANVAS * 2);
          const sh = Math.round(h * sw / w);
          step.width = sw; step.height = sh;
          step.getContext("2d")!.drawImage(img, 0, 0, sw, sh);

          // Sonra hedef boyuta küçült
          if (sw > maxWidth) { h = Math.round(sh * maxWidth / sw); w = maxWidth; }
          else { w = sw; h = sh; }

          const canvas = document.createElement("canvas");
          canvas.width = w; canvas.height = h;
          canvas.getContext("2d")!.drawImage(step, 0, 0, w, h);
          canvas.toBlob((blob) => {
            if (!blob) { resolve(file); return; }
            resolve(new File([blob], "out.jpg", { type: "image/jpeg" }));
          }, "image/jpeg", quality);
        } else {
          if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
          const canvas = document.createElement("canvas");
          canvas.width = w; canvas.height = h;
          canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
          canvas.toBlob((blob) => {
            if (!blob) { resolve(file); return; }
            resolve(new File([blob], "out.jpg", { type: "image/jpeg" }));
          }, "image/jpeg", quality);
        }
      };
      img.onerror = () => resolve(file);
      img.src = url;
    });
  }

  async function uploadVersion(file: File, klinikId: string, odaId: string, quality: string): Promise<void> {
    const fd = new FormData();
    fd.append("file", file, "photo.jpg");
    fd.append("klinikId", klinikId);
    fd.append("odaId", odaId);
    fd.append("quality", quality);
    const res = await fetch("/api/admin/fotograf", { method: "POST", body: fd });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
  }

  async function fotografYukle(file: File, odaId: string) {
    if (!aktifFirma) return;
    setUploadingOda(odaId);
    try {
      // Sıralı yükle — paralel değil (memory sorunu önleme)
      const thumb  = await compressImage(file, 1024, 0.75);
      await uploadVersion(thumb, aktifFirma.id, odaId, "thumb");

      const medium = await compressImage(file, 2560, 0.88);
      await uploadVersion(medium, aktifFirma.id, odaId, "medium");

      // Full = orijinal dosyayı direkt yükle, canvas'a sokma
      await uploadVersion(file, aktifFirma.id, odaId, "full");

      await fetchFirmalar(aktifFirma.id);
      flash("Fotoğraf yüklendi ✓");
    } catch (e: any) {
      flash(`Hata: ${e.message}`, "error");
    }
    setUploadingOda(null);
  }

  async function hotspotKaydet(oda: Oda, hotspotlar: Hotspot[], yaw: number, pitch: number, hfov: number) {
    if (!aktifFirma) return;
    try {
      await fetch("/api/admin/oda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          klinikId: aktifFirma.id,
          oda: { ...oda, hotspotlar, baslangicYaw: yaw, baslangicPitch: pitch, baslangicHfov: hfov },
        }),
      });
      await fetchFirmalar(aktifFirma.id);
      setHotspotEditorOda(null);
      flash("Kaydedildi ✓");
    } catch {
      flash("Kayıt hatası", "error");
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function odaSirala(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !aktifFirma) return;
    const eskiSira = aktifFirma.odalar.map(o => o.id);
    const eskiIdx = eskiSira.indexOf(active.id as string);
    const yeniIdx = eskiSira.indexOf(over.id as string);
    const yeniSira = arrayMove(eskiSira, eskiIdx, yeniIdx);
    // Optimistik güncelleme
    const yeniOdalar = arrayMove(aktifFirma.odalar, eskiIdx, yeniIdx);
    setAktifFirma({ ...aktifFirma, odalar: yeniOdalar });
    try {
      await fetch("/api/admin/oda/sirala", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ klinikId: aktifFirma.id, odaIdleri: yeniSira }),
      });
      flash("Sıralama kaydedildi ✓");
    } catch {
      flash("Sıralama hatası", "error");
      await fetchFirmalar(aktifFirma.id);
    }
  }

  return (
    <div style={{ fontFamily: "Poppins, sans-serif" }} className="min-h-screen bg-gray-50 flex flex-col">
      {/* Topbar */}
      <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <img src="/turuncu360-logo.svg" alt="Turuncu360" className="h-7" />
          <span className="text-gray-300">|</span>
          <span className="text-sm font-medium text-gray-600">Admin Paneli</span>
        </div>
        {msg && (
          <span className={`text-sm font-medium px-3 py-1 rounded-full ${msg.type === "error" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
            {msg.text}
          </span>
        )}
        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              flash("Boyutlandırılıyor... (bu biraz sürebilir)", "success");
              const res = await fetch("/api/admin/resize", { method: "POST" });
              const data = await res.json();
              if (data.ok) {
                flash(`${data.results.length} versiyon ✓ | Hata: ${data.errors.join(" | ").substring(0, 100)}`);
              } else {
                flash(`Hata: ${data.error}`, "error");
              }
            }}
            className="text-xs border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50"
          >
            🖼 Eski Fotoğrafları Boyutlandır
          </button>
          <a href="/" target="_blank" className="text-xs text-gray-400 hover:text-gray-600">Siteyi Görüntüle →</a>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden" style={{ height: "calc(100vh - 53px)" }}>
        {/* Sol: Firma listesi */}
        <div className="w-64 bg-white border-r border-gray-100 flex flex-col overflow-hidden flex-shrink-0">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Firmalar</span>
            <button onClick={() => setYeniFirmaForm(true)} className="text-xs font-medium" style={{ color: "#f0851b" }}>+ Ekle</button>
          </div>

          {yeniFirmaForm && (
            <div className="p-3 border-b border-gray-100 bg-orange-50">
              <input
                className="w-full border border-orange-200 rounded-lg px-3 py-2 text-xs mb-2 focus:outline-none focus:border-orange-400"
                placeholder="Firma adı *"
                value={firmaForm.klinikAdi}
                onChange={(e) => setFirmaForm({ ...firmaForm, klinikAdi: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && firmaEkle()}
              />
              <input
                className="w-full border border-orange-200 rounded-lg px-3 py-2 text-xs mb-2 focus:outline-none focus:border-orange-400"
                placeholder="Logo URL"
                value={firmaForm.logo}
                onChange={(e) => setFirmaForm({ ...firmaForm, logo: e.target.value })}
              />
              <input
                className="w-full border border-orange-200 rounded-lg px-3 py-2 text-xs mb-2 focus:outline-none focus:border-orange-400"
                placeholder="Website"
                value={firmaForm.website}
                onChange={(e) => setFirmaForm({ ...firmaForm, website: e.target.value })}
              />
              <input
                className="w-full border border-orange-200 rounded-lg px-3 py-2 text-xs mb-3 focus:outline-none focus:border-orange-400"
                placeholder="Telefon"
                value={firmaForm.telefon}
                onChange={(e) => setFirmaForm({ ...firmaForm, telefon: e.target.value })}
              />
              <div className="flex gap-2">
                <button onClick={firmaEkle} disabled={saving} className="flex-1 py-2 rounded-lg text-white text-xs font-medium disabled:opacity-50" style={{ background: "#f0851b" }}>
                  {saving ? "..." : "Kaydet"}
                </button>
                <button onClick={() => { setYeniFirmaForm(false); setFirmaForm({ klinikAdi: "", logo: "", website: "", telefon: "" }); }} className="flex-1 py-2 rounded-lg text-gray-500 text-xs border border-gray-200">İptal</button>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {firmalar.map((k) => (
              <div
                key={k.id}
                onClick={() => setAktifFirma(k)}
                className={`px-4 py-3 cursor-pointer flex items-center justify-between group border-b border-gray-50 transition-colors ${aktifFirma?.id === k.id ? "bg-orange-50 border-l-2" : "hover:bg-gray-50"}`}
                style={aktifFirma?.id === k.id ? { borderLeftColor: "#f0851b" } : {}}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{k.klinikAdi}</p>
                  <p className="text-xs text-gray-400">{k.odalar.length} oda</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); firmaSil(k.id); }}
                  className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 text-sm flex-shrink-0 ml-2"
                >✕</button>
              </div>
            ))}
            {firmalar.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-8">Henüz firma eklenmemiş</p>
            )}
          </div>
        </div>

        {/* Sağ: Oda yönetimi */}
        <div className="flex-1 overflow-y-auto p-6">
          {!aktifFirma ? (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">Soldan bir firma seçin</div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">{aktifFirma.klinikAdi}</h1>
                  <a href={`/${aktifFirma.id}`} target="_blank" className="text-xs mt-0.5 hover:underline" style={{ color: "#f0851b" }}>
                    sanaltur.turuncu360.com/{aktifFirma.id} ↗
                  </a>
                </div>
                <button
                  onClick={() => setYeniOdaForm(true)}
                  className="px-4 py-2 rounded-lg text-white text-sm font-medium"
                  style={{ background: "#f0851b" }}
                >
                  + Oda Ekle
                </button>
              </div>

              {/* Başlangıç odası seçimi */}
              {aktifFirma.odalar.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-6 flex items-center gap-3">
                  <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">🚪 Giriş Odası</span>
                  <select
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none bg-white"
                    value={aktifFirma.baslangicOdaId ?? aktifFirma.odalar[0]?.id ?? ""}
                    onChange={async (e) => {
                      const res = await fetch("/api/admin/klinik/ayar", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ klinikId: aktifFirma.id, baslangicOdaId: e.target.value }),
                      });
                      if (res.ok) { await fetchFirmalar(aktifFirma.id); flash("Giriş odası güncellendi ✓"); }
                    }}
                  >
                    {aktifFirma.odalar.map(o => (
                      <option key={o.id} value={o.id}>{o.baslik}</option>
                    ))}
                  </select>
                  <span className="text-xs text-gray-400 whitespace-nowrap">Tur bu odadan başlar</span>
                </div>
              )}


              {yeniOdaForm && (
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-5 mb-6">
                  <p className="text-sm font-semibold text-gray-800 mb-4">Yeni Oda</p>
                  <div className="flex flex-col gap-3">
                    {/* Oda adı */}
                    <input
                      className="border border-orange-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                      placeholder="Oda adı * (örn: Klinik 1, Bekleme Salonu)"
                      value={odaForm.baslik}
                      onChange={(e) => setOdaForm({ ...odaForm, baslik: e.target.value })}
                      onKeyDown={(e) => e.key === "Enter" && odaEkle()}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      {/* Kategori - serbest yazım + öneri */}
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Kategori (menüde gruplar)</p>
                        <input
                          list="kategori-list"
                          className="w-full border border-orange-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                          placeholder="Klinikler, Alanlar..."
                          value={odaForm.kategori}
                          onChange={(e) => setOdaForm({ ...odaForm, kategori: e.target.value })}
                        />
                        <datalist id="kategori-list">
                          {[...KATEGORI_ONERILERI,
                            ...firmalar.flatMap(k => k.odalar.map(o => o.kategori))
                          ].filter((v, i, a) => v && a.indexOf(v) === i).map(k => <option key={k} value={k} />)}
                        </datalist>
                      </div>
                      {/* Açıklama - serbest yazım + öneri */}
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Açıklama (opsiyonel)</p>
                        <input
                          list="aciklama-list"
                          className="w-full border border-orange-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                          placeholder="Muayene, Bekleme..."
                          value={odaForm.aciklama}
                          onChange={(e) => setOdaForm({ ...odaForm, aciklama: e.target.value })}
                        />
                        <datalist id="aciklama-list">
                          {[...ACIKLAMA_ONERILERI,
                            ...firmalar.flatMap(k => k.odalar.map(o => o.aciklama))
                          ].filter((v, i, a) => v && a.indexOf(v) === i).map(k => <option key={k} value={k} />)}
                        </datalist>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button onClick={odaEkle} disabled={saving} className="px-5 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50" style={{ background: "#f0851b" }}>
                      {saving ? "Kaydediliyor..." : "Kaydet"}
                    </button>
                    <button onClick={() => setYeniOdaForm(false)} className="px-5 py-2 rounded-lg text-gray-500 text-sm border border-gray-200">İptal</button>
                  </div>
                </div>
              )}

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={odaSirala}>
                <SortableContext items={aktifFirma.odalar.map(o => o.id)} strategy={verticalListSortingStrategy}>
                  <div className="grid gap-4">
                    {aktifFirma.odalar.map((oda) => (
                      <SortableOdaKart
                        key={oda.id}
                        oda={oda}
                        editingOdaId={editingOdaId}
                        editForm={editForm}
                        setEditForm={setEditForm}
                        setEditingOdaId={setEditingOdaId}
                        uploadingOda={uploadingOda}
                        firmalar={firmalar}
                        onDuzenle={odaDuzenle}
                        onSil={odaSil}
                        onFotoClick={() => { uploadOdaIdRef.current = oda.id; fileInputRef.current?.click(); }}
                        onHotspot={() => setHotspotEditorOda(oda)}
                        KATEGORI_ONERILERI={KATEGORI_ONERILERI}
                        ACIKLAMA_ONERILERI={ACIKLAMA_ONERILERI}
                        saving={saving}
                      />
                    ))}

                    {aktifFirma.odalar.length === 0 && (
                      <div className="text-center py-12 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
                        Henüz oda eklenmemiş. Yukarıdan ekleyin.
                      </div>
                    )}
                  </div>
                </SortableContext>
              </DndContext>
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
          if (file && uploadOdaIdRef.current) {
            fotografYukle(file, uploadOdaIdRef.current);
          }
          e.target.value = "";
        }}
      />

      {/* Hotspot Editor Modal */}
      {hotspotEditorOda && aktifFirma && (
        <HotspotEditor
          oda={hotspotEditorOda}
          tumOdalar={aktifFirma.odalar}
          onSave={(h, y, p, hfov) => hotspotKaydet(hotspotEditorOda, h, y, p, hfov)}
          onClose={() => setHotspotEditorOda(null)}
        />
      )}
    </div>
  );
}

// Sürüklenebilir oda kartı
function SortableOdaKart({ oda, editingOdaId, editForm, setEditForm, setEditingOdaId, uploadingOda, firmalar, onDuzenle, onSil, onFotoClick, onHotspot, KATEGORI_ONERILERI, ACIKLAMA_ONERILERI, saving }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: oda.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-start gap-3 p-4">
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="flex-shrink-0 flex flex-col gap-1 cursor-grab active:cursor-grabbing pt-1 px-1 text-gray-300 hover:text-gray-500"
          title="Sürükleyerek sırala"
        >
          <div className="w-4 h-0.5 bg-current rounded" />
          <div className="w-4 h-0.5 bg-current rounded" />
          <div className="w-4 h-0.5 bg-current rounded" />
        </div>

        {/* Thumbnail */}
        <div
          className="w-32 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 relative cursor-pointer group"
          onClick={onFotoClick}
          title="Tıkla: fotoğraf yükle / değiştir"
        >
          {oda.foto ? (
            <img src={oda.foto} alt={oda.baslik} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 gap-1">
              <span className="text-2xl">📷</span>
              <span className="text-xs">Yükle</span>
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="text-white text-xs font-medium">Değiştir</span>
          </div>
          {uploadingOda === oda.id && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#f0851b", borderTopColor: "transparent" }} />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          {editingOdaId === oda.id ? (
            <div>
              <input
                className="w-full border border-orange-200 rounded-lg px-3 py-1.5 text-sm mb-2 focus:outline-none"
                placeholder="Oda adı *"
                value={editForm.baslik}
                onChange={(e: any) => setEditForm({ ...editForm, baslik: e.target.value })}
                onKeyDown={(e: any) => e.key === "Enter" && onDuzenle(oda)}
                autoFocus
              />
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <input list="edit-kategori-list" className="w-full border border-orange-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none" placeholder="Kategori" value={editForm.kategori} onChange={(e: any) => setEditForm({ ...editForm, kategori: e.target.value })} />
                  <datalist id="edit-kategori-list">{[...KATEGORI_ONERILERI, ...firmalar.flatMap((k: any) => k.odalar.map((o: any) => o.kategori))].filter((v: any, i: any, a: any) => v && a.indexOf(v) === i).map((k: any) => <option key={k} value={k} />)}</datalist>
                </div>
                <div>
                  <input list="edit-aciklama-list" className="w-full border border-orange-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none" placeholder="Açıklama" value={editForm.aciklama} onChange={(e: any) => setEditForm({ ...editForm, aciklama: e.target.value })} />
                  <datalist id="edit-aciklama-list">{[...ACIKLAMA_ONERILERI, ...firmalar.flatMap((k: any) => k.odalar.map((o: any) => o.aciklama))].filter((v: any, i: any, a: any) => v && a.indexOf(v) === i).map((k: any) => <option key={k} value={k} />)}</datalist>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => onDuzenle(oda)} disabled={saving} className="px-3 py-1.5 rounded-lg text-white text-xs font-medium disabled:opacity-50" style={{ background: "#f0851b" }}>{saving ? "..." : "Kaydet"}</button>
                <button onClick={() => setEditingOdaId(null)} className="px-3 py-1.5 rounded-lg text-gray-500 text-xs border border-gray-200">İptal</button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 text-sm truncate">{oda.baslik}</p>
                  <p className="text-xs text-gray-400">{oda.kategori}{oda.aciklama ? ` · ${oda.aciklama}` : ""}</p>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-xs text-gray-300">Yaw: {oda.baslangicYaw ?? 0}°</span>
                    <span className="text-xs text-gray-300">Pitch: {oda.baslangicPitch ?? 0}°</span>
                    <span className="text-xs text-gray-300">Zoom: {oda.baslangicHfov ?? 100}°</span>
                    <span className="text-xs text-gray-300">{oda.hotspotlar.length} hotspot</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                  <button onClick={() => { setEditingOdaId(oda.id); setEditForm({ baslik: oda.baslik, kategori: oda.kategori, aciklama: oda.aciklama }); }} className="text-gray-400 hover:text-gray-600 text-xs px-2 py-1 rounded hover:bg-gray-100">Düzenle</button>
                  <button onClick={() => onSil(oda.id)} className="text-gray-300 hover:text-red-400 text-sm px-1">✕</button>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <button onClick={onFotoClick} className="text-xs border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                  📷 {oda.foto ? "Fotoğrafı Değiştir" : "Fotoğraf Yükle"}
                </button>
                <button onClick={onHotspot} disabled={!oda.foto} className="text-xs px-3 py-1.5 rounded-lg text-white font-medium disabled:opacity-40" style={{ background: "#f0851b" }}>
                  🎯 Hotspot & Kamera ({oda.hotspotlar.length})
                </button>
              </div>
              {!oda.foto && <p className="text-xs mt-1" style={{ color: "#f0851b" }}>Fotoğraf yükleyince hotspot editörü açılır</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
