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
  return {
    title: config ? `${config.klinikAdi} — Sanal Tur` : "Sanal Tur",
  };
}

export default async function TourPage({ params }: Props) {
  const { slug } = await params;
  if (RESERVED.includes(slug)) redirect("/");
  const config = getKlinik(slug);
  if (!config) notFound();
  return <TourViewer config={config} />;
}
