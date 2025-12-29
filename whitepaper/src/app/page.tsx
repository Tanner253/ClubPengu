"use client";

import { useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  Gamepad2,
  Coins,
  Home,
  Users,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Zap,
  Trophy,
  Palette,
  Building,
  Repeat,
  Shield,
  ChevronDown,
  Menu,
  X,
  Copy,
  Check,
  ScrollText,
} from "lucide-react";
import Changelog from "../components/Changelog";
import GachaSystemSection from "../components/GachaSystem";

// Custom Icons
const GitHubIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
  </svg>
);

const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const PumpFunIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
    <path d="M8 12h8M12 8v8" strokeWidth="2" stroke="currentColor" strokeLinecap="round"/>
  </svg>
);

// Social Links
const SOCIAL_LINKS = {
  github: "https://github.com/Tanner253/ClubPengu",
  x: "https://x.com/i/communities/1998537610592137381",
  pumpfun: "#", // Coming soon
};

const CONTRACT_ADDRESS = "BDbMVbcc5hD5qiiGYwipeuUVMKDs16s9Nxk2hrhbpump";

// Snow effect component
function Snowfall() {
  const [snowflakes, setSnowflakes] = useState<Array<{ id: number; left: number; delay: number; duration: number; size: number }>>([]);

  useEffect(() => {
    const flakes = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 10,
      duration: 10 + Math.random() * 20,
      size: 0.5 + Math.random() * 1,
    }));
    setSnowflakes(flakes);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {snowflakes.map((flake) => (
        <div
          key={flake.id}
          className="snowflake"
          style={{
            left: `${flake.left}%`,
            animationDelay: `${flake.delay}s`,
            animationDuration: `${flake.duration}s`,
            fontSize: `${flake.size}rem`,
          }}
        >
          ❄
        </div>
      ))}
    </div>
  );
}

