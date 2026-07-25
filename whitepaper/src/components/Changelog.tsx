"use client";

import React, { useState, type ReactNode } from "react";
import { useWhitepaperLanguage } from "../i18n/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronRight,
  Sparkles,
  Bug,
  Wrench,
  Zap,
  Smartphone,
  Server,
  Code,
  Shield,
  Cpu,
  Layers,
} from "lucide-react";
import { RobinhoodLogo } from "./RobinhoodLogo";

// Changelog entry types
type ChangeType = "feature" | "fix" | "improvement" | "content" | "mobile" | "backend" | "refactor" | "security" | "performance";

interface ChangelogEntry {
  type: ChangeType;
  text: string;
}

interface ChangelogVersion {
  version: string;
  date: string;
  title: string;
  description?: string;
  highlight?: boolean;
  /** Show Robinhood feather mark on this release card (multichain / $WADDLE milestones). */
  brand?: "robinhood";
  stats?: {
    filesChanged?: number;
    additions?: number;
    deletions?: number;
  };
  changes: ChangelogEntry[];
}

// Icon mapping for change types
const typeIcons: Record<ChangeType, ReactNode> = {
  feature: <Sparkles className="w-3.5 h-3.5" />,
  fix: <Bug className="w-3.5 h-3.5" />,
  improvement: <Wrench className="w-3.5 h-3.5" />,
  content: <Layers className="w-3.5 h-3.5" />,
  mobile: <Smartphone className="w-3.5 h-3.5" />,
  backend: <Server className="w-3.5 h-3.5" />,
  refactor: <Code className="w-3.5 h-3.5" />,
  security: <Shield className="w-3.5 h-3.5" />,
  performance: <Cpu className="w-3.5 h-3.5" />,
};

const typeColors: Record<ChangeType, string> = {
  feature: "text-green-400 bg-green-400/10 border-green-400/30",
  fix: "text-red-400 bg-red-400/10 border-red-400/30",
  improvement: "text-blue-400 bg-blue-400/10 border-blue-400/30",
  content: "text-purple-400 bg-purple-400/10 border-purple-400/30",
  mobile: "text-orange-400 bg-orange-400/10 border-orange-400/30",
  backend: "text-cyan-400 bg-cyan-400/10 border-cyan-400/30",
  refactor: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
  security: "text-pink-400 bg-pink-400/10 border-pink-400/30",
  performance: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
};

const typeLabels: Record<ChangeType, string> = {
  feature: "New",
  fix: "Fix",
  improvement: "Improved",
  content: "Content",
  mobile: "Mobile",
  backend: "Backend",
  refactor: "Refactor",
  security: "Security",
  performance: "Perf",
};

import CHANGELOG_DATA from "../../../waddlebet/src/data/changelogData.js";

// ==================== COMPONENTS ====================

