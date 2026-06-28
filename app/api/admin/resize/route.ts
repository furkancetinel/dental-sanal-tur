import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getToursDir } from "@/lib/config";
import path from "path";
import fs from "fs";

export async function POST(req: NextRequest) {
  if (!await isAuthenticated()) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  try {
    const toursDir = getToursDir();
    const needed: { firm: string; oda: string; url: string }[] = [];

    const firms = fs.readdirSync(toursDir, { withFileTypes: true })
      .filter(e => e.isDirectory()).map(e => e.name);

    for (const firm of firms) {
      const photosDir = path.join(toursDir, firm, "photos");
      if (!fs.existsSync(photosDir)) continue;

      const files = fs.readdirSync(photosDir)
        .filter(f => /\.(jpg|jpeg|png)$/i.test(f) && !f.includes("-thumb") && !f.includes("-medium"));

      for (const file of files) {
        const base = file.replace(/\.[^.]+$/, "");
        const thumbPath  = path.join(photosDir, `${base}-thumb.jpg`);
        const mediumPath = path.join(photosDir, `${base}-medium.jpg`);

        if (!fs.existsSync(thumbPath) || !fs.existsSync(mediumPath)) {
          needed.push({ firm, oda: base, url: `/api/foto/${firm}/${file}` });
        }
      }
    }

    return NextResponse.json({ needed });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
