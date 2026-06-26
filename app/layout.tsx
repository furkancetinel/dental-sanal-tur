import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sanal Tur",
  description: "360° Dental Klinik Sanal Tur",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased" style={{ fontFamily: "Poppins, sans-serif" }}>{children}</body>
    </html>
  );
}