function ChangeTag({ type }: { type: ChangeType }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${typeColors[type]}`}>
      {typeIcons[type]}
      {typeLabels[type]}
    </span>
  );
}

function StatsBar({ stats }: { stats: { filesChanged?: number; additions?: number; deletions?: number } }) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
      {stats.filesChanged && (
        <span className="text-slate-400">
          <span className="text-blue-400">{stats.filesChanged}</span> files
        </span>
      )}
      {stats.additions && (
        <span className="text-green-400">
          +{stats.additions.toLocaleString()}
        </span>
      )}
      {stats.deletions && (
        <span className="text-red-400">
          -{stats.deletions.toLocaleString()}
        </span>
      )}
    </div>
  );
}

function VersionCard({ version, isExpanded, onToggle }: { version: ChangelogVersion; isExpanded: boolean; onToggle: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`glass-card rounded-xl overflow-hidden ${
        version.brand === "robinhood"
          ? "border-violet-500/35 ring-1 ring-violet-500/25"
          : version.highlight
            ? "border-cyan-500/30 ring-1 ring-cyan-500/20"
            : ""
      }`}
    >
      {/* Header - Always visible */}
      <button
        onClick={onToggle}
        className="w-full p-4 sm:p-6 flex items-start gap-4 text-left hover:bg-white/5 transition-colors"
      >
        {/* Expand/collapse icon */}
        <div className="mt-1 text-slate-500">
          {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </div>

        {version.brand === "robinhood" && (
          <div className="shrink-0 mt-0.5 hidden sm:block">
            <RobinhoodLogo size={44} />
          </div>
        )}
        
        {/* Version info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-cyan-400 font-mono text-sm font-bold">v{version.version}</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-500 text-sm">{version.date}</span>
            {version.brand === "robinhood" && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-violet-500/15 border border-violet-400/35 text-violet-200 text-xs font-medium">
                <RobinhoodLogo size={16} className="sm:hidden" />
                <span>Robinhood · $WADDLE</span>
              </span>
            )}
            {version.highlight && (
              <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 text-yellow-400 text-xs font-medium">
                ⭐ Major Release
              </span>
            )}
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-white mb-1 flex flex-wrap items-center gap-2">
            {version.brand === "robinhood" && (
              <RobinhoodLogo size={28} className="sm:hidden shrink-0" />
            )}
            <span>{version.title}</span>
          </h3>
          {version.description && (
            <p className="text-slate-400 text-sm mb-2">{version.description}</p>
          )}
          
          {/* Stats bar */}
          {version.stats && <StatsBar stats={version.stats} />}
          
          {/* Summary tags when collapsed */}
          {!isExpanded && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {Array.from(new Set(version.changes.map(c => c.type))).slice(0, 5).map((type) => (
                <ChangeTag key={type} type={type} />
              ))}
              {version.changes.length > 5 && (
                <span className="text-slate-500 text-xs px-2 py-0.5">
                  +{version.changes.length - 5} more
                </span>
              )}
            </div>
          )}
        </div>
        
        {/* Change count badge */}
        <div className="shrink-0 text-right">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/5 text-slate-400 text-sm font-medium">
            {version.changes.length}
          </span>
        </div>
      </button>
      
      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 sm:px-6 pb-4 sm:pb-6 border-t border-white/5">
              <ul className="mt-4 space-y-2">
                {version.changes.map((change, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="flex items-start gap-3"
                  >
                    <div className="shrink-0 mt-0.5">
                      <ChangeTag type={change.type} />
                    </div>
                    <span className="text-slate-300 text-sm leading-relaxed">{change.text}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ==================== MAIN COMPONENT ====================

/** First git commit (`init`, 2025-12-09). Changelog date strings use ranges that parse incorrectly. */
const REPO_INCEPTION = new Date(2025, 11, 9);

function getShippingMonths(): number {
  const end = new Date();
  let months =
    (end.getFullYear() - REPO_INCEPTION.getFullYear()) * 12 +
    (end.getMonth() - REPO_INCEPTION.getMonth());
  if (end.getDate() < REPO_INCEPTION.getDate()) months -= 1;
  return Math.max(1, months);
}

function formatShippingHighlight(months: number, locale: string): string {
  if (locale === "zh") return `自 2025 年 12 月起連續交付 ${months} 個月以上。`;
  return `${months}+ months of shipping since Dec 2025.`;
}

export default function Changelog() {
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set([CHANGELOG_DATA[0]?.version]));
  const [expandAll, setExpandAll] = useState(false);

  const toggleVersion = (version: string) => {
    setExpandedVersions((prev) => {
      const next = new Set(prev);
      if (next.has(version)) {
        next.delete(version);
      } else {
        next.add(version);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    if (expandAll) {
      setExpandedVersions(new Set([CHANGELOG_DATA[0]?.version]));
    } else {
      setExpandedVersions(new Set(CHANGELOG_DATA.map((v) => v.version)));
    }
    setExpandAll(!expandAll);
  };

  // Calculate totals
  const totalChanges = CHANGELOG_DATA.reduce((acc, v) => acc + v.changes.length, 0);
  const totalVersions = CHANGELOG_DATA.length;
  const totalAdditions = CHANGELOG_DATA.reduce((acc, v) => acc + (v.stats?.additions || 0), 0);
  const totalDeletions = CHANGELOG_DATA.reduce((acc, v) => acc + (v.stats?.deletions || 0), 0);
  const totalFiles = CHANGELOG_DATA.reduce((acc, v) => acc + (v.stats?.filesChanged || 0), 0);

  const { t, locale } = useWhitepaperLanguage();
  const shippingHighlight = formatShippingHighlight(getShippingMonths(), locale);

  return (
    <section id="changelog" className="py-16 md:py-32 px-4 sm:px-6 relative">
      <div className="section-divider mb-16 md:mb-32" />
      
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="text-green-400 text-sm font-semibold uppercase tracking-widest">{t("changelog.kicker")}</span>
          <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6">
            <span className="text-green-400">{t("changelog.title")}</span>
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-4">
            {t("changelog.lead")}
            <span className="text-cyan-400 font-semibold"> {shippingHighlight}</span>
          </p>
          <p className="text-slate-500 text-sm max-w-xl mx-auto mb-8">{t("changelog.localeNote")}</p>
          
          {/* Impressive stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8 max-w-2xl mx-auto">
            <div className="glass-card rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-cyan-400">{totalVersions}</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider">{t("changelog.stat.releases")}</div>
            </div>
            <div className="glass-card rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-400">{totalChanges}</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider">{t("changelog.stat.changes")}</div>
            </div>
            <div className="glass-card rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-purple-400">{totalFiles.toLocaleString()}</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider">{t("changelog.stat.files")}</div>
            </div>
            <div className="glass-card rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-yellow-400">{Math.round(totalAdditions / 1000)}k+</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider">{t("changelog.stat.lines")}</div>
            </div>
          </div>
          
          {/* Legend and controls */}
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {(Object.keys(typeLabels) as ChangeType[]).map((type) => (
              <ChangeTag key={type} type={type} />
            ))}
          </div>
          
          <button
            onClick={handleExpandAll}
            className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-slate-300 text-sm"
          >
            {expandAll ? t("changelog.collapseAll") : t("changelog.expandAll")}
          </button>
        </motion.div>

        {/* Version cards */}
        <div className="space-y-4">
          {CHANGELOG_DATA.map((version) => (
            <VersionCard
              key={version.version}
              version={version}
              isExpanded={expandedVersions.has(version.version)}
              onToggle={() => toggleVersion(version.version)}
            />
          ))}
        </div>
        
        {/* Code reduction highlight */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 glass-card rounded-2xl p-6 border-yellow-500/20 bg-gradient-to-r from-yellow-500/5 to-orange-500/5"
        >
          <h3 className="font-bold text-yellow-400 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Refactoring Highlights
          </h3>
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            <div className="text-center p-3 rounded-lg bg-black/20">
              <div className="text-slate-400 mb-1">VoxelWorld.jsx</div>
              <div className="text-lg font-mono">
                <span className="text-red-400">9,500</span>
                <span className="text-slate-500"> → </span>
                <span className="text-green-400">4,188</span>
              </div>
              <div className="text-xs text-green-400">-56% lines</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-black/20">
              <div className="text-slate-400 mb-1">PropsFactory.js</div>
              <div className="text-lg font-mono">
                <span className="text-red-400">4,372</span>
                <span className="text-slate-500"> → </span>
                <span className="text-green-400">1,262</span>
              </div>
              <div className="text-xs text-green-400">-71% lines</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-black/20">
              <div className="text-slate-400 mb-1">New Systems</div>
              <div className="text-lg font-mono text-cyan-400">20+</div>
              <div className="text-xs text-cyan-400">Modular Files</div>
            </div>
          </div>
        </motion.div>
        
        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-8 text-center"
        >
          <p className="text-slate-500 text-sm mb-4">
            Open source and always cooking 🐧🔥
          </p>
          <a
            href="https://github.com/Tanner253/ClubPengu"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-slate-300"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            View on GitHub
          </a>
        </motion.div>
      </div>
    </section>
  );
}