// Navigation
function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const [featuresOpen, setFeaturesOpen] = useState(false);

  const navItems = [
    { label: "Bundle", href: "#bundle" },
    { label: "Product", href: "#about" },
    { label: "Wagering", href: "#wagering" },
    { label: "Economics", href: "#economics" },
    { label: "Team", href: "#team" },
    { label: "Roadmap", href: "#roadmap" },
  ];

  const gameFeatures = [
    { label: "Customization", href: "#customization" },
    { label: "Whale Status", href: "#whale-status" },
    { label: "Gacha System", href: "#gacha-system" },
    { label: "Token Economy", href: "#economy" },
    { label: "Changelog", href: "#changelog" },
  ];

  const socialLinks = [
    { icon: <GitHubIcon className="w-5 h-5" />, href: SOCIAL_LINKS.github, label: "GitHub" },
    { icon: <XIcon className="w-5 h-5" />, href: SOCIAL_LINKS.x, label: "X Community" },
    { icon: <PumpFunIcon className="w-5 h-5" />, href: SOCIAL_LINKS.pumpfun, label: "PumpFun" },
  ];

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? "bg-[rgb(8,12,21)]/90 backdrop-blur-xl border-b border-white/5" : ""
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2 sm:gap-3">
            <img 
              src="/character.png" 
              alt="WaddleBet" 
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg object-cover"
            />
            <span className="font-bold text-lg sm:text-xl tracking-tight">
              Waddle<span className="gradient-text-blue">Bet</span>
            </span>
          </a>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-6">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-sm text-slate-400 hover:text-white transition-colors"
              >
                {item.label}
              </a>
            ))}
            
            {/* Game Features Dropdown */}
            <div className="relative">
              <button
                onClick={() => setFeaturesOpen(!featuresOpen)}
                onBlur={() => setTimeout(() => setFeaturesOpen(false), 150)}
                className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors"
              >
                Game Features
                <ChevronDown className={`w-4 h-4 transition-transform ${featuresOpen ? 'rotate-180' : ''}`} />
              </button>
              {featuresOpen && (
                <div className="absolute top-full mt-2 right-0 w-48 py-2 rounded-xl bg-[rgb(15,20,30)] border border-white/10 shadow-xl">
                  {gameFeatures.map((item) => (
                    <a
                      key={item.label}
                      href={item.href}
                      className="block px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                {item.label}
              </a>
            ))}
                </div>
              )}
            </div>
          </div>

          {/* Desktop Social Links & Token */}
          <div className="hidden md:flex items-center gap-4">
            {/* Social Icons */}
            <div className="flex items-center gap-2">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                  title={social.label}
                >
                  {social.icon}
                </a>
              ))}
            </div>
            
            <div className="w-px h-6 bg-white/10" />
            
            <span className="px-3 py-1.5 rounded-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 text-cyan-400 text-sm font-medium">
              $WADDLE
            </span>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-3">
            <span className="px-2 py-1 rounded-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-medium">
              $WADDLE
            </span>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-[72px] left-0 right-0 z-40 bg-[rgb(8,12,21)]/95 backdrop-blur-xl border-b border-white/5 md:hidden"
        >
          <div className="px-4 py-6 space-y-2">
            {/* Main Nav Links */}
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-slate-300 hover:text-white transition-colors"
              >
                {item.label}
              </a>
            ))}
            
            {/* Game Features Collapsible */}
            <div className="py-2">
              <button
                onClick={() => setFeaturesOpen(!featuresOpen)}
                className="flex items-center justify-between w-full text-slate-400 hover:text-white transition-colors"
              >
                <span>Game Features</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${featuresOpen ? 'rotate-180' : ''}`} />
              </button>
              {featuresOpen && (
                <div className="mt-2 ml-4 space-y-2">
                  {gameFeatures.map((item) => (
                    <a
                      key={item.label}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="block py-1 text-sm text-slate-500 hover:text-white transition-colors"
                    >
                      {item.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
            
            <div className="h-px bg-white/10 my-4" />
            
            {/* Social Links */}
            <div className="flex items-center gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
            target="_blank"
            rel="noopener noreferrer"
                  className="flex items-center gap-2 py-2 text-slate-400 hover:text-white transition-all"
                >
                  {social.icon}
                  <span className="text-sm">{social.label}</span>
                </a>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </>
  );
}

// Hero Section
function HeroSection() {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, 150]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute inset-0 animated-bg" />
      
      {/* Grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <motion.div style={{ y, opacity }} className="relative z-10 text-center px-6 max-w-5xl mx-auto">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
          </span>
          <span className="text-sm text-slate-300">Now Building on Solana</span>
        </motion.div>

        {/* Main heading */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6"
        >
          <span className="block">Waddle</span>
          <span className="gradient-text">Bet</span>
        </motion.h1>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-xl md:text-2xl text-slate-400 mb-4 max-w-2xl mx-auto"
        >
          The First <span className="text-cyan-400 font-semibold">Permissionless</span> Social Wagering Platform
        </motion.p>
        
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-lg text-slate-500 mb-6 max-w-2xl mx-auto"
        >
          No KYC. No accounts. Just connect your wallet and wager <span className="text-white font-medium">any SPL token</span> against 
          anyone, anywhere. Powered by x402 payment protocol with instant on-chain settlement.
        </motion.p>

        {/* Tech Stack Pills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="flex flex-wrap justify-center gap-2 mb-8 max-w-2xl mx-auto"
        >
          {[
            { label: "No KYC", color: "from-green-500/20 to-emerald-500/20 border-green-500/30 text-green-400" },
            { label: "x403 Wallet Auth", color: "from-cyan-500/20 to-blue-500/20 border-cyan-500/30 text-cyan-400" },
            { label: "x402 P2P Protocol", color: "from-purple-500/20 to-pink-500/20 border-purple-500/30 text-purple-400" },
            { label: "Any SPL Token", color: "from-yellow-500/20 to-orange-500/20 border-yellow-500/30 text-yellow-400" },
            { label: "All Solana Cults", color: "from-pink-500/20 to-red-500/20 border-pink-500/30 text-pink-400" },
          ].map((pill, i) => (
            <span
              key={i}
              className={`px-3 py-1.5 rounded-full bg-gradient-to-r ${pill.color} text-xs font-semibold border`}
            >
              {pill.label}
            </span>
          ))}
        </motion.div>

        {/* Traction Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex justify-center gap-8 mb-12"
        >
          <div className="text-center">
            <div className="text-2xl md:text-3xl font-bold text-white">700+</div>
            <div className="text-xs text-slate-500 uppercase tracking-wider">Peak Concurrent</div>
          </div>
          <div className="w-px h-12 bg-white/10" />
          <div className="text-center">
            <div className="text-2xl md:text-3xl font-bold text-white">7+</div>
            <div className="text-xs text-slate-500 uppercase tracking-wider">P2P Games</div>
          </div>
          <div className="w-px h-12 bg-white/10" />
          <div className="text-center">
            <div className="text-2xl md:text-3xl font-bold text-white">Live</div>
            <div className="text-xs text-slate-500 uppercase tracking-wider">On Mainnet</div>
          </div>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <a
            href="#about"
            className="group px-6 sm:px-8 py-3 sm:py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold flex items-center gap-2 hover:opacity-90 transition-all pulse-glow text-sm sm:text-base"
          >
            Explore Whitepaper
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </a>
          <a
            href="https://waddle.bet"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 sm:px-8 py-3 sm:py-4 rounded-xl bg-white/10 border border-white/20 text-white font-semibold flex items-center gap-2 hover:bg-white/20 hover:border-white/30 transition-all text-sm sm:text-base"
          >
            Play Now
            <ExternalLink className="w-4 h-4" />
          </a>
        </motion.div>

        {/* Token badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-16 inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20"
        >
          <Coins className="w-5 h-5 text-yellow-500" />
          <span className="text-yellow-500 font-bold">$WADDLE</span>
          <span className="text-slate-400">•</span>
          <span className="text-slate-400 text-sm">Solana Native</span>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="flex flex-col items-center gap-2 text-slate-500"
        >
          <span className="text-xs uppercase tracking-widest">Scroll</span>
          <ChevronDown className="w-5 h-5" />
        </motion.div>
      </motion.div>
    </section>
  );
}

// Bundle Section - Demystifying the Bundle
function BundleSection() {
  const bundleHolders = [
    { wallet: "99ZYDvYeNw9DYG3SvFk13bjRkpXdx9bHUuQnVhy84jYS", percent: 1.97 },
    { wallet: "GAsvAHPPoxQsEAkrTshHE8u8MAdQCKzMXSLv3HDPk7xb", percent: 0.08 },
    { wallet: "3hK5mVFAGT1yzN9QgZaamjmeb5mzK5GQAXBBHVoiE96T", percent: 2.76 },
    { wallet: "7MfcoH6vdCsWBo8NBE5ezZQfzhqAxdYQxnicsbqYuj2X", percent: 2.07 },
    { wallet: "89LwG48p52RnB6X8T1C4RDYq4LP1nCN965REZfcUjWDf", percent: 1.58 },
    { wallet: "5qzFRgjj8cfMjB9W5PVDVtgn8vpSMvTktVDZMmV7Z5x1", percent: 1.38 },
    { wallet: "6dhrG4ixKsqHByajE4Ur38by3g3P2GZKMqaZXytSt7ij", percent: 1.23 },
    { wallet: "FmMFMUjBLNChWKmysAemswPVYtjX9d9y9S9a7EtNVm9N", percent: 0.2 },
    { wallet: "ABeccsRgujcPqm3dQRpNdvzt3ZrH6mmbozVFis4rG9zA", percent: 1.25 },
    { wallet: "EPh3Bjk65HxJ4p4gz8mByRaQDgJdtjtdcpaYqB2oYYBf", percent: 1.58 },
    { wallet: "FJb7LHdi47GygdUWbj5DLo3xnQJZrRdvZrqsuQMqtsrN", percent: 0.39 },
    { wallet: "CzkSccmfqpF7z9Yrcsw1AESRNJJ6rNkgWWLCBn2X2tCD", percent: 0.39 },
    { wallet: "Hc16fvevERV3RNJNziG2YJk3sRnuCa5N6EhC8jaEKAm3", percent: 1.08 },
    { wallet: "AG2c7nWPmVe1uGTkrLqdqgNCMxCSXbpVFs6UUemw1tLz", percent: 1.58 },
    { wallet: "GpdLQGzLsyicF2EBfXw2PgPM5aei2ThmNtk7vVHEFgbm", percent: 0.79 },
    { wallet: "9qYjY2TZhk2WJC7BUx2aeZp1s26n6y4yugmDArWchEBb", percent: 1.72 },
    { wallet: "7vHisWaDfFkoPFWixfncGpN6SrbfvakkxcK2BaJtRzeG", percent: 1.38 },
    { wallet: "A6wuU52PNhSV8saUApeXkdpvtRLbagNThNoxVK7xYrdk", percent: 0.08 },
    { wallet: "6Y72yX9Ekx17HPh6W6EooAuBmTfhDpv2W6RkBLyJxzDz", percent: 1.65 },
    { wallet: "Dk7VbRhg6FZEkbtuGtGKrvan3PdHwEY5JEXnr3Rsmebx", percent: 1.97 },
    { wallet: "8RuuaYZjHoEyHxziWH2CRoy6PizMKNyfwcfxvACarcQx", percent: 2.17 },
    { wallet: "FnvFri9W5pRN2B7UZ7ZwWTjMME7qGR9coRs4r7nBETBq", percent: 1.58 },
    { wallet: "8smF4FAirYoe39dCNnfrtwiQnTwTXPfYLi1ywmjZMppk", percent: 0.55 },
    { wallet: "228StDYgyBA6R5zsKYynnnazh6V93Yq1QEEUDyy23Tc8", percent: 0.08 },
    { wallet: "7nxkZ5phHSwQP7m4QvCigzJXQz1ZRjeRxeSnnCNSCPhm", percent: 0.47 },
    { wallet: "FUoHjRgxwKJwfQEMwcpMRQYhV8TscEoxZKee1wEzo1o7", percent: 0.39 },
    { wallet: "FDf6KmG6ZQ6d6RgsueGRJeSFVEwHMHbySF1CjXeEKxcL", percent: 1.97, note: "3 SOL bonus" },
    { wallet: "6jHTTtiUUWG82rDotrFEciH1CeKEdzXcuiEfYW41uzz7", percent: 0.24 },
    { wallet: "7wQNpuGnzG3WJiReAfV5fRQh8ZxjQ3F42Vr6XQM7xQnm", percent: 1.97 },
    { wallet: "9XdbPLGDfAvYHexgvR8jX9x5jxX2YEqW1TNXueZNq9EC", percent: 1.0 },
    { wallet: "J9D969CzcZ9rQaaa5PQgfXyaWqPHiAdRwHVvpZFuUYNd", percent: 1.5 },
  ];

  const devWallet = { wallet: "AXrG4FUNPeasXynafgwZNa7MVhfmjS3ibX9Q1iqR49zb", percent: 4.5, label: "Dev Wallet" };

  const totalHolderPercent = bundleHolders.reduce((acc, h) => acc + h.percent, 0);
  const avgHolding = totalHolderPercent / bundleHolders.length;
  const maxHolding = Math.max(...bundleHolders.map(h => h.percent));
  const minHolding = Math.min(...bundleHolders.map(h => h.percent));

  // Sort by percent descending for visualization
  const sortedHolders = [...bundleHolders].sort((a, b) => b.percent - a.percent);

  return (
    <section id="bundle" className="py-32 px-6 relative overflow-hidden">
      {/* Dramatic background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-emerald-400 text-sm font-semibold uppercase tracking-widest">Transparency</span>
          <h2 className="text-4xl md:text-6xl font-bold mt-4 mb-6">
            Demystifying the <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400">Bundle</span>
          </h2>
          <p className="text-slate-400 text-lg max-w-3xl mx-auto">
            We&apos;re migrating our community and holders to $WADDLE. 
            The dev wallet will purchase ~40% of supply and distribute it to proven, battle-tested holders.
          </p>
        </motion.div>

        {/* Airdrop Distribution Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-card rounded-2xl p-8 mb-16 border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-emerald-500/5"
        >
          <div className="flex items-center gap-3 justify-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center text-2xl">
              ⏰
            </div>
            <h3 className="text-2xl font-bold text-cyan-400">Airdrop Distribution Schedule</h3>
          </div>
          
          <div className="max-w-3xl mx-auto">
            <p className="text-slate-300 text-center mb-8 leading-relaxed">
              To ensure a <span className="text-emerald-400 font-semibold">fair and stable launch</span>, the dev wallet will purchase approximately 
              <span className="text-white font-bold"> 40% of supply</span> and distribute airdrops in a controlled, transparent manner.
            </p>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="text-center p-5 rounded-xl bg-white/5 border border-cyan-500/20">
                <div className="text-3xl mb-3">🚀</div>
                <div className="text-lg font-bold text-white mb-1">Launch</div>
                <div className="text-sm text-slate-400">Token goes live</div>
              </div>
              <div className="text-center p-5 rounded-xl bg-white/5 border border-emerald-500/20">
                <div className="text-3xl mb-3">⏳</div>
                <div className="text-lg font-bold text-emerald-400 mb-1">+1 Hour</div>
                <div className="text-sm text-slate-400">Airdrops begin</div>
              </div>
              <div className="text-center p-5 rounded-xl bg-white/5 border border-purple-500/20">
                <div className="text-3xl mb-3">🔄</div>
                <div className="text-lg font-bold text-purple-400 mb-1">Every 10 Min</div>
                <div className="text-sm text-slate-400">Next recipient receives</div>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20">
              <h4 className="font-bold text-emerald-400 mb-3 flex items-center gap-2">
                <span>📋</span> Distribution Order: Smallest → Largest
              </h4>
              <p className="text-slate-400 text-sm leading-relaxed">
                Airdrops will be distributed starting with the <span className="text-white font-semibold">smallest allocation recipients first</span>, 
                working up to the largest holders. This ensures early price stability and gives smaller holders their tokens 
                before larger amounts hit wallets. The entire distribution will complete over approximately <span className="text-cyan-400 font-semibold">4.5 hours</span> after launch.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {[
                { icon: "🛡️", label: "Prevents instant dumps" },
                { icon: "📈", label: "Allows organic price discovery" },
                { icon: "⚖️", label: "Fair to all holders" },
                { icon: "👀", label: "Fully transparent" },
              ].map((item, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-300 text-sm flex items-center gap-2"
                >
                  <span>{item.icon}</span>
                  {item.label}
                </span>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Why Bundles Are Scary vs Why Ours Is Different */}
        <div className="grid lg:grid-cols-2 gap-8 mb-16">
          {/* Why Bundles Are Scary */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="glass-card rounded-2xl p-8 border-red-500/20 bg-gradient-to-br from-red-500/5 to-transparent"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center text-2xl">
                ⚠️
              </div>
              <h3 className="text-2xl font-bold text-red-400">Why Bundles Are Scary</h3>
            </div>
            <ul className="space-y-4">
              {[
                { icon: "💀", text: "Can be \"1-clipped\" — dumped all at once by a single holder" },
                { icon: "🎯", text: "Often concentrated in few wallets with 10-20%+ each" },
                { icon: "🏃", text: "Holders have no history — could be snipers or bots" },
                { icon: "📉", text: "No proven loyalty — will sell at first pump" },
                { icon: "❓", text: "Unknown intentions — could be coordinated dump" },
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="text-xl shrink-0">{item.icon}</span>
                  <span className="text-slate-400">{item.text}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Why Our Bundle Is Different */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="glass-card rounded-2xl p-8 border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-2xl">
                💎
              </div>
              <h3 className="text-2xl font-bold text-emerald-400">Why Ours Is Different</h3>
            </div>
            <ul className="space-y-4">
              {[
                { icon: "✅", text: "Fair distribution — avg holding of only ~1.3% per wallet" },
                { icon: "🛡️", text: "28 individual holders — no single wallet dominates" },
                { icon: "🔥", text: "Battle-tested — held from $700K to $0 without selling" },
                { icon: "💰", text: "Dev making holders whole — using personal funds" },
                { icon: "🤝", text: "Day 1 supporters only — proven community members" },
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="text-xl shrink-0">{item.icon}</span>
                  <span className="text-slate-300">{item.text}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* Key Statistics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-card rounded-2xl p-8 mb-16 border-emerald-500/20"
        >
          <h3 className="text-xl font-bold text-center mb-8 text-emerald-400">📊 Bundle Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-center">
            <div className="p-4 rounded-xl bg-white/5">
              <div className="text-3xl font-bold text-emerald-400">{bundleHolders.length}</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Holders</div>
            </div>
            <div className="p-4 rounded-xl bg-white/5">
              <div className="text-3xl font-bold text-cyan-400">{avgHolding.toFixed(2)}%</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Avg. Holding</div>
            </div>
            <div className="p-4 rounded-xl bg-white/5">
              <div className="text-3xl font-bold text-yellow-400">{maxHolding}%</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Max Holding</div>
            </div>
            <div className="p-4 rounded-xl bg-white/5">
              <div className="text-3xl font-bold text-purple-400">{minHolding}%</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Min Holding</div>
            </div>
            <div className="p-4 rounded-xl bg-white/5">
              <div className="text-3xl font-bold text-pink-400">{(totalHolderPercent + devWallet.percent).toFixed(1)}%</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Total Bundle</div>
            </div>
          </div>
        </motion.div>

        {/* Visual Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h3 className="text-xl font-bold text-center mb-6">Distribution Visualization</h3>
          <p className="text-slate-500 text-center text-sm mb-8">Each bar represents one wallet&apos;s share. Hover for details.</p>
          
          {/* Bar Chart */}
          <div className="glass-card rounded-2xl p-6 pt-16 overflow-visible">
            <div className="flex items-end gap-1.5 justify-center min-w-[600px] h-64 overflow-visible">
              {sortedHolders.map((holder, i) => (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  whileInView={{ height: `${(holder.percent / maxHolding) * 100}%` }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.02, duration: 0.5 }}
                  className="group relative w-7 bg-gradient-to-t from-emerald-600 to-cyan-500 rounded-t-sm cursor-pointer hover:from-emerald-500 hover:to-cyan-400 transition-colors"
                >
                  {/* Tooltip */}
                  <div className={`absolute bottom-full mb-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 ${i < 3 ? 'left-0' : i > sortedHolders.length - 4 ? 'right-0' : 'left-1/2 -translate-x-1/2'}`}>
                    <div className="bg-black/95 rounded-lg px-4 py-3 text-sm whitespace-nowrap shadow-xl border border-white/10">
                      <div className="font-mono text-cyan-400 text-xs mb-1">{holder.wallet}</div>
                      <div className="text-white font-bold text-lg">{holder.percent}%</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="flex justify-center mt-6 text-sm text-slate-500">
              <span>Community Holders ({bundleHolders.length} wallets) — Hover bars for wallet details</span>
            </div>
          </div>
        </motion.div>

        {/* The Story */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-card rounded-2xl p-8 mb-16 border-cyan-500/20 bg-gradient-to-br from-cyan-500/5 to-purple-500/5"
        >
          <div className="max-w-3xl mx-auto text-center">
            <div className="text-5xl mb-6">🛡️</div>
            <h3 className="text-2xl font-bold mb-4">These Holders Have Been Tested</h3>
            <p className="text-slate-400 mb-6 leading-relaxed">
              Every wallet in this bundle belongs to a day 1 supporter and deep-pocketed round tripper. 
              They watched our previous token hit <span className="text-green-400 font-bold">$700,000 market cap</span> and 
              rode it all the way down to <span className="text-red-400 font-bold">$0</span> without selling.
            </p>
            <p className="text-slate-400 mb-8 leading-relaxed">
              This isn&apos;t a bundle of snipers or bots — it&apos;s a community of believers. 
              The dev is making these holders whole out of his own pocket because 
              <span className="text-cyan-400 font-semibold"> loyalty deserves to be rewarded.</span>
            </p>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-white/5 border border-green-500/20">
                <div className="text-2xl font-bold text-green-400">$700K</div>
                <div className="text-xs text-slate-500">Peak MC Held</div>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-red-500/20">
                <div className="text-2xl font-bold text-red-400">$0</div>
                <div className="text-xs text-slate-500">Rode To Zero</div>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-cyan-500/20">
                <div className="text-2xl font-bold text-cyan-400">100%</div>
                <div className="text-xs text-slate-500">Made Whole</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Dev Commitment */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-card rounded-2xl p-8 border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-pink-500/5"
        >
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-5xl shrink-0">
              ⚡
            </div>
            <div className="text-center md:text-left">
              <h3 className="text-2xl font-bold mb-3">Dev Commitment</h3>
              <p className="text-slate-400 mb-4">
                <span className="text-white font-bold">300+ hours</span> of development in just 
                <span className="text-white font-bold"> 16 days</span>. This project is built with 
                obsession, not speculation. The dev is all-in financially and personally.
              </p>
              <div className="flex flex-wrap justify-center md:justify-start gap-3">
                {[
                  { label: "300+ Hours", icon: "⏰" },
                  { label: "16 Days", icon: "📅" },
                  { label: "Self-Funded Airdrop", icon: "💸" },
                  { label: "Will Not Let It Die", icon: "🔥" },
                ].map((item, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 rounded-full bg-white/5 border border-purple-500/30 text-purple-300 text-sm flex items-center gap-2"
                  >
                    <span>{item.icon}</span>
                    {item.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Full Wallet List (Collapsible) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16"
        >
          <details className="glass-card rounded-2xl overflow-hidden">
            <summary className="p-6 cursor-pointer hover:bg-white/5 transition-colors flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ScrollText className="w-5 h-5 text-emerald-400" />
                <span className="font-bold">View Full Distribution List</span>
              </div>
              <ChevronDown className="w-5 h-5 text-slate-400" />
            </summary>
            <div className="p-6 pt-0 border-t border-white/5">
              <div className="grid gap-2 max-h-96 overflow-y-auto pr-2">
                {sortedHolders.map((holder, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2 px-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <code className="text-xs text-cyan-400 font-mono">
                      {holder.wallet}
                    </code>
                    <span className="text-emerald-400 font-bold text-sm ml-4">
                      {holder.percent}%
                    </span>
                  </div>
                ))}
                {/* Dev wallet highlighted */}
                <div className="flex items-center justify-between py-2 px-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
                  <div className="flex items-center gap-2">
                    <code className="text-xs text-purple-400 font-mono">
                      {devWallet.wallet}
                    </code>
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-xs">DEV</span>
                  </div>
                  <span className="text-purple-400 font-bold text-sm ml-4">
                    {devWallet.percent}%
                  </span>
                </div>
              </div>
            </div>
          </details>
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 text-center"
        >
          <p className="text-slate-500 mb-4">This bundle is a pillar of strength, not a red flag.</p>
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30">
            <span className="text-emerald-400 font-semibold">🏆 Community Strength</span>
            <span className="text-slate-500">•</span>
            <span className="text-cyan-400 font-semibold">💎 Diamond Hands Only</span>
            <span className="text-slate-500">•</span>
            <span className="text-purple-400 font-semibold">🚀 To Millions Together</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// About Section
function AboutSection() {
  return (
    <section id="about" className="py-32 px-6 relative">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-cyan-400 text-sm font-semibold uppercase tracking-widest">About</span>
          <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6">
            Waddle Into <span className="gradient-text-blue">Web3</span>
          </h2>
          <p className="text-slate-400 text-lg max-w-3xl mx-auto">
            WaddleBet brings the nostalgia of classic penguin social gaming into the future—combining 
            beloved mechanics with Solana&apos;s speed and the thrill of crypto-native wagering.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: <Users className="w-8 h-8" />,
              title: "WaddleBet Vibes",
              description: "Classic 3D voxel world, penguin customization, puffles, emotes, and the social experience you remember—rebuilt for Web3.",
              color: "from-cyan-500 to-blue-500",
            },
            {
              icon: <Building className="w-8 h-8" />,
              title: "GTA V Property",
              description: "Rent igloos, apartments, and lounges. Paywall your space with any token and invite players for exclusive hangouts.",
              color: "from-purple-500 to-pink-500",
            },
            {
              icon: <Repeat className="w-8 h-8" />,
              title: "RuneScape Trading",
              description: "Open gacha for rare cosmetics. Trade items with other players. Build your penguin empire through smart trading.",
              color: "from-yellow-500 to-orange-500",
            },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="feature-card glass-card rounded-2xl p-8"
            >
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white mb-6`}>
                {item.icon}
              </div>
              <h3 className="text-xl font-bold mb-3">{item.title}</h3>
              <p className="text-slate-400">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Features Section
