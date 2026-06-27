import { notFound, redirect } from "next/navigation";
import { getKlinik } from "@/lib/config";
import TourViewer from "./TourViewer";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

const RESERVED = ["admin", "api", "_next", "favicon.ico"];

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const config = getKlinik(slug);
  const title = config ? `${config.klinikAdi} - Sanal Tur` : "Sanal Tur";
  const description = config
    ? `${config.klinikAdi} 360° sanal turunu keşfedin. Klinik odalarını, bekleme salonunu ve tüm alanları sanal olarak gezin.`
    : "360° Sanal Tur";
  const url = `https://sanaltur.turuncu360.com/${slug}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName: "Turuncu 360 - Sanal Tur",
      images: [
        {
          url: `https://sanaltur.turuncu360.com/api/og?title=${encodeURIComponent(title)}`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      type: "website",
      locale: "tr_TR",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`https://sanaltur.turuncu360.com/api/og?title=${encodeURIComponent(title)}`],
    },
  };
}

export default async function TourPage({ params }: Props) {
  const { slug } = await params;
  if (RESERVED.includes(slug)) redirect("/");
  const config = getKlinik(slug);
  if (!config) notFound();
  return <TourViewer config={config} />;
}
