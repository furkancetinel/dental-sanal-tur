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
          background: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        {/* Turuncu 360 ikonu — SVG inline */}
        <svg
          width="220"
          height="220"
          viewBox="0 0 135.75 135.75"
          xmlns="http://www.w3.org/2000/svg"
          style={{ marginBottom: 40 }}
        >
          <circle cx="67.875" cy="67.875" r="65" fill="none" stroke="#f0851b" strokeWidth="5" />
          <text
            x="67.875"
            y="58"
            textAnchor="middle"
            fontSize="28"
            fontWeight="900"
            fill="#f0851b"
            fontFamily="sans-serif"
          >
            TURUNCU
          </text>
          <text
            x="67.875"
            y="88"
            textAnchor="middle"
            fontSize="42"
            fontWeight="900"
            fill="#1a1a1a"
            fontFamily="sans-serif"
            letterSpacing="-1"
          >
            360
          </text>
          <circle cx="67.875" cy="108" r="4" fill="#f0851b" />
        </svg>

        {/* Başlık */}
        <div
          style={{
            fontSize: 44,
            fontWeight: 700,
            color: "#1a1a1a",
            textAlign: "center",
            maxWidth: 900,
            lineHeight: 1.2,
          }}
        >
          {title}
        </div>

        {/* Alt turuncu çizgi */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 10,
            background: "#f0851b",
          }}
        />
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
