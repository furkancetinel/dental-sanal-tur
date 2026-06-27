import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title") || "Sanal Tur";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #fff7ed 0%, #ffffff 60%, #fff3e0 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* Turuncu daire */}
        <div
          style={{
            width: 160,
            height: 160,
            borderRadius: "50%",
            border: "6px solid #f0851b",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 32,
            background: "white",
          }}
        >
          <div
            style={{
              fontSize: 64,
              fontWeight: 900,
              color: "#f0851b",
              letterSpacing: "-2px",
            }}
          >
            360
          </div>
        </div>

        {/* Başlık */}
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: "#1a1a1a",
            textAlign: "center",
            marginBottom: 16,
            maxWidth: 900,
          }}
        >
          {title}
        </div>

        {/* Alt yazı */}
        <div
          style={{
            fontSize: 28,
            color: "#f0851b",
            fontWeight: 500,
          }}
        >
          Turuncu 360° Sanal Tur
        </div>

        {/* Alt çizgi */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 8,
            background: "#f0851b",
          }}
        />
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
