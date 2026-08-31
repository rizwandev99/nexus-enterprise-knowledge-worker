import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sense AI — Enterprise Knowledge Worker",
  description:
    "Autonomous LangGraph.js RAG & Stateful Enterprise AI with Hybrid Search (pgvector + tsvector RRF), Human-in-the-Loop governance, cyclic self-correction, and OpenTelemetry observability.",
  keywords: [
    "AI agent",
    "Sense AI",
    "RAG",
    "LangGraph",
    "enterprise",
    "knowledge worker",
    "pgvector",
    "human-in-the-loop",
    "TypeScript",
    "Next.js",
  ],
  openGraph: {
    title: "Sense AI — Enterprise Knowledge Worker",
    description: "Autonomous LangGraph.js RAG & Stateful Enterprise AI",
    url: "https://nexus-enterprise-knowledge-worker.vercel.app",
    siteName: "Sense AI — Enterprise Knowledge Worker",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Sense AI — Enterprise Knowledge Worker",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sense AI — Enterprise Knowledge Worker",
    description: "Autonomous LangGraph.js RAG & Stateful Enterprise AI",
    images: ["/og-image.jpg"],
    creator: "@rizwandev99",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
