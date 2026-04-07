"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { motion } from "framer-motion";
import { useWhitepaperLanguage } from "../i18n/LanguageContext";

type Props = {
  /** Original $CPW3 SPL mint */
  mint: string;
};

export function SolanaHistoryChart({ mint }: Props) {
  const { t } = useWhitepaperLanguage();
  const [copied, setCopied] = useState(false);

  const copyMint = async () => {
    try {
      await navigator.clipboard.writeText(mint);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <section
      id="cpw3-track-record"
      className="py-24 px-4 sm:px-6 relative overflow-hidden scroll-mt-24"
      aria-labelledby="cpw3-track-heading"
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[380px] bg-cyan-500/6 rounded-full blur-3xl" />
      </div>

      <div className="max-w-3xl mx-auto relative text-center">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <p className="text-cyan-400 text-sm font-semibold uppercase tracking-widest">{t("chart.kicker")}</p>
          <h2 id="cpw3-track-heading" className="text-3xl md:text-4xl font-bold mt-4 mb-3 text-white">
            {t("chart.title")}
          </h2>
          <p className="text-slate-400 text-base md:text-lg leading-relaxed mb-8">{t("chart.sub")}</p>

          <div className="glass-card rounded-2xl p-5 sm:p-6 border border-cyan-500/25 text-left">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">{t("chart.mintLabel")}</p>
            <div className="flex items-center gap-2 bg-black/35 rounded-lg px-3 py-2.5 border border-cyan-500/20">
              <code className="text-xs sm:text-sm text-cyan-400 font-mono break-all flex-1">{mint}</code>
              <button
                type="button"
                onClick={copyMint}
                className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white shrink-0"
                title={t("chart.copyMint")}
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
