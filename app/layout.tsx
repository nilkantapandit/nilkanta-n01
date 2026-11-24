import type { Metadata, Viewport } from "next";
import "@fontsource/jetbrains-mono/latin-400.css";
import "@fontsource/jetbrains-mono/latin-500.css";
import "@fontsource/jetbrains-mono/latin-700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "NILKANTA N-01 — Portable Linux Computer",
  description: "Real-time 3D prototype of the NILKANTA N-01 rugged Linux cyberdeck.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#050506",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
