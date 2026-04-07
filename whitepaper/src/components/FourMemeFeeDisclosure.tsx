"use client";

import { Receipt } from "lucide-react";
import { useWhitepaperLanguage } from "../i18n/LanguageContext";

/**
 * Early-page disclosure for 企鹅俱乐部 tax-token settings on four.meme (BSC).
 * Placed directly under the BSC migration banner.
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
    <div className="relative z-40 border-b border-cyan-500/25 bg-gradient-to-r from-slate-950/95 via-slate-900/95 to-slate-950/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-3.5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-5">
          <div className="flex items-center gap-2 shrink-0 text-cyan-400">
            <Receipt className="w-5 h-5 shrink-0 opacity-90" aria-hidden />
            <div>
              <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-cyan-500/90">
                {t("tokenFee.kicker")}
              </p>
              <h2 className="text-sm sm:text-base font-bold text-white leading-tight mt-0.5">
                {t("tokenFee.title")}
              </h2>
            </div>
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-xs sm:text-sm text-slate-400 leading-snug">{t("tokenFee.intro")}</p>
            <ul className="grid gap-1.5 sm:grid-cols-2 text-[11px] sm:text-xs text-slate-300 leading-relaxed list-none">
              {bullets.map((line, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-cyan-500 shrink-0 mt-0.5" aria-hidden>
                    •
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <p className="text-[10px] sm:text-xs text-slate-500 leading-snug pt-1 border-t border-white/5">
              {t("tokenFee.footer")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
