"use client";

import { Globe } from "lucide-react";
import { useWhitepaperLanguage } from "../i18n/LanguageContext";
import type { WhitepaperLocale } from "../i18n/translations";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, setLocale, t } = useWhitepaperLanguage();

  const cycle = () => {
    const order: WhitepaperLocale[] = ["en", "zh-TW"];
    const i = order.indexOf(locale);
    setLocale(order[(i + 1) % order.length]);
  };

  return (
    <div className={`flex items-center gap-1 ${className}`} role="group" aria-label={t("lang.switchAria")}>
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={`px-2 py-1 rounded-md text-xs font-semibold transition-colors ${
          locale === "en"
            ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
            : "text-slate-500 hover:text-slate-300"
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLocale("zh-TW")}
        className={`px-2 py-1 rounded-md text-xs font-semibold transition-colors ${
          locale === "zh-TW"
            ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
            : "text-slate-500 hover:text-slate-300"
        }`}
      >
        繁
      </button>
      <button
        type="button"
        onClick={cycle}
        className="p-1.5 rounded-md text-slate-500 hover:text-cyan-400 hover:bg-white/5"
        title={t("lang.switchAria")}
        aria-label={t("lang.switchAria")}
      >
        <Globe className="w-4 h-4" />
      </button>
    </div>
  );
}
