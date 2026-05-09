import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ABI Score Sheet",
  description: "Track team kills, reds, and extracted loot.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
