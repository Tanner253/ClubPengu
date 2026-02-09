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
  title: "WaddleBet | Permissionless Social Wagering on Solana",
  description: "No KYC. No accounts. Wager any SPL token P2P with instant on-chain settlement. x402 payment protocol, x403 wallet auth. First of its kind.",
  keywords: ["Solana", "Web3", "P2P Wagering", "No KYC", "x402", "SPL Token", "Crypto Gaming", "DeFi", "WaddleBet", "CPx402"],
  icons: {
    icon: "/character.png",
    apple: "/character.png",
  },
  openGraph: {
    title: "WaddleBet | Permissionless Social Wagering on Solana",
    description: "No KYC. No accounts. Wager any SPL token P2P with instant on-chain settlement.",
    type: "website",
    images: ["/character.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "WaddleBet | Permissionless Social Wagering on Solana",
    description: "No KYC. Wager any SPL token. x402 protocol. First permissionless social wagering platform.",
    images: ["/character.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${spaceGrotesk.variable} ${inter.variable} antialiased`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
