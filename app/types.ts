export interface Hotspot {
  hedef: string;
  yaw: number;
  pitch: number;
  baslik: string;
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
  odalar: Oda[];
}
