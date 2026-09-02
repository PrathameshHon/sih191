import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ResQX — Intelligent Hazard Assessment & Relocation Platform | Maharashtra",
  description:
    "ResQX identifies hazard-based red zones across Maharashtra, assesses carrying capacity of safe land, and prioritizes relocation of vulnerable habitations — Multi-Hazard Risk Map, AI Hazard Score, Vulnerability Index, Carrying Capacity, Relocation Priority & Safe-Site Matching.",
  keywords: [
    "ResQX", "disaster management", "Maharashtra", "hazard map", "relocation planning",
    "carrying capacity", "vulnerability index", "SIH", "Smart India Hackathon", "PS191",
    "flood", "landslide", "drought", "NDMA", "SDMA",
  ],
  authors: [{ name: "Team ResQX" }],
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  openGraph: {
    title: "ResQX — Identify Risks. Assess Capacity. Prioritize Relocation. Save Lives.",
    description: "Government-grade multi-hazard risk intelligence and relocation planning for Maharashtra.",
    siteName: "ResQX",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#070d0b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} ${spaceGrotesk.variable} antialiased bg-background text-foreground`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
