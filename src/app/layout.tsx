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

export const metadata = {
  title: "Nexus — Enterprise Knowledge Worker",
  description:
    "AI-powered enterprise knowledge worker with Hybrid RAG, LangGraph stateful agents, Human-in-the-Loop governance, and real-time streaming.",
  keywords: ["AI", "enterprise", "RAG", "LangGraph", "knowledge worker", "pgvector", "Next.js", "TypeScript"],
  openGraph: {
    title: "Nexus Enterprise Knowledge Worker",
    description:
      "Hybrid RAG • LangGraph State Machine • HITL Governance — a portfolio-grade AI system built with Next.js 15, LangGraph.js, and PostgreSQL pgvector.",
    url: "https://nexus-enterprise-knowledge-worker.vercel.app",
    siteName: "Nexus Enterprise Knowledge Worker",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Nexus Enterprise Knowledge Worker — Hybrid RAG, LangGraph, HITL",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nexus Enterprise Knowledge Worker",
    description:
      "Hybrid RAG • LangGraph State Machine • HITL Governance — portfolio-grade AI built with Next.js 15, LangGraph.js & pgvector.",
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
