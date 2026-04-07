"use client";

import { Receipt } from "lucide-react";
import { motion } from "framer-motion";
import { useWhitepaperLanguage } from "../i18n/LanguageContext";

/**
 * 企鹅俱乐部 tax-token breakdown (four.meme / BSC) — normal page section, not a top banner.
 */
export function FourMemeFeeDisclosure() {
  const { t } = useWhitepaperLanguage();

  const bullets = [
    t("tokenFee.bulletRecipient"),
    t("tokenFee.bulletDividend"),
    t("tokenFee.bulletLiq"),
    t("tokenFee.bulletBurn"),
  ];

  return (
    <section id="token-fees" className="py-24 px-4 sm:px-6 relative overflow-hidden scroll-mt-24">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-5xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <span className="inline-flex items-center justify-center gap-2 text-amber-400 text-sm font-semibold uppercase tracking-widest">
            <Receipt className="w-4 h-4 opacity-90" aria-hidden />
            {t("tokenFee.kicker")}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mt-4 mb-4 text-white">{t("tokenFee.title")}</h2>
          <p className="text-slate-400 text-base md:text-lg max-w-3xl mx-auto leading-relaxed">{t("tokenFee.intro")}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.05 }}
          className="glass-card rounded-2xl p-6 sm:p-8 border border-amber-500/25 bg-gradient-to-br from-amber-950/20 via-slate-900/60 to-slate-900/80"
        >
          <ul className="grid gap-3 sm:grid-cols-2 text-sm text-slate-300 leading-relaxed list-none">
            {bullets.map((line, i) => (
              <li key={i} className="flex gap-3">
                <span className="text-amber-400 shrink-0 mt-0.5 font-bold" aria-hidden>
                  •
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mt-6 pt-6 border-t border-white/10">
            {t("tokenFee.footer")}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
