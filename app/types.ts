export interface Hotspot {
  hedef: string;
  yaw: number;
  pitch: number;
  baslik: string;
  tip?: "ileri" | "geri" | "kapi" | "kapi-gir" | "kapi-cik" | "yukari" | "asagi" | "ilerleme";
}

export interface Oda {
  id: string;
  baslik: string;
  kategori: string;
  aciklama: string;
  ikon: string;
  foto: string;
  baslangicYaw: number;
  baslangicPitch: number;
  baslangicHfov?: number;
  hotspotlar: Hotspot[];
}

export interface TourConfig {
  id: string;
  klinikAdi: string;
  logo: string;
  renk: string;
  website: string;
  telefon: string;
  baslangicOdaId?: string; // ilk açılacak oda
  odalar: Oda[];
}
