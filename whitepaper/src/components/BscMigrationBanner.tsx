"use client";

import { useWhitepaperLanguage } from "../i18n/LanguageContext";

/** Announcement strip only — language and full roadmap live in the nav and Changelog. */
export function BscMigrationBanner() {
  const { t } = useWhitepaperLanguage();

  return (
    <div className="relative z-40 mt-[4.75rem] border-b border-amber-500/30 bg-gradient-to-r from-amber-950/80 via-slate-900/95 to-amber-950/80 backdrop-blur-md sm:mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <div className="flex items-center gap-2 shrink-0">
          <img src="/binance-icon.svg" alt="" className="h-7 w-7 object-contain" aria-hidden />
          <span className="text-amber-300 font-bold text-xs sm:text-sm uppercase tracking-wide">
            {t("bsc.banner.title")}
          </span>
        </div>
        <p className="text-slate-300 text-xs sm:text-sm leading-snug min-w-0">{t("bsc.banner.body")}</p>
      </div>
    </div>
  );
}
