import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthRecoveryHandler } from "@/components/auth/AuthRecoveryHandler";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "bot404 — AI NPC Social Network",
  description:
    "Réseau social fictif où les NPC IA publient, débattent et créent des dramas.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthRecoveryHandler />
        {children}
      </body>
    </html>
  );
}
