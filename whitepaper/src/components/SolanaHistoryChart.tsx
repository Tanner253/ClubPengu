"use client";

import { ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { useWhitepaperLanguage } from "../i18n/LanguageContext";

type Props = {
  /** Original CPW3 SPL mint — Dexscreener chart shows full history including prior ATH. */
  mint: string;
};

export function SolanaHistoryChart({ mint }: Props) {
  const { t } = useWhitepaperLanguage();
  const src = `https://dexscreener.com/solana/${mint}?embed=1&theme=dark&chartStyle=1&chartType=mc&interval=60`;
  const dexUrl = `https://dexscreener.com/solana/${mint}`;

  return (
    <section
      id="cpw3-chart"
      className="py-24 px-4 sm:px-6 relative overflow-hidden scroll-mt-24"
      aria-labelledby="cpw3-chart-heading"
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-cyan-500/6 rounded-full blur-3xl" />
      </div>

      <div className="max-w-5xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10 text-center sm:text-left"
        >
          <div>
            <p className="text-cyan-400 text-sm font-semibold uppercase tracking-widest">{t("chart.kicker")}</p>
            <h2 id="cpw3-chart-heading" className="text-3xl md:text-4xl font-bold mt-4 mb-4 text-white">
              {t("chart.title")}
            </h2>
            <p className="text-slate-400 text-base md:text-lg max-w-2xl mx-auto sm:mx-0 leading-relaxed">{t("chart.sub")}</p>
          </div>
          <a
            href={dexUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 text-sm text-cyan-400 hover:text-cyan-300 shrink-0 py-2"
          >
            {t("chart.openDex")}
            <ExternalLink className="w-4 h-4" />
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-card rounded-2xl overflow-hidden border border-cyan-500/25"
        >
          <div className="relative w-full h-[300px] sm:h-[360px] lg:h-[400px] bg-black/40">
            <iframe
              title={t("chart.iframeTitle")}
              src={src}
              className="absolute inset-0 w-full h-full border-0"
              allow="clipboard-write"
            />
          </div>
        </motion.div>
        <code className="mt-3 block text-xs text-slate-500 font-mono truncate text-center sm:text-left" title={mint}>
          {mint}
        </code>
      </div>
    </section>
  );
}