function FeaturesSection() {
  const features = [
    {
      icon: <Gamepad2 className="w-6 h-6" />,
      title: "Classic Minigames",
      description: "Card Jitsu, Connect 4, Tic Tac Toe, Pong, and more. Challenge friends or strangers.",
    },
    {
      icon: <Palette className="w-6 h-6" />,
      title: "Deep Customization",
      description: "24+ penguin colors, hats, outfits, accessories. Express yourself in the virtual world.",
    },
    {
      icon: <Sparkles className="w-6 h-6" />,
      title: "Puffle Companions",
      description: "Adopt fluffy puffles from Common to Legendary rarity. Each has unique personalities.",
    },
    {
      icon: <Home className="w-6 h-6" />,
      title: "Virtual Properties",
      description: "Rent igloos, apartments, and exclusive spaces. Create your own paywalled hangouts.",
    },
    {
      icon: <Trophy className="w-6 h-6" />,
      title: "P2P Wagering",
      description: "Bet any Solana token on minigames. Winner takes all. You choose the stakes.",
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Solana Speed",
      description: "Instant transactions, low fees. All tokens on Solana chain are supported.",
    },
  ];

  return (
    <section id="features" className="py-32 px-6 relative">
      <div className="section-divider mb-32" />
      
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-cyan-400 text-sm font-semibold uppercase tracking-widest">Features</span>
          <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6">
            Everything You <span className="gradient-text-blue">Need</span>
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            A complete social gaming experience, powered by blockchain technology.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="feature-card glass-card rounded-2xl p-6 group"
            >
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4 group-hover:bg-cyan-500/20 transition-colors">
                {feature.icon}
              </div>
              <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
              <p className="text-slate-400 text-sm">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Customization Section
function CustomizationSection() {
  const customizationOptions = [
    {
      category: "Penguin Colors",
      count: "24+",
      description: "Express yourself with a wide range of penguin skin colors—from classic blue to rare gold and legendary rainbow variants.",
      examples: ["Blue", "Red", "Pink", "Gold", "Rainbow", "Ghost"],
    },
    {
      category: "Headwear",
      count: "17+",
      description: "Top off your look with crowns, party hats, viking helmets, propeller caps, and exclusive rare headgear.",
      examples: ["Crown", "Viking Helm", "Party Hat", "Propeller Cap", "Ninja Mask"],
    },
    {
      category: "Eyes",
      count: "17+",
      description: "Change your penguin's expression with different eye styles—from normal to cool shades, angry, sleepy, and more.",
      examples: ["Normal", "Cool Shades", "Angry", "Sleepy", "Hearts", "Stars"],
    },
    {
      category: "Mouth",
      count: "12+",
      description: "Give your penguin personality with various mouth options including beaks, smiles, and special expressions.",
      examples: ["Beak", "Smile", "Tongue Out", "Beard", "Whistle"],
    },
    {
      category: "Clothing",
      count: "20+",
      description: "Dress up with scarves, suits, costumes, and exclusive outfit pieces. Mix and match to create unique looks.",
      examples: ["Scarf", "Hoodie", "Suit", "Ninja Gi", "Holiday Sweater"],
    },
  ];

  return (
    <section id="customization" className="py-32 px-4 sm:px-6 relative overflow-hidden">
      <div className="section-divider mb-32" />
      
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>
      
      <div className="max-w-6xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-purple-400 text-sm font-semibold uppercase tracking-widest">Customization</span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mt-4 mb-6">
            Make Your Penguin <span className="text-purple-400">Unique</span>
          </h2>
          <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto">
            Deep character customization with hundreds of combinations. Unlock rare items through gacha or trade with other players.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Character Image */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative order-2 lg:order-1"
          >
            <div className="relative aspect-square max-w-lg mx-auto">
              {/* Glow effect behind image */}
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-purple-500/20 to-pink-500/20 rounded-3xl blur-2xl" />
              
              {/* Image container */}
              <div className="relative glass-card rounded-3xl overflow-hidden border border-white/10">
                <img 
                  src="/character.png" 
                  alt="Penguin Customization Interface" 
                  className="w-full h-full object-cover"
                />
                
                {/* Overlay label */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 sm:p-6">
                  <p className="text-white font-semibold text-sm sm:text-base">3D Voxel Character Creator</p>
                  <p className="text-slate-400 text-xs sm:text-sm">Real-time preview • Hundreds of options</p>
                </div>
              </div>
              
              {/* Floating badges */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 3 }}
                className="absolute -top-4 -right-4 px-3 py-1.5 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-bold shadow-lg"
              >
                ✨ Tradeable
              </motion.div>
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ repeat: Infinity, duration: 2.5, delay: 0.5 }}
                className="absolute -bottom-4 -left-4 px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold shadow-lg"
              >
                🎰 Gacha Exclusives
              </motion.div>
            </div>
          </motion.div>

          {/* Customization Options */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-4 order-1 lg:order-2"
          >
            {customizationOptions.map((option, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="feature-card glass-card rounded-xl p-4 sm:p-5"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-purple-500/30 flex items-center justify-center shrink-0">
                    <span className="text-lg sm:text-xl font-bold text-purple-400">{option.count}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white text-sm sm:text-base mb-1">{option.category}</h3>
                    <p className="text-slate-400 text-xs sm:text-sm mb-2 line-clamp-2">{option.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {option.examples.slice(0, 4).map((example, j) => (
                        <span 
                          key={j}
                          className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400 text-xs"
                        >
                          {example}
                        </span>
                      ))}
                      {option.examples.length > 4 && (
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs">
                          +more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Gacha CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 }}
              className="glass-card rounded-xl p-4 sm:p-5 border-yellow-500/20 bg-gradient-to-r from-yellow-500/5 to-orange-500/5"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center text-xl">
                  🎁
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-yellow-500 text-sm sm:text-base">Unlock Rare Items</h4>
                  <p className="text-slate-400 text-xs sm:text-sm">Spend tokens on gacha or trade with other players</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// Economy Section
function EconomySection() {
  return (
    <section id="economy" className="py-32 px-6 relative">
      <div className="section-divider mb-32" />
      
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-yellow-400 text-sm font-semibold uppercase tracking-widest">Economy</span>
          <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6">
            The <span className="text-yellow-400">Native</span> Token
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            The native platform token that powers the WaddleBet ecosystem.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Token visual */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="aspect-square max-w-md mx-auto relative">
              {/* Outer glow */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20 blur-3xl" />
              
              {/* Token circle */}
              <div className="absolute inset-8 rounded-full bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center glow-gold">
                <div className="text-center">
                  <img 
                    src="/character.png" 
                    alt="WaddleBet" 
                    className="w-20 h-20 md:w-28 md:h-28 rounded-2xl object-cover mx-auto shadow-lg"
                  />
                  <p className="text-2xl font-bold text-white mt-4">$WADDLE</p>
                  <p className="text-sm text-yellow-100/80">Solana Native Token</p>
                </div>
              </div>
              
              {/* Orbiting elements */}
              <div className="absolute inset-0 animate-spin" style={{ animationDuration: "20s" }}>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
                  <span className="text-lg">🎮</span>
                </div>
              </div>
              <div className="absolute inset-0 animate-spin" style={{ animationDuration: "25s", animationDirection: "reverse" }}>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-12 h-12 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center">
                  <span className="text-lg">🏠</span>
                </div>
              </div>
              <div className="absolute inset-0 animate-spin" style={{ animationDuration: "30s" }}>
                <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-pink-500/20 border border-pink-500/40 flex items-center justify-center">
                  <span className="text-lg">✨</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Token utility */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h3 className="text-2xl font-bold mb-8">Token Utility</h3>
            <div className="space-y-6">
              {[
                {
                  icon: <Home className="w-5 h-5" />,
                  title: "Property Rentals",
                  description: "Use tokens to rent igloos, apartments, lounges, and exclusive spaces throughout the game world.",
                },
                {
                  icon: <Sparkles className="w-5 h-5" />,
                  title: "Gacha System",
                  description: "Spend tokens to open gacha for rare, tradeable cosmetics. Hunt for legendary items.",
                },
                {
                  icon: <Repeat className="w-5 h-5" />,
                  title: "Trading Economy",
                  description: "All gacha items are tradeable. Build wealth through smart cosmetic trading.",
                },
                {
                  icon: <Shield className="w-5 h-5" />,
                  title: "Access Control",
                  description: "Property owners can paywall their spaces with any Solana token.",
                },
              ].map((item, i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-10 h-10 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-500 shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">{item.title}</h4>
                    <p className="text-slate-400 text-sm">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// Whale Status Section - Tiered Nametags
function WhaleStatusSection() {
  const tiers = [
    { 
      name: "Standard", 
      balance: "0 - 999", 
      color: "text-slate-400",
      bgColor: "bg-slate-500/10",
      borderColor: "border-slate-500/30",
      effects: "Basic white nametag",
      glow: false
    },
    { 
      name: "Bronze", 
      balance: "1K - 9.9K", 
      color: "text-amber-600",
      bgColor: "bg-amber-600/10",
      borderColor: "border-amber-600/30",
      effects: "Bronze shimmer effect",
      glow: false
    },
    { 
      name: "Silver", 
      balance: "10K - 99.9K", 
      color: "text-slate-300",
      bgColor: "bg-slate-300/10",
      borderColor: "border-slate-300/30",
      effects: "Silver glow + sparkles",
      glow: true
    },
    { 
      name: "Gold", 
      balance: "100K - 999K", 
      color: "text-yellow-400",
      bgColor: "bg-yellow-400/10",
      borderColor: "border-yellow-400/30",
      effects: "Gold aura + particle trail",
      glow: true
    },
    { 
      name: "Diamond", 
      balance: "1M - 9.9M", 
      color: "text-cyan-300",
      bgColor: "bg-cyan-300/10",
      borderColor: "border-cyan-300/30",
      effects: "Diamond prism + rainbow shimmer",
      glow: true
    },
    { 
      name: "Legendary", 
      balance: "10M+", 
      color: "text-purple-400",
      bgColor: "bg-gradient-to-r from-purple-500/20 to-pink-500/20",
      borderColor: "border-purple-500/50",
      effects: "Animated legendary crown + fire aura",
      glow: true
    },
  ];

  return (
    <section id="whale-status" className="py-32 px-6 relative overflow-hidden">
      <div className="section-divider mb-32" />
      
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-0 w-[500px] h-[500px] bg-yellow-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-3xl" />
      </div>
      
      <div className="max-w-6xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-yellow-400 text-sm font-semibold uppercase tracking-widest">Status System</span>
          <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6">
            Whale <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-purple-400 to-cyan-400">Status</span>
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Your token balance determines your visual status in-game. 
            <span className="text-yellow-400 font-semibold"> Bigger bags = bigger clout.</span>
          </p>
        </motion.div>

        {/* Live Nametag Preview */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <div className="glass-card rounded-2xl p-8 max-w-md mx-auto text-center border border-yellow-500/20">
            <p className="text-sm text-slate-500 mb-4">Live Nametag Preview</p>
            <div className="relative inline-block">
              <motion.div
                animate={{ 
                  boxShadow: [
                    "0 0 20px rgba(168, 85, 247, 0.4)",
                    "0 0 40px rgba(236, 72, 153, 0.4)",
                    "0 0 20px rgba(168, 85, 247, 0.4)"
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500/30 via-pink-500/30 to-purple-500/30 border border-purple-500/50"
              >
                <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400">
                  👑 DiamondFlipper
                </span>
              </motion.div>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute -top-2 -right-2 text-xl"
              >
                ✨
              </motion.div>
            </div>
            <p className="text-xs text-purple-400 mt-3">Legendary Tier • 15.2M tokens</p>
          </div>
        </motion.div>

        {/* Tiers Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tiers.map((tier, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`glass-card rounded-xl p-5 ${tier.borderColor} ${tier.glow ? 'relative overflow-hidden' : ''}`}
            >
              {tier.glow && (
                <div className={`absolute inset-0 ${tier.bgColor} opacity-30`} />
              )}
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-lg font-bold ${tier.color}`}>{tier.name}</span>
                  <span className="text-xs text-slate-500 font-mono">{tier.balance} tokens</span>
                </div>
                <p className="text-sm text-slate-400">{tier.effects}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Social Proof */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 text-center"
        >
          <p className="text-slate-500 text-sm mb-4">Everyone will know who the whales are 🐳</p>
          <div className="flex justify-center gap-2 flex-wrap">
            {["💎 Diamond holders get special emotes", "👑 Legendary tier = automatic clout", "🔥 Balance checked live via RPC"].map((perk, i) => (
              <span key={i} className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-400 text-xs">
                {perk}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}


// Wagering Section
function WageringSection() {
  const games = [
    { name: "Card Jitsu", emoji: "⚔️", description: "Fire beats Snow, Snow beats Water, Water beats Fire" },
    { name: "Connect 4", emoji: "🔴", description: "Classic four-in-a-row strategy game" },
    { name: "Blackjack", emoji: "🃏", description: "P2P vs shared dealer - best result wins" },
    { name: "Battleship", emoji: "🚢", description: "Classic naval warfare strategy game" },
    { name: "Tic Tac Toe", emoji: "⭕", description: "Quick matches, high stakes" },
    { name: "Monopoly", emoji: "🎩", description: "Property trading and strategy" },
    { name: "UNO", emoji: "🎴", description: "Classic card game, first to empty hand wins" },
  ];

  return (
    <section id="wagering" className="py-32 px-6 relative">
      <div className="section-divider mb-32" />
      
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-pink-400 text-sm font-semibold uppercase tracking-widest">Wagering</span>
          <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6">
            Bet <span className="text-pink-400">Any</span> Solana Token
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            P2P wagering on minigames. You choose the token, you set the stakes. 
            All Solana-based tokens supported.
          </p>
        </motion.div>

        {/* Token showcase */}
          <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          className="flex flex-wrap justify-center gap-3 mb-16"
          >
          {["$SOL", "$BONK", "$WIF", "$PENGU", "Any SPL Token"].map((token, i) => (
            <span
              key={i}
              className={`px-4 py-2 rounded-full text-sm font-medium ${
                i === 5
                  ? "bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 text-white"
                  : "bg-white/5 border border-white/10 text-slate-300"
              }`}
            >
              {token}
            </span>
          ))}
        </motion.div>

        {/* Games grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {games.map((game, i) => (
                    <motion.div
                      key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="feature-card glass-card rounded-2xl p-4 md:p-6 text-center"
            >
              <span className="text-4xl md:text-5xl mb-3 md:mb-4 block">{game.emoji}</span>
              <h3 className="text-base md:text-lg font-bold mb-1 md:mb-2">{game.name}</h3>
              <p className="text-slate-400 text-xs md:text-sm">{game.description}</p>
                    </motion.div>
                  ))}
              </div>
              
        {/* How it works */}
          <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          className="mt-16 glass-card rounded-2xl p-8 md:p-12"
          >
          <h3 className="text-2xl font-bold mb-8 text-center">How P2P Wagering Works</h3>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: "01", title: "Challenge", desc: "Challenge another player to any minigame" },
              { step: "02", title: "Select Token", desc: "Both players agree on which Solana token to wager" },
              { step: "03", title: "Set Stakes", desc: "Determine the amount—micro bets to high stakes" },
              { step: "04", title: "Play & Win", desc: "Winner gets 95% of pot. 5% rake supports platform." },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="text-4xl font-bold text-cyan-500/30 mb-4">{item.step}</div>
                <h4 className="font-semibold mb-2">{item.title}</h4>
                <p className="text-slate-400 text-sm">{item.desc}</p>
                </div>
              ))}
            </div>
            
          {/* Rake disclosure */}
          <div className="mt-8 p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-cyan-500/10 border border-green-500/20">
            <div className="flex items-center gap-3">
              <div className="text-2xl">💰</div>
                <div>
                <h4 className="font-semibold text-green-400">Platform Rake: 5%</h4>
                <p className="text-slate-400 text-sm">
                  A 5% rake is taken from all P2P wager pots to support platform development. 
                  Winner receives 95% of the total pot instantly on-chain.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
      </div>
    </section>
  );
}

// Platform Economics Section
function PlatformEconomicsSection() {
  const revenueStreams = [
    {
      name: "P2P Rake",
      rate: "5%",
      description: "All player-vs-player wagers",
      icon: "🎮",
    },
    {
      name: "Cosmetic Sales",
      rate: "Premium",
      description: "Skins, hats, effects & bundles",
      icon: "🎨",
    },
    {
      name: "Igloo Rentals",
      rate: "Weekly",
      description: "Virtual property subscriptions",
      icon: "🏠",
    },
  ];

  return (
    <section id="economics" className="py-32 px-6 relative">
      <div className="section-divider mb-32" />
      
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-green-400 text-sm font-semibold uppercase tracking-widest">Sustainability</span>
          <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6">
            Platform <span className="text-green-400">Economics</span>
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            A sustainable revenue model that funds continuous development, 
            supports token value, and grows the ecosystem.
          </p>
        </motion.div>

        {/* Revenue Flywheel Diagram */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-card rounded-2xl p-8 mb-12 border border-green-500/20 bg-gradient-to-br from-green-500/5 to-cyan-500/5"
        >
          <h3 className="text-xl font-bold text-center mb-8 text-green-400">💫 The Growth Flywheel</h3>
          <div className="grid md:grid-cols-5 gap-4 items-center">
            {[
              { step: "1", label: "Players Wager", icon: "🎮" },
              { step: "2", label: "Platform Earns", icon: "💰" },
              { step: "3", label: "Revenue Reinvested", icon: "📊" },
              { step: "4", label: "Platform Improves", icon: "🚀" },
              { step: "5", label: "More Players Join", icon: "👥" },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl mb-2">{item.icon}</div>
                <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center text-green-400 text-sm font-bold">
                  {item.step}
                </div>
                <p className="text-sm text-slate-300">{item.label}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-slate-500 text-sm mt-6">
            ↻ Sustainable growth cycle — platform profits benefit everyone
          </p>
        </motion.div>

        {/* Revenue Streams */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <h3 className="text-2xl font-bold mb-6 text-center">Revenue Streams</h3>
          <div className="grid md:grid-cols-3 gap-4">
            {revenueStreams.map((stream, i) => (
            <motion.div
              key={i}
                initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
                className="glass-card rounded-xl p-6 text-center"
            >
                <div className="text-4xl mb-4">{stream.icon}</div>
                <h4 className="font-bold text-lg mb-2">{stream.name}</h4>
                <div className="text-2xl font-bold text-cyan-400 mb-2">{stream.rate}</div>
                <p className="text-slate-400 text-sm">{stream.description}</p>
            </motion.div>
          ))}
        </div>
        </motion.div>

        {/* P2P Rake Deep Dive */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-card rounded-2xl p-8 mb-12"
        >
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-2xl font-bold mb-4">🎯 P2P Rake: 5%</h3>
              <p className="text-slate-400 mb-4">
                Industry-standard rake on player-vs-player wagers. The same proven model 
                used by poker rooms and betting exchanges worldwide.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-green-400">✓</span>
                  <span className="text-slate-300">Winner receives 95% of pot instantly</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-green-400">✓</span>
                  <span className="text-slate-300">Platform receives 5% to fund growth</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-green-400">✓</span>
                  <span className="text-slate-300">All settlements on-chain and verifiable</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-green-400">✓</span>
                  <span className="text-slate-300">Competitive with industry standards</span>
                </div>
              </div>
            </div>
            <div className="bg-black/30 rounded-xl p-6 border border-white/10">
              <h4 className="font-bold text-center mb-4 text-slate-300">Example Settlement</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-slate-400">Player A Wager</span>
                  <span className="font-mono text-white">1.00 SOL</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-slate-400">Player B Wager</span>
                  <span className="font-mono text-white">1.00 SOL</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-slate-400">Total Pot</span>
                  <span className="font-mono text-cyan-400">2.00 SOL</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-slate-400">Platform Rake (5%)</span>
                  <span className="font-mono text-yellow-400">0.10 SOL</span>
                </div>
                <div className="flex justify-between items-center py-2 bg-green-500/10 rounded-lg px-3 -mx-3">
                  <span className="text-green-400 font-semibold">Winner Receives</span>
                  <span className="font-mono text-green-400 font-bold">1.90 SOL</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Where Revenue Goes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-card rounded-2xl p-8 mb-12"
        >
          <h3 className="text-2xl font-bold mb-4 text-center">Where Revenue Goes</h3>
          <p className="text-slate-400 text-center mb-8 max-w-2xl mx-auto">
            Platform revenue is reinvested to grow the ecosystem and support token value. 
            When the platform wins, everyone wins.
          </p>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { icon: "🛠️", title: "Development", desc: "New games, features, bug fixes, and infrastructure improvements", color: "text-blue-400" },
              { icon: "📈", title: "Buybacks", desc: "Supporting token value through market purchases", color: "text-green-400" },
              { icon: "📣", title: "Marketing", desc: "Growing the community through partnerships and campaigns", color: "text-purple-400" },
              { icon: "🏦", title: "Reserve", desc: "Ensuring long-term stability and operational runway", color: "text-yellow-400" },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="text-4xl mb-3">{item.icon}</div>
                <h4 className={`font-bold mb-2 ${item.color}`}>{item.title}</h4>
                <p className="text-slate-400 text-sm">{item.desc}</p>
              </motion.div>
            ))}
              </div>
        </motion.div>

        {/* Industry Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-card rounded-2xl p-8"
        >
          <h3 className="text-2xl font-bold mb-6 text-center">Industry Comparison</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Platform</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium">Rake/Edge</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium">Model</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <tr className="bg-green-500/5">
                  <td className="py-3 px-4 font-semibold text-green-400">WaddleBet</td>
                  <td className="py-3 px-4 text-center font-mono text-green-400">5%</td>
                  <td className="py-3 px-4 text-center text-slate-300">P2P Rake</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-slate-300">PokerStars</td>
                  <td className="py-3 px-4 text-center font-mono text-slate-400">2.5-5%</td>
                  <td className="py-3 px-4 text-center text-slate-400">P2P Rake</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-slate-300">Stake.com</td>
                  <td className="py-3 px-4 text-center font-mono text-slate-400">1-5%</td>
                  <td className="py-3 px-4 text-center text-slate-400">House Edge</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-slate-300">Vegas Casinos</td>
                  <td className="py-3 px-4 text-center font-mono text-slate-400">2-15%</td>
                  <td className="py-3 px-4 text-center text-slate-400">House Edge</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-slate-300">Betfair Exchange</td>
                  <td className="py-3 px-4 text-center font-mono text-slate-400">2-5%</td>
                  <td className="py-3 px-4 text-center text-slate-400">P2P Commission</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-center text-slate-500 text-sm mt-4">
            Our 5% rake is competitive with industry leaders.
          </p>
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 text-center"
        >
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-green-500/20 to-cyan-500/20 border border-green-500/30">
            <span className="text-green-400 font-semibold">🔒 Transparent</span>
            <span className="text-slate-500">•</span>
            <span className="text-cyan-400 font-semibold">📊 Sustainable</span>
            <span className="text-slate-500">•</span>
            <span className="text-purple-400 font-semibold">🚀 Growth-Focused</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// Team Section
function TeamSection() {
  return (
    <section id="team" className="py-32 px-6 relative">
      <div className="section-divider mb-32" />
      
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-cyan-400 text-sm font-semibold uppercase tracking-widest">Team</span>
          <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6">
            Built by <span className="text-cyan-400">Builders</span>
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Doxxed developer with a track record. Open source. Transparent development.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-card rounded-2xl p-8 max-w-xl mx-auto"
        >
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <img
              src="https://avatars.githubusercontent.com/u/43557479?v=4"
              alt="Tanner"
              className="w-24 h-24 rounded-2xl object-cover border-2 border-cyan-500/30"
            />
            <div className="text-center sm:text-left">
              <h3 className="text-2xl font-bold text-white mb-1">Tanner</h3>
              <p className="text-cyan-400 font-medium mb-3">Lead Developer</p>
              <p className="text-slate-400 text-sm mb-4">
                8 years engineering experience. $10M+ volume devved across projects. 
                125+ public repos. Building in public since day one.
              </p>
              <div className="flex justify-center sm:justify-start gap-3">
                <a
                  href="https://github.com/Tanner253"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-all text-sm"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                  GitHub
                </a>
                <a
                  href="https://x.com/osknyo_dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-all text-sm"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  @osknyo_dev
                </a>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-400">$10M+</div>
                <div className="text-xs text-slate-500">Volume Devved</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">8</div>
                <div className="text-xs text-slate-500">Years Coding</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">125+</div>
                <div className="text-xs text-slate-500">Public Repos</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-cyan-400">Doxxed</div>
                <div className="text-xs text-slate-500">Identity</div>
              </div>
            </div>
          </div>

          {/* Achievements */}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {[
              "🏆 Arctic Code Vault Contributor",
              "🦈 Pull Shark x3",
              "⚡ Quickdraw",
              "🎯 YOLO",
            ].map((badge, i) => (
              <span
                key={i}
                className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-slate-400"
              >
                {badge}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Open Source Note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-slate-500 text-sm mt-8"
        >
          🔓 This project is open source. View the codebase on{" "}
          <a href="https://github.com/Tanner253/ClubPengu" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
            GitHub
          </a>
        </motion.p>
      </div>
    </section>
  );
}

// Roadmap Section
function RoadmapSection() {
  const phases = [
    {
      phase: "Phase 1",
      title: "Foundation",
      status: "complete",
      items: [
        "✅ 3D Voxel World Engine (Three.js)",
        "✅ Penguin Customization (24+ skins, 50+ items)",
        "✅ Puffle Companion System",
        "✅ Real-time Multiplayer (WebSocket)",
        "✅ AI NPCs & Chat System",
        "✅ MongoDB Database Integration",
      ],
    },
    {
      phase: "Phase 2",
      title: "Web3 & Auth",
      status: "complete",
      items: [
        "✅ Phantom Wallet Authentication",
        "✅ Solana Signature Verification",
        "✅ Whale Status Nametags",
        "✅ JWT Session Management",
        "✅ Guest Mode Support",
        "✅ Match History & Player Stats",
      ],
    },
    {
      phase: "Phase 3",
      title: "P2P Gaming",
      status: "complete",
      items: [
        "✅ Card Jitsu, Connect 4, Tic Tac Toe",
        "✅ Monopoly, UNO, Blackjack, Battleship",
        "✅ SPL Token Wagering (Any Token)",
        "✅ Custodial Wallet Settlement",
        "✅ 5% Platform Rake System",
        "✅ Orphan Match Recovery",
      ],
    },
    {
      phase: "Phase 4",
      title: "Properties & Casino",
      status: "complete",
      items: [
        "✅ Igloo Ownership System",
        "✅ Weekly Rental Payments",
        "✅ Igloo Customization (Banners, Themes)",
        "✅ Slot Machine Gacha System",
        "✅ Casino Room Environment",
        "✅ Jackpot Celebrations",
      ],
    },
    {
      phase: "Phase 5",
      title: "Rebranding",
      status: "current",
      items: [
        "🔄 New Token Launch",
        "🔄 OG Holder Airdrop",
        "🔄 Brand Refresh & Marketing",
        "🔄 Community Growth Campaign",
        "🔄 Influencer Partnerships",
        "🔄 Exchange Listings",
      ],
    },
    {
      phase: "Phase 6",
      title: "House Games",
      status: "upcoming",
      items: [
        "🎲 Dice (1-2% House Edge)",
        "📍 Plinko (3-5% House Edge)",
        "📈 Limbo / Crash Game",
        "🎰 Enhanced Slots (Real Payouts)",
        "🃏 PvE Blackjack vs Dealer",
        "⛏️ Mines Game",
      ],
    },
    {
      phase: "Phase 7",
      title: "Expansion",
      status: "planned",
      items: [
        "🏆 Tournament System",
        "💎 VIP & Rakeback Program",
        "🎨 Tradeable Cosmetics (NFTs)",
        "📱 Mobile App (iOS/Android)",
        "🤝 Major Partnerships",
        "🌍 Multi-language Support",
      ],
    },
    {
      phase: "Phase 8",
      title: "Ecosystem",
      status: "planned",
      items: [
        "🏛️ DAO Governance",
        "💰 Revenue Sharing for Holders",
        "🎮 Third-party Game SDK",
        "🔗 Cross-chain Expansion",
        "📺 Streaming Integration",
        "🌐 Metaverse Interoperability",
      ],
    },
  ];

  // Progress stats
  const completedPhases = phases.filter(p => p.status === "complete").length;
  const totalItems = phases.reduce((acc, p) => acc + p.items.length, 0);
  const completedItems = phases
    .filter(p => p.status === "complete")
    .reduce((acc, p) => acc + p.items.length, 0);

  return (
    <section id="roadmap" className="py-32 px-6 relative">
      <div className="section-divider mb-32" />
      
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="text-purple-400 text-sm font-semibold uppercase tracking-widest">Roadmap</span>
          <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6">
            The <span className="text-purple-400">Journey</span>
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            From concept to the ultimate Web3 social gaming platform. 
            Building in public, shipping fast.
          </p>
        </motion.div>

        {/* Progress Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-card rounded-2xl p-6 mb-12"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400 text-sm">Development Progress</span>
            <span className="text-green-400 font-bold">{completedPhases}/{phases.length} Phases Complete</span>
          </div>
          <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden mb-4">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: `${(completedPhases / phases.length) * 100}%` }}
              viewport={{ once: true }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-green-500 to-cyan-500"
            />
          </div>
          <div className="grid grid-cols-4 gap-4 text-center text-xs">
            <div>
              <div className="text-2xl font-bold text-green-400">{completedItems}</div>
              <div className="text-slate-500">Features Done</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-cyan-400">{totalItems - completedItems}</div>
              <div className="text-slate-500">In Progress</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-400">7+</div>
              <div className="text-slate-500">P2P Games</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-400">18</div>
              <div className="text-slate-500">Days Building</div>
            </div>
          </div>
        </motion.div>

        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 roadmap-line md:-translate-x-1/2" />

          {phases.map((phase, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: i % 2 === 0 ? -40 : 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className={`relative flex items-start gap-8 mb-8 ${
                i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
              }`}
            >
              {/* Dot */}
              <div className={`absolute left-4 md:left-1/2 w-4 h-4 rounded-full border-4 border-[rgb(8,12,21)] md:-translate-x-1/2 z-10 ${
                phase.status === "complete" ? "bg-green-500" :
                phase.status === "current" ? "bg-cyan-500 animate-pulse" :
                phase.status === "upcoming" ? "bg-purple-500" :
                "bg-slate-500"
              }`} />

              {/* Content */}
              <div className={`ml-12 md:ml-0 md:w-1/2 ${i % 2 === 0 ? "md:pr-12 md:text-right" : "md:pl-12"}`}>
                <div
                  className={`glass-card rounded-2xl p-5 transition-all ${
                    phase.status === "complete" ? "border-green-500/30 bg-green-500/5" :
                    phase.status === "current" ? "border-cyan-500/50 bg-cyan-500/5 ring-1 ring-cyan-500/20" :
                    phase.status === "upcoming" ? "border-purple-500/30" :
                    ""
                  }`}
                >
                  <div className={`flex items-center gap-3 mb-3 ${i % 2 === 0 ? "md:justify-end" : ""}`}>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        phase.status === "complete"
                          ? "bg-green-500/20 text-green-400"
                          : phase.status === "current"
                          ? "bg-cyan-500/20 text-cyan-400"
                          : phase.status === "upcoming"
                          ? "bg-purple-500/20 text-purple-400"
                          : "bg-white/5 text-slate-400"
                      }`}
                    >
                      {phase.phase}
                    </span>
                    {phase.status === "complete" && (
                      <span className="text-xs text-green-400">✓ Complete</span>
                    )}
                    {phase.status === "current" && (
                      <span className="text-xs text-cyan-400">● In Progress</span>
                    )}
                    {phase.status === "upcoming" && (
                      <span className="text-xs text-purple-400">◐ Next</span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold mb-3">{phase.title}</h3>
                  <ul className={`space-y-1.5 text-sm text-slate-400 ${i % 2 === 0 ? "md:text-right" : ""}`}>
                    {phase.items.map((item, j) => (
                      <li key={j} className={item.startsWith("✅") ? "text-slate-300" : ""}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Contract Address Copy Component
function ContractAddress() {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(CONTRACT_ADDRESS);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="glass-card rounded-xl p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
            <Coins className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Contract Address</p>
            <p className="text-sm font-medium text-slate-300">New Token on Solana</p>
          </div>
        </div>
        
        <div className="flex-1 w-full sm:w-auto">
          <div className="flex items-center gap-2 bg-black/30 rounded-lg px-3 py-2 border border-white/5">
            <code className="text-xs sm:text-sm text-cyan-400 font-mono truncate flex-1">
              {CONTRACT_ADDRESS}
            </code>
            <button
              onClick={copyToClipboard}
              className="p-1.5 rounded-md hover:bg-white/5 text-slate-400 hover:text-white transition-all shrink-0"
              title="Copy address"
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Footer
function Footer() {
  const socialLinks = [
    { icon: <GitHubIcon className="w-5 h-5" />, href: SOCIAL_LINKS.github, label: "GitHub" },
    { icon: <XIcon className="w-5 h-5" />, href: SOCIAL_LINKS.x, label: "X Community" },
    { icon: <PumpFunIcon className="w-5 h-5" />, href: SOCIAL_LINKS.pumpfun, label: "PumpFun" },
  ];

  return (
    <footer className="py-12 sm:py-16 px-4 sm:px-6 border-t border-white/5">
      <div className="max-w-6xl mx-auto">
        {/* Contract Address */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-8"
        >
          <ContractAddress />
        </motion.div>

        {/* Disclaimer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-card rounded-2xl p-4 sm:p-6 mb-8 sm:mb-12 border-yellow-500/20"
        >
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center text-yellow-500 shrink-0 text-sm sm:text-base">
              ⚠️
            </div>
            <div>
              <h4 className="font-semibold text-yellow-500 mb-2 text-sm sm:text-base">Development Notice</h4>
              <p className="text-slate-400 text-xs sm:text-sm">
                WaddleBet is currently in active development. Features, tokenomics, and gameplay mechanics 
                described in this whitepaper are subject to change. Join our community to stay updated on progress.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Footer content */}
        <div className="flex flex-col gap-8">
          {/* Top row: Logo and Social Links */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img 
                src="/character.png" 
                alt="WaddleBet" 
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover"
              />
              <div className="text-center sm:text-left">
                <span className="font-bold text-base sm:text-lg">WaddleBet</span>
                <p className="text-slate-500 text-xs sm:text-sm">Permissionless Social Wagering</p>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-2">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all"
                  title={social.label}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Bottom row: Links and Copyright */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-white/5">
            <div className="flex flex-wrap items-center justify-center gap-4 text-slate-500 text-xs sm:text-sm">
              <span className="text-cyan-400 font-semibold">
                $WADDLE
              </span>
              <span className="text-slate-700">•</span>
              <a href={SOCIAL_LINKS.github} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                GitHub
              </a>
              <span className="text-slate-700">•</span>
              <a href={SOCIAL_LINKS.x} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                Community
              </a>
            </div>

            <div className="flex items-center gap-2 text-slate-500 text-xs sm:text-sm">
              <span>Built on</span>
              <span className="text-purple-400 font-semibold">Solana</span>
              <span className="text-slate-700">•</span>
              <span>© 2025 WaddleBet</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

// Main Page
export default function WhitepaperPage() {
  return (
    <main className="relative">
      <Snowfall />
      <Navigation />
      <HeroSection />
      <BundleSection />
      <AboutSection />
      <FeaturesSection />
      <CustomizationSection />
      <WhaleStatusSection />
      <GachaSystemSection />
      <EconomySection />
      <WageringSection />
      <PlatformEconomicsSection />
      <TeamSection />
      <RoadmapSection />
      <Changelog />
      <Footer />
    </main>
  );
}
