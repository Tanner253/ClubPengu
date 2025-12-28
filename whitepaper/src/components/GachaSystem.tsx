"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight, Sparkles, Gift, Trophy, Star, Gem, Crown, Zap } from "lucide-react";

// ============== DATA ==============

const RARITY_DATA = [
  { 
    name: "Common", 
    rate: "55%", 
    oneInX: "1.8",
    color: "text-slate-400",
    bgColor: "bg-slate-500/10",
    borderColor: "border-slate-500/30",
    emoji: "⚪",
    dupeGold: "25",
    items: 94,
    examples: ["Basic Hats", "Simple Eyes", "Common Clothing", "Basic Colors"],
  },
  { 
    name: "Uncommon", 
    rate: "28%", 
    oneInX: "3.6",
    color: "text-green-400",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
    emoji: "🟢",
    dupeGold: "50",
    items: 52,
    examples: ["Viking Helmet", "Gold Chain", "Metallic Colors", "Nature Tones"],
  },
  { 
    name: "Rare", 
    rate: "12%", 
    oneInX: "8.3",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    emoji: "🔵",
    dupeGold: "150",
    items: 54,
    examples: ["Crown", "Laser Eyes", "Neon Colors", "Jewel Tones"],
  },
  { 
    name: "Epic", 
    rate: "4%", 
    oneInX: "25",
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30",
    emoji: "🟣",
    dupeGold: "500",
    items: 25,
    examples: ["Angel Wings", "Rainbow Skin", "Aurora", "Ice"],
  },
  { 
    name: "Legendary", 
    rate: "0.8%", 
    oneInX: "125",
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/30",
    emoji: "🟡",
    dupeGold: "2,500",
    items: 21,
    examples: ["Fire Eyes", "Wizard Hat", "Holographic Skin", "Chromatic"],
  },
  { 
    name: "Mythic", 
    rate: "0.18%", 
    oneInX: "556",
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    emoji: "🔴",
    dupeGold: "10,000",
    items: 14,
    examples: ["Void Crown", "Dragon Wings", "Void Black", "Ethereal Skin"],
  },
  { 
    name: "Divine", 
    rate: "0.02%", 
    oneInX: "5,000",
    color: "text-cyan-300",
    bgColor: "bg-gradient-to-r from-cyan-500/10 to-pink-500/10",
    borderColor: "border-cyan-400/50",
    emoji: "✨",
    dupeGold: "50,000",
    items: 7,
    examples: ["Cosmic Crown", "Omniscient Gaze", "Celestial Skin", "Transcendent"],
    special: true,
  },
];

const QUALITY_DATA = [
  { name: "Worn", chance: "10%", multiplier: "0.75x", color: "text-slate-500", desc: "Slightly faded appearance" },
  { name: "Standard", chance: "60%", multiplier: "1.0x", color: "text-slate-300", desc: "Normal quality" },
  { name: "Pristine", chance: "25%", multiplier: "1.25x", color: "text-green-400", desc: "Crisp, clean visuals" },
  { name: "Flawless", chance: "5%", multiplier: "1.5x", color: "text-yellow-400", desc: "Perfect condition, premium shine" },
];

const PITY_DATA = [
  { tier: "Rare+", threshold: 40, desc: "Guaranteed Rare or better every 40 rolls" },
  { tier: "Epic+", threshold: 100, desc: "Guaranteed Epic or better every 100 rolls" },
  { tier: "Legendary+", threshold: 400, desc: "Guaranteed Legendary or better every 400 rolls" },
];

const CATEGORY_DATA = [
  { name: "Hats", icon: "🎩", gacha: 46, promo: 2, examples: ["Top Hat", "Crown", "Wizard Hat", "Cosmic Crown"] },
  { name: "Eyes", icon: "👀", gacha: 37, promo: 3, examples: ["Laser Eyes", "Fire Eyes", "Galaxy Eyes", "Omniscient Gaze"] },
  { name: "Mouths", icon: "👄", gacha: 32, promo: 0, examples: ["Cigarette", "Gold Grill", "Fire Breath", "Dragon Maw"] },
  { name: "Body Items", icon: "👕", gacha: 39, promo: 4, examples: ["Angel Wings", "Jetpack", "Dragon Wings", "Celestial Aura"] },
  { name: "Skins", icon: "🎨", gacha: 108, promo: 0, examples: ["Neon Colors", "Jewel Tones", "Rainbow", "Celestial", "Void Black"] },
  { name: "Mounts", icon: "🐴", gacha: 9, promo: 2, examples: ["Skateboard", "Hoverboard", "Phoenix", "Cosmic Serpent"] },
];

