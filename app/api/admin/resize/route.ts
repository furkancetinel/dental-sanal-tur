import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getToursDir } from "@/lib/config";
import path from "path";
import fs from "fs";
import Jimp from "jimp";

export const maxDuration = 60;

async function resizeImage(inputPath: string, outputPath: string, maxWidth: number, maxHeight: number, quality: number) {
  const img = await Jimp.read(inputPath);
  const w = img.width, h = img.height;
  if (w > maxWidth || h > maxHeight) {
    img.scaleToFit(maxWidth, maxHeight);
  }
  img.quality(quality);
  await img.writeAsync(outputPath);
}

export async function POST(req: NextRequest) {
  if (!await isAuthenticated()) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  try {
    const toursDir = getToursDir();
    const results: string[] = [];
    const errors: string[] = [];

    const firms = fs.readdirSync(toursDir, { withFileTypes: true })
      .filter(e => e.isDirectory()).map(e => e.name);

    for (const firm of firms) {
      const photosDir = path.join(toursDir, firm, "photos");
      if (!fs.existsSync(photosDir)) continue;

      const files = fs.readdirSync(photosDir)
        .filter(f => /\.(jpg|jpeg|png)$/i.test(f) && !f.includes("-thumb") && !f.includes("-medium"));

      for (const file of files) {
        const fullPath = path.join(photosDir, file);
        const base = file.replace(/\.[^.]+$/, "");
        const thumbPath  = path.join(photosDir, `${base}-thumb.jpg`);
        const mediumPath = path.join(photosDir, `${base}-medium.jpg`);

        try {
          if (!fs.existsSync(thumbPath)) {
            await resizeImage(fullPath, thumbPath, 1024, 512, 75);
            results.push(`✓ ${firm}/${base}-thumb`);
          }
          if (!fs.existsSync(mediumPath)) {
            await resizeImage(fullPath, mediumPath, 2048, 1024, 85);
            results.push(`✓ ${firm}/${base}-medium`);
          }
        } catch (e: any) {
          errors.push(`✗ ${firm}/${file}: ${e.message}`);
        }
      }
    }

    return NextResponse.json({ ok: true, results, errors });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
