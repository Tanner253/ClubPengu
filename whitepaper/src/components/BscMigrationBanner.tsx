"use client";

import { ChevronRight } from "lucide-react";
import { useWhitepaperLanguage } from "../i18n/LanguageContext";
import { LanguageSwitcher } from "./LanguageSwitcher";

type Props = {
  onOpenRoadmap: () => void;
};

export function BscMigrationBanner({ onOpenRoadmap }: Props) {
  const { t } = useWhitepaperLanguage();

  return (
    <div className="relative z-40 mt-[4.75rem] border-b border-amber-500/30 bg-gradient-to-r from-amber-950/80 via-slate-900/95 to-amber-950/80 backdrop-blur-md sm:mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <img src="/binance-icon.svg" alt="" className="h-7 w-7 object-contain" aria-hidden />
            <span className="text-amber-300 font-bold text-xs sm:text-sm uppercase tracking-wide">
              {t("bsc.banner.title")}
            </span>
          </div>
          <p className="text-slate-300 text-xs sm:text-sm leading-snug">{t("bsc.banner.body")}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0 justify-end">
          <LanguageSwitcher />
          <button
            type="button"
            onClick={onOpenRoadmap}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs font-semibold hover:bg-amber-500/30 transition-colors"
          >
            {t("bsc.banner.cta")}
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