const ECONOMICS_DATA = {
  rollPrice: "25 Pebbles",
  rollPriceSol: "0.025 SOL",
  pebblesPerSol: 1000,
  withdrawRake: "5%",
  minDeposit: "100 Pebbles (0.1 SOL)",
  minWithdraw: "100 Pebbles",
};

const ULTRA_RARE_COMBOS = [
  { name: "Flawless Holo Divine", chance: "1 in 1,250,000", avgCost: "31,250 SOL" },
  { name: "Flawless Divine", chance: "1 in 100,000", avgCost: "2,500 SOL" },
  { name: "Holographic Divine", chance: "1 in 62,500", avgCost: "1,562 SOL" },
  { name: "Any Divine", chance: "1 in 5,000", avgCost: "125 SOL" },
];

// ============== COMPONENTS ==============

function CollapsibleSection({ 
  title, 
  icon, 
  children, 
  defaultOpen = false,
  badgeText,
  badgeColor = "bg-cyan-500/20 text-cyan-400"
}: { 
  title: string; 
  icon: React.ReactNode; 
  children: React.ReactNode;
  defaultOpen?: boolean;
  badgeText?: string;
  badgeColor?: string;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="glass-card rounded-2xl overflow-hidden border border-white/10">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-5 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center text-pink-400">
            {icon}
          </div>
          <div className="text-left">
            <h3 className="font-bold text-white text-lg">{title}</h3>
          </div>
          {badgeText && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badgeColor}`}>
              {badgeText}
            </span>
          )}
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-5 h-5 text-slate-400" />
        </motion.div>
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 border-t border-white/5 pt-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RarityCard({ data, index }: { data: typeof RARITY_DATA[0]; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05 }}
      className={`glass-card rounded-xl p-4 ${data.borderColor} ${data.special ? 'ring-1 ring-cyan-400/30' : ''}`}
    >
      <div className={`${data.bgColor} rounded-lg p-3 mb-3`}>
        <div className="flex items-center justify-between">
          <span className="text-2xl">{data.emoji}</span>
          <span className={`font-mono font-bold text-lg ${data.color}`}>{data.rate}</span>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className={`font-bold ${data.color}`}>{data.name}</span>
          <span className="text-xs text-slate-500">1 in {data.oneInX}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Items in Pool</span>
          <span className="text-slate-300">{data.items}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Dupe Gold</span>
          <span className="text-yellow-400">{data.dupeGold} 🪙</span>
        </div>
        <div className="pt-2 border-t border-white/5">
          <p className="text-xs text-slate-400 line-clamp-1">
            {data.examples.join(", ")}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ============== MAIN COMPONENT ==============

export default function GachaSystemSection() {
  return (
    <section id="gacha-system" className="py-32 px-4 sm:px-6 relative overflow-hidden">
      <div className="section-divider mb-32" />
      
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-pink-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-yellow-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="text-pink-400 text-sm font-semibold uppercase tracking-widest">Cosmetic Gacha</span>
          <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6">
            🎰 <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-yellow-400 to-cyan-400">Slot Machine System</span>
          </h2>
          <p className="text-slate-400 text-lg max-w-3xl mx-auto mb-6">
            Spin slots to earn exclusive cosmetics with <span className="text-yellow-400 font-semibold">Pebbles</span>. 
            Every item has rarity, quality, and special variants. Build your collection. Trade on the open market.
          </p>
          
          {/* Quick Stats */}
          <div className="flex flex-wrap justify-center gap-3">
            <span className="px-4 py-2 rounded-full bg-pink-500/10 border border-pink-500/30 text-pink-400 text-sm font-medium">
              🎰 {ECONOMICS_DATA.rollPriceSol} per Spin
            </span>
            <span className="px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-sm font-medium">
              267 Unique Cosmetics
            </span>
            <span className="px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-sm font-medium">
              ✨ 7 Rarity Tiers
            </span>
            <span className="px-4 py-2 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-sm font-medium">
              🏆 Provably Fair
            </span>
          </div>
        </motion.div>

        {/* Key Info Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid md:grid-cols-3 gap-4 mb-12"
        >
          {/* Roll Cost */}
          <div className="glass-card rounded-2xl p-6 border border-pink-500/20 bg-gradient-to-br from-pink-500/5 to-purple-500/5">
            <div className="text-4xl mb-3">🪨</div>
            <h3 className="text-xl font-bold text-white mb-2">Roll Cost</h3>
            <div className="text-3xl font-bold text-pink-400 mb-2">25 Pebbles</div>
            <p className="text-slate-400 text-sm">≈ 0.025 SOL per spin</p>
            <p className="text-xs text-slate-500 mt-2">1,000 Pebbles = 1 SOL</p>
          </div>
          
          {/* Guaranteed Win */}
          <div className="glass-card rounded-2xl p-6 border border-green-500/20 bg-gradient-to-br from-green-500/5 to-cyan-500/5">
            <div className="text-4xl mb-3">🎁</div>
            <h3 className="text-xl font-bold text-white mb-2">Always Win</h3>
            <div className="text-3xl font-bold text-green-400 mb-2">100%</div>
            <p className="text-slate-400 text-sm">Every spin wins a cosmetic</p>
            <p className="text-xs text-slate-500 mt-2">Duplicates convert to gold</p>
          </div>
          
          {/* Pity System */}
          <div className="glass-card rounded-2xl p-6 border border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-orange-500/5">
            <div className="text-4xl mb-3">🛡️</div>
            <h3 className="text-xl font-bold text-white mb-2">Pity Protection</h3>
            <div className="text-3xl font-bold text-yellow-400 mb-2">Soft + Hard</div>
            <p className="text-slate-400 text-sm">Guaranteed rare drops</p>
            <p className="text-xs text-slate-500 mt-2">40/100/400 roll thresholds</p>
          </div>
        </motion.div>

        {/* Collapsible Sections */}
        <div className="space-y-4">
          {/* Drop Rates Section */}
          <CollapsibleSection
            title="Drop Rates by Rarity"
            icon={<Gem className="w-5 h-5" />}
            defaultOpen={true}
            badgeText="7 Tiers"
          >
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
              {RARITY_DATA.map((rarity, i) => (
                <RarityCard key={rarity.name} data={rarity} index={i} />
              ))}
            </div>
            
            {/* Drop Rate Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Rarity</th>
                    <th className="text-center py-3 px-4 text-slate-400 font-medium">Drop Rate</th>
                    <th className="text-center py-3 px-4 text-slate-400 font-medium">1 in X</th>
                    <th className="text-center py-3 px-4 text-slate-400 font-medium">Avg Cost to Get</th>
                    <th className="text-center py-3 px-4 text-slate-400 font-medium">Dupe Gold</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {RARITY_DATA.map((r) => (
                    <tr key={r.name} className={r.special ? "bg-cyan-500/5" : ""}>
                      <td className="py-3 px-4">
                        <span className={`font-semibold ${r.color}`}>{r.emoji} {r.name}</span>
                      </td>
                      <td className={`py-3 px-4 text-center font-mono ${r.color}`}>{r.rate}</td>
                      <td className="py-3 px-4 text-center font-mono text-slate-300">{r.oneInX}</td>
                      <td className="py-3 px-4 text-center font-mono text-slate-300">
                        {(parseFloat(r.oneInX.replace(",", "")) * 0.025).toFixed(2)} SOL
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-yellow-400">{r.dupeGold} 🪙</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CollapsibleSection>

          {/* Quality & Variants */}
          <CollapsibleSection
            title="Quality Modifiers & Special Variants"
            icon={<Sparkles className="w-5 h-5" />}
            badgeText="Value Boosters"
            badgeColor="bg-yellow-500/20 text-yellow-400"
          >
            <div className="grid md:grid-cols-2 gap-6">
              {/* Quality Modifiers */}
              <div>
                <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-400" />
                  Quality Modifiers
                </h4>
                <p className="text-slate-400 text-sm mb-4">
                  Each cosmetic rolls a quality modifier affecting visual appearance and trade value.
                </p>
                <div className="space-y-2">
                  {QUALITY_DATA.map((q) => (
                    <div key={q.name} className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5">
                      <div>
                        <span className={`font-semibold ${q.color}`}>{q.name}</span>
                        <p className="text-xs text-slate-500">{q.desc}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-300 text-sm">{q.chance}</span>
                        <p className={`text-xs ${q.multiplier.includes("1.5") ? "text-yellow-400" : q.multiplier.includes("1.25") ? "text-green-400" : "text-slate-500"}`}>
                          {q.multiplier} value
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Special Variants */}
              <div>
                <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  Special Variants
                </h4>
                
                {/* Holographic */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-500/10 to-pink-500/10 border border-cyan-500/30 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-400">
                      ✨ Holographic
                    </span>
                    <span className="text-cyan-400 font-mono">8% chance</span>
                  </div>
                  <p className="text-slate-400 text-sm">
                    Prismatic rainbow shimmer effect. Massive value multiplier. 
                    Rare+ items only. Highly collectible.
                  </p>
                </div>
                
                {/* First Edition */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-yellow-400">🥇 First Edition</span>
                    <span className="text-yellow-400 font-mono">Serial #1-3</span>
                  </div>
                  <p className="text-slate-400 text-sm">
                    The first 3 ever minted of any cosmetic get the "First Edition" tag.
                    Extremely rare. Major flex. Permanent badge.
                  </p>
                </div>
                
                {/* Serial Numbers */}
                <div className="p-4 rounded-xl bg-black/20 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-300">#️⃣ Serial Numbers</span>
                    <span className="text-slate-400 font-mono">Unique ID</span>
                  </div>
                  <p className="text-slate-400 text-sm">
                    Every item has a unique serial number. Low serials (#1-100) are highly valued.
                    Track rarity and provenance forever.
                  </p>
                </div>
              </div>
            </div>

            {/* Ultra Rare Combinations */}
            <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/30">
              <h4 className="font-bold text-purple-400 mb-3">💎 Ultra-Rare Combinations</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {ULTRA_RARE_COMBOS.map((combo) => (
                  <div key={combo.name} className="text-center p-3 rounded-lg bg-black/30">
                    <p className="text-xs text-slate-400 mb-1">{combo.name}</p>
                    <p className="font-mono text-purple-400 text-sm">{combo.chance}</p>
                    <p className="text-xs text-slate-500">~{combo.avgCost}</p>
                  </div>
                ))}
              </div>
            </div>
          </CollapsibleSection>

          {/* Pity System */}
          <CollapsibleSection
            title="Pity System & Bad Luck Protection"
            icon={<Trophy className="w-5 h-5" />}
            badgeText="Player Friendly"
            badgeColor="bg-green-500/20 text-green-400"
          >
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-slate-400 mb-4">
                  Our pity system guarantees you&apos;ll hit rare drops even with bad luck. 
                  Counters reset when you hit a qualifying drop.
                </p>
                <div className="space-y-3">
                  {PITY_DATA.map((pity) => (
                    <div key={pity.tier} className="p-4 rounded-xl bg-black/20 border border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-white">{pity.tier}</span>
                        <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm font-mono">
                          {pity.threshold} rolls
                        </span>
                      </div>
                      <p className="text-slate-400 text-sm">{pity.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-black/20 rounded-xl p-6 border border-white/10">
                <h4 className="font-bold text-white mb-4">📊 How Pity Works</h4>
                <div className="space-y-4 text-sm">
                  <div className="flex items-start gap-3">
                    <span className="text-green-400 font-bold">1.</span>
                    <p className="text-slate-400">Each roll increments your pity counters</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-green-400 font-bold">2.</span>
                    <p className="text-slate-400">At threshold, your NEXT roll is guaranteed that tier+</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-green-400 font-bold">3.</span>
                    <p className="text-slate-400">Counter resets when you hit the tier naturally OR via pity</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-green-400 font-bold">4.</span>
                    <p className="text-slate-400">Multiple counters can trigger - you get the HIGHEST tier</p>
                  </div>
                </div>
                
                <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <p className="text-yellow-400 text-sm">
                    💡 <strong>Pro Tip:</strong> Pity counters persist across sessions. Your progress is saved!
                  </p>
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* Cosmetics Inventory */}
          <CollapsibleSection
            title="Cosmetics Inventory"
            icon={<Gift className="w-5 h-5" />}
            badgeText="267 Items"
          >
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {CATEGORY_DATA.map((cat) => (
                <div key={cat.name} className="glass-card rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{cat.icon}</span>
                    <div>
                      <h4 className="font-bold text-white">{cat.name}</h4>
                      <p className="text-xs text-slate-500">
                        {cat.gacha} gacha • {cat.promo} promo
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {cat.examples.map((ex) => (
                      <span key={ex} className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-xs text-slate-400">
                        {ex}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Distribution Chart */}
            <div className="bg-black/20 rounded-xl p-6 border border-white/10">
              <h4 className="font-bold text-white mb-4">Pool Distribution by Rarity</h4>
              <div className="space-y-3">
                {RARITY_DATA.map((r) => {
                  const percent = (r.items / 267) * 100;
                  return (
                    <div key={r.name} className="flex items-center gap-4">
                      <span className={`w-20 font-medium ${r.color}`}>{r.name}</span>
                      <div className="flex-1 h-6 bg-black/30 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${percent}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 1, delay: 0.1 }}
                          className={`h-full ${r.bgColor} border-r-2 ${r.borderColor}`}
                        />
                      </div>
                      <span className="w-12 text-right text-slate-400 text-sm">{r.items}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CollapsibleSection>

          {/* Pebbles Economy */}
          <CollapsibleSection
            title="Pebbles Currency System"
            icon={<Crown className="w-5 h-5" />}
            badgeText="Premium"
            badgeColor="bg-purple-500/20 text-purple-400"
          >
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-bold text-white mb-4">🪨 What are Pebbles?</h4>
                <p className="text-slate-400 mb-4">
                  Pebbles are our premium in-game currency for gacha rolls. Deposit SOL to get Pebbles, 
                  spin slots instantly without wallet popups, and withdraw anytime.
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/10">
                    <span className="text-slate-400">Exchange Rate</span>
                    <span className="font-mono text-purple-400">1 SOL = 1,000 🪨</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/10">
                    <span className="text-slate-400">Roll Cost</span>
                    <span className="font-mono text-pink-400">25 🪨 per spin</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/10">
                    <span className="text-slate-400">Min Deposit</span>
                    <span className="font-mono text-slate-300">0.1 SOL (100 🪨)</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/10">
                    <span className="text-slate-400">Withdrawal Fee</span>
                    <span className="font-mono text-yellow-400">5% rake</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-bold text-white mb-4">💰 Revenue Model</h4>
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-green-400">Gacha Revenue</span>
                      <span className="text-green-400 font-mono">100%</span>
                    </div>
                    <p className="text-slate-400 text-sm">
                      All Pebbles spent on gacha = permanent sink. SOL stays in platform.
                    </p>
                  </div>
                  
                  <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-yellow-400">Withdrawal Rake</span>
                      <span className="text-yellow-400 font-mono">5%</span>
                    </div>
                    <p className="text-slate-400 text-sm">
                      Small fee on withdrawals funds development and buybacks.
                    </p>
                  </div>
                  
                  <div className="p-4 rounded-xl bg-black/20 border border-white/10">
                    <p className="text-slate-400 text-sm">
                      <strong className="text-white">Example:</strong> Deposit 1 SOL → Get 1,000 🪨 → 
                      Spin 40 times (1,000 🪨) → Keep cosmetics forever OR withdraw remaining 🪨 (5% fee)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* Duplicates & Trading */}
          <CollapsibleSection
            title="Duplicates & Future Trading"
            icon={<Gift className="w-5 h-5" />}
            badgeText="Trading Soon"
            badgeColor="bg-orange-500/20 text-orange-400"
          >
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-bold text-white mb-4">🔄 Duplicate Handling</h4>
                <p className="text-slate-400 mb-4">
                  Already own a cosmetic? Duplicates automatically convert to in-game gold based on rarity.
                </p>
                <div className="space-y-2">
                  {RARITY_DATA.map((r) => (
                    <div key={r.name} className="flex items-center justify-between p-2 rounded-lg bg-black/20">
                      <span className={r.color}>{r.emoji} {r.name}</span>
                      <span className="font-mono text-yellow-400">{r.dupeGold} 🪙</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-bold text-white mb-4">🔮 Future: Open Market Trading</h4>
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30">
                    <p className="text-slate-400 text-sm mb-3">
                      Cosmetics will be tradeable on the open market. Supply & demand determines price.
                    </p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2 text-slate-300">
                        <ChevronRight className="w-4 h-4 text-purple-400" />
                        First Edition items = Major premium
                      </li>
                      <li className="flex items-center gap-2 text-slate-300">
                        <ChevronRight className="w-4 h-4 text-purple-400" />
                        Low serial numbers = Collector value
                      </li>
                      <li className="flex items-center gap-2 text-slate-300">
                        <ChevronRight className="w-4 h-4 text-purple-400" />
                        Flawless Holo = Maximum flex
                      </li>
                      <li className="flex items-center gap-2 text-slate-300">
                        <ChevronRight className="w-4 h-4 text-purple-400" />
                        Divine items = Ultra rare, high demand
                      </li>
                    </ul>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                    <p className="text-yellow-400 text-sm">
                      💡 <strong>Think CS:GO knives:</strong> Scarcity drives value. 
                      Divine Flawless Holo items will be the rarest in existence.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleSection>
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 text-center"
        >
          <div className="glass-card rounded-2xl p-8 border border-pink-500/20 bg-gradient-to-br from-pink-500/5 to-yellow-500/5 max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-white mb-4">Ready to Spin?</h3>
            <p className="text-slate-400 mb-6">
              Visit the Casino room in-game, buy Pebbles, and start building your collection. 
              Hunt for that Divine Flawless Holo. 🎰✨
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <a
                href="https://waddle.bet"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-yellow-500 text-white font-bold hover:opacity-90 transition-all"
              >
                Play Now →
              </a>
              <span className="px-6 py-3 rounded-xl bg-white/10 border border-white/20 text-slate-300 font-medium">
                🎰 25 Pebbles per Spin
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

