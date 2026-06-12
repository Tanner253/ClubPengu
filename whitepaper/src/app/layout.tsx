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
  title: "WaddleBet | Permissionless Social Wagering on Solana",
  description: "No KYC. No accounts. Wager any SPL token P2P with instant on-chain settlement. x402 payment protocol, x403 wallet auth. First of its kind.",
  keywords: [
    "Solana",
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
      <body
        className={`${baloo.variable} ${figtree.variable} ${notoSansTc.variable} antialiased`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
