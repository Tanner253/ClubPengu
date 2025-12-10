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
} from "lucide-react";

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
  pumpfun: "https://pump.fun/coin/63RFxQy57mJKhRhWbdEQNcwmQ5kFfmSGJpVxKeVCpump",
};

const CONTRACT_ADDRESS = "63RFxQy57mJKhRhWbdEQNcwmQ5kFfmSGJpVxKeVCpump";

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

  const navItems = [
    { label: "About", href: "#about" },
    { label: "Features", href: "#features" },
    { label: "Customize", href: "#customization" },
    { label: "Economy", href: "#economy" },
    { label: "Wagering", href: "#wagering" },
    { label: "Roadmap", href: "#roadmap" },
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
              src="/icon.jpg" 
              alt="Club Pengu" 
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg object-cover"
            />
            <span className="font-bold text-lg sm:text-xl tracking-tight">
              Club <span className="gradient-text-blue">Pengu</span>
            </span>
          </a>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-sm text-slate-400 hover:text-white transition-colors"
              >
                {item.label}
              </a>
            ))}
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
              $CPw3
            </span>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-3">
            <span className="px-2 py-1 rounded-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-medium">
              $CPw3
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
          <div className="px-4 py-6 space-y-4">
            {/* Nav Links */}
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
          <span className="block">Club</span>
          <span className="gradient-text">Pengu</span>
        </motion.h1>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-xl md:text-2xl text-slate-400 mb-4 max-w-2xl mx-auto"
        >
          The First <span className="text-cyan-400 font-semibold">Trencher</span> Social Platform
        </motion.p>
        
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-lg text-slate-500 mb-12 max-w-xl mx-auto"
        >
          Reviving Club Penguin culture with Solana-native wagering, tradeable cosmetics, and virtual property rentals.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <a
            href="#about"
            className="group px-6 sm:px-8 py-3 sm:py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold flex items-center gap-2 hover:opacity-90 transition-all pulse-glow text-sm sm:text-base"
          >
            Explore Whitepaper
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </a>
          <button
            disabled
            className="px-6 sm:px-8 py-3 sm:py-4 rounded-xl bg-white/5 border border-white/10 text-slate-500 font-semibold flex items-center gap-2 cursor-not-allowed opacity-50 text-sm sm:text-base"
          >
            Play Demo
            <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full">Soon</span>
          </button>
        </motion.div>

        {/* Token badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-16 inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20"
        >
          <Coins className="w-5 h-5 text-yellow-500" />
          <span className="text-yellow-500 font-bold">$CPw3</span>
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
            Club Pengu brings the nostalgia of classic penguin social gaming into the future—combining 
            beloved mechanics with Solana&apos;s speed and the thrill of crypto-native wagering.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: <Users className="w-8 h-8" />,
              title: "Club Penguin Vibes",
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
                  <p className="text-slate-400 text-xs sm:text-sm">Spend $CPw3 on gacha or trade with other players</p>
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
            The <span className="text-yellow-400">$CPw3</span> Token
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            The native platform token that powers the Club Pengu ecosystem.
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
                    src="/icon.jpg" 
                    alt="Club Pengu" 
                    className="w-20 h-20 md:w-28 md:h-28 rounded-2xl object-cover mx-auto shadow-lg"
                  />
                  <p className="text-2xl font-bold text-white mt-4">$CPw3</p>
                  <p className="text-sm text-yellow-100/80">Club Pengu Web3</p>
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
                  description: "Use $CPw3 to rent igloos, apartments, lounges, and exclusive spaces throughout the game world.",
                },
                {
                  icon: <Sparkles className="w-5 h-5" />,
                  title: "Gacha System",
                  description: "Spend $CPw3 to open gacha for rare, tradeable cosmetics. Hunt for legendary items.",
                },
                {
                  icon: <Repeat className="w-5 h-5" />,
                  title: "Trading Economy",
                  description: "All gacha items are tradeable. Build wealth through smart cosmetic trading.",
                },
                {
                  icon: <Shield className="w-5 h-5" />,
                  title: "Access Control",
                  description: "Property owners can paywall their spaces with any Solana token—including $CPw3.",
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

// Wagering Section
function WageringSection() {
  const games = [
    { name: "Card Jitsu", emoji: "⚔️", description: "Fire beats Snow, Snow beats Water, Water beats Fire" },
    { name: "Connect 4", emoji: "🔴", description: "Classic four-in-a-row strategy game" },
    { name: "Tic Tac Toe", emoji: "⭕", description: "Quick matches, high stakes" },
    { name: "Pong", emoji: "🏓", description: "Fast reflexes, winner takes all" },
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
            All Solana-based tokens supported—not just $CPw3.
          </p>
        </motion.div>

        {/* Token showcase */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-wrap justify-center gap-3 mb-16"
        >
          {["$SOL", "$CPw3", "$BONK", "$WIF", "$PENGU", "Any SPL Token"].map((token, i) => (
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
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {games.map((game, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="feature-card glass-card rounded-2xl p-6 text-center"
            >
              <span className="text-5xl mb-4 block">{game.emoji}</span>
              <h3 className="text-lg font-bold mb-2">{game.name}</h3>
              <p className="text-slate-400 text-sm">{game.description}</p>
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
              { step: "04", title: "Play & Win", desc: "Winner takes all. Instant settlement on Solana" },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="text-4xl font-bold text-cyan-500/30 mb-4">{item.step}</div>
                <h4 className="font-semibold mb-2">{item.title}</h4>
                <p className="text-slate-400 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>
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
      status: "current",
      items: [
        "✅ 3D Voxel World Engine",
        "✅ Penguin Customization System",
        "✅ Puffle Companion System",
        "✅ Card Jitsu Minigame",
        "✅ AI NPCs & Social Features",
        "🔄 Playable Demo Release",
      ],
    },
    {
      phase: "Phase 2",
      title: "Expansion",
      status: "upcoming",
      items: [
        "New Locations (Beach, Ski Village, Plaza)",
        "Additional Minigames (Pong, Connect 4, Tic Tac Toe)",
        "Property Rental System",
        "Igloo Customization",
        "$CPw3 Token Integration",
      ],
    },
    {
      phase: "Phase 3",
      title: "Wagering",
      status: "planned",
      items: [
        "P2P Wagering System",
        "Multi-Token Support",
        "x403 Integration",
        "x402 Integration",
        "Leaderboards & Rankings",
      ],
    },
    {
      phase: "Phase 4",
      title: "Economy",
      status: "planned",
      items: [
        "Gacha System Launch",
        "Tradeable Cosmetics Marketplace",
        "Property Paywalls",
        "Advanced Social Features",
        "Mobile Companion App",
      ],
    },
  ];

  return (
    <section id="roadmap" className="py-32 px-6 relative">
      <div className="section-divider mb-32" />
      
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-purple-400 text-sm font-semibold uppercase tracking-widest">Roadmap</span>
          <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6">
            The <span className="text-purple-400">Journey</span> Ahead
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Our path from demo to the ultimate Web3 social gaming platform.
          </p>
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
              transition={{ delay: i * 0.1 }}
              className={`relative flex items-start gap-8 mb-12 ${
                i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
              }`}
            >
              {/* Dot */}
              <div className="absolute left-4 md:left-1/2 w-4 h-4 rounded-full bg-cyan-500 border-4 border-[rgb(8,12,21)] md:-translate-x-1/2 z-10" />

              {/* Content */}
              <div className={`ml-12 md:ml-0 md:w-1/2 ${i % 2 === 0 ? "md:pr-12 md:text-right" : "md:pl-12"}`}>
                <div
                  className={`glass-card rounded-2xl p-6 ${
                    phase.status === "current" ? "border-cyan-500/50" : ""
                  }`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        phase.status === "current"
                          ? "bg-cyan-500/20 text-cyan-400"
                          : phase.status === "upcoming"
                          ? "bg-purple-500/20 text-purple-400"
                          : "bg-white/5 text-slate-400"
                      }`}
                    >
                      {phase.phase}
                    </span>
                    {phase.status === "current" && (
                      <span className="text-xs text-cyan-400">● Live</span>
                    )}
                  </div>
                  <h3 className="text-xl font-bold mb-4">{phase.title}</h3>
                  <ul className={`space-y-2 text-sm text-slate-400 ${i % 2 === 0 ? "md:text-right" : ""}`}>
                    {phase.items.map((item, j) => (
                      <li key={j}>{item}</li>
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
            <p className="text-sm font-medium text-slate-300">$CPw3 on Solana</p>
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
                Club Pengu is currently in active development. Features, tokenomics, and gameplay mechanics 
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
                src="/icon.jpg" 
                alt="Club Pengu" 
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover"
              />
              <div className="text-center sm:text-left">
                <span className="font-bold text-base sm:text-lg">Club Pengu</span>
                <p className="text-slate-500 text-xs sm:text-sm">The First Trencher Social Platform</p>
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
              <a href={SOCIAL_LINKS.pumpfun} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                Buy $CPw3
              </a>
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
              <span>© 2025 Club Pengu</span>
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
      <AboutSection />
      <FeaturesSection />
      <CustomizationSection />
      <EconomySection />
      <WageringSection />
      <RoadmapSection />
      <Footer />
    </main>
  );
}
