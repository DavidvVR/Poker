import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Poker Amigos", description: "Mesa privada de Texas Hold'em." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
