import "./globals.css";

export const metadata = {
  title: "Nexus Enterprise Knowledge Worker",
  description: "AI-powered enterprise assistant",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
