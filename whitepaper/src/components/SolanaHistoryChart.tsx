"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { motion } from "framer-motion";
import { useWhitepaperLanguage } from "../i18n/LanguageContext";

type Props = {
  /** Original $CPW3 SPL mint */
  mint: string;
  /** Nested under another section (e.g. Team); uses a div wrapper and subheading for document outline */
  embedded?: boolean;
};

export function SolanaHistoryChart({ mint, embedded = false }: Props) {
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

  const Root = embedded ? "div" : "section";
  const Heading = embedded ? "h3" : "h2";

  return (
    <Root
      id="cpw3-track-record"
      className={
        embedded
          ? "relative mb-16 scroll-mt-24"
          : "relative scroll-mt-24 overflow-hidden px-4 py-24 sm:px-6"
      }
      aria-labelledby="cpw3-track-heading"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[380px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/6 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-3xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <p className="text-sm font-semibold uppercase tracking-widest text-cyan-400">{t("chart.kicker")}</p>
          <Heading
            id="cpw3-track-heading"
            className={`mt-4 mb-3 font-bold text-white ${embedded ? "text-2xl md:text-3xl" : "text-3xl md:text-4xl"}`}
          >
            {t("chart.title")}
          </Heading>
          <p className="mb-8 text-base leading-relaxed text-slate-400 md:text-lg">{t("chart.sub")}</p>

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
    </Root>
  );
}
