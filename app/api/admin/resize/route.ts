import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getToursDir } from "@/lib/config";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";

export const maxDuration = 120;

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
            execSync(`convert "${fullPath}" -resize 1024x512> -quality 80 "${thumbPath}"`, { timeout: 30000 });
            results.push(`✓ ${firm}/${base}-thumb`);
          }
          if (!fs.existsSync(mediumPath)) {
            execSync(`convert "${fullPath}" -resize 4096x2048> -quality 90 "${mediumPath}"`, { timeout: 60000 });
            results.push(`✓ ${firm}/${base}-medium`);
          }
        } catch (e: any) {
          errors.push(`✗ ${firm}/${file}: ${e.message}`);
        }
      }
    }

    return NextResponse.json({ ok: true, results, errors, toursDir });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
