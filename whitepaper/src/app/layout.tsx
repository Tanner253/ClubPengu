import type { Metadata } from "next";
import { Baloo_2, Figtree, Noto_Sans_TC } from "next/font/google";
import "./globals.css";

const baloo = Baloo_2({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const notoSansTc = Noto_Sans_TC({
  subsets: ["latin"],
  variable: "--font-noto-tc",
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "WaddleBet | First Multichain Social Metaverse on Solana & Robinhood EVM",
  description: "No KYC. No accounts. Wager any SPL token P2P with instant on-chain settlement. Expanding to Robinhood Chain (Ethereum EVM). First multichain social wagering metaverse.",
  keywords: [
    "Solana",
    "Robinhood Chain",
    "Ethereum EVM",
    "Multichain",
    "Web3",
    "P2P Wagering",
    "No KYC",
    "x402",
    "SPL Token",
    "Crypto Gaming",
    "DeFi",
    "WaddleBet",
  ],
  icons: {
    icon: "/character.png",
    apple: "/character.png",
  },
  openGraph: {
    title: "WaddleBet | First Multichain Social Metaverse on Solana & Robinhood EVM",
    description: "No KYC. No accounts. Wager any SPL token P2P. Expanding to Robinhood Chain (Ethereum EVM).",
    type: "website",
    images: ["/character.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "WaddleBet | First Multichain Social Metaverse",
    description: "Live on Solana. Robinhood Chain (EVM) in development. First multichain social wagering metaverse.",
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
      <body
        className={`${baloo.variable} ${figtree.variable} ${notoSansTc.variable} antialiased`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
