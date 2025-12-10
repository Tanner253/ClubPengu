import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Club Pengu | Web3 Social Gaming on Solana",
  description: "The first trencher social platform. Reviving Club Penguin culture with Solana-native wagering, tradeable cosmetics, and property rentals.",
  keywords: ["Club Pengu", "Solana", "Web3", "Gaming", "NFT", "Crypto", "Social"],
  icons: {
    icon: "/icon.jpg",
    apple: "/icon.jpg",
  },
  openGraph: {
    title: "Club Pengu | Web3 Social Gaming on Solana",
    description: "The first trencher social platform. Reviving Club Penguin culture with Solana-native wagering.",
    type: "website",
    images: ["/icon.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Club Pengu | Web3 Social Gaming on Solana",
    description: "The first trencher social platform on Solana.",
    images: ["/icon.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${spaceGrotesk.variable} ${inter.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
