import type { Metadata, Viewport } from "next";
import "@fontsource/jetbrains-mono/latin-400.css";
import "@fontsource/jetbrains-mono/latin-500.css";
import "@fontsource/jetbrains-mono/latin-700.css";
import "./globals.css";

const DESCRIPTION = "Boot a Linux cyberdeck in your browser — the interactive 3D portfolio of Nilkanta Pandit, DevOps engineer.";
export const metadata: Metadata = {
  metadataBase: new URL("https://nilkanta-n01.vercel.app"),
  title: "NILKANTA N-01 — Portable Linux Computer",
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    url: "/",
    siteName: "NILKANTA N-01",
    title: "NILKANTA N-01 — Portable Linux Computer",
    description: DESCRIPTION,
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "The NILKANTA N-01 cyberdeck powered on, showing its menu" }],
  },
  twitter: { card: "summary_large_image", title: "NILKANTA N-01 — Portable Linux Computer", description: DESCRIPTION, images: ["/og.jpg"] },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ecebe7" },
    { media: "(prefers-color-scheme: dark)", color: "#050506" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* set the theme before first paint (no dark→light flash) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("n01-theme");if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="dark"}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
