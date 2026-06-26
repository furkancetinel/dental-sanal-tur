import fs from "fs";
import path from "path";
import { notFound } from "next/navigation";
import { TourConfig } from "../types";
import TourViewer from "./TourViewer";

interface Props {
  params: Promise<{ slug: string }>;
}

function getConfig(slug: string): TourConfig | null {
  try {
    const configPath = path.join(process.cwd(), "public/tours", slug, "config.json");
    if (!fs.existsSync(configPath)) return null;
    return JSON.parse(fs.readFileSync(configPath, "utf-8"));
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const config = getConfig(slug);
  return {
    title: config ? `${config.klinikAdi} — Sanal Tur` : "Sanal Tur",
  };
}

export default async function TourPage({ params }: Props) {
  const { slug } = await params;
  const config = getConfig(slug);
  if (!config) notFound();
  return <TourViewer config={config} />;
}
