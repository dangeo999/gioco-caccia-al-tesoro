import type { Metadata, Viewport } from "next";
import { Press_Start_2P, VT323 } from "next/font/google";
import "./globals.css";
import { GameProvider } from "@/lib/game/store";

// Font pixel per i titoli/UI
const pixel = Press_Start_2P({
  weight: "400",
  variable: "--font-pixel",
  subsets: ["latin"],
});

// Font "terminale" leggibile per il testo corrente
const term = VT323({
  weight: "400",
  variable: "--font-term",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Il Segreto di Argil",
  description: "Caccia al tesoro di Halloween — Pofi. Sei stato osservato.",
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // Disegna dietro notch/home-indicator: gestiamo noi gli spazi con env(safe-area-*)
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="it"
      className={`${pixel.variable} ${term.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col scanlines">
        <GameProvider>{children}</GameProvider>
      </body>
    </html>
  );
}
