import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getToursDir } from "@/lib/config";

const MIME: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg",
  png: "image/png", webp: "image/webp", gif: "image/gif",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ fotoyolu: string[] }> }
) {
  const { fotoyolu } = await params;
  const filePath = path.join(getToursDir(), ...fotoyolu);

  // Path traversal koruması
  const toursDir = getToursDir();
  if (!filePath.startsWith(toursDir)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  if (!fs.existsSync(filePath)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const ext = filePath.split(".").pop()?.toLowerCase() || "jpg";
  const mime = MIME[ext] || "application/octet-stream";
  const buffer = fs.readFileSync(filePath);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": mime,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
