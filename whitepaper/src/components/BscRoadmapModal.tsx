"use client";

import { useWhitepaperLanguage } from "../i18n/LanguageContext";
import { LanguageSwitcher } from "./LanguageSwitcher";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function BscRoadmapModal({ open, onClose }: Props) {
  const { t } = useWhitepaperLanguage();

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="whitepaper-bsc-roadmap-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg rounded-2xl border border-amber-500/40 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/40 p-6 shadow-2xl shadow-amber-900/20">
        <div className="flex items-start gap-3">
          <img
            src="/binance-icon.svg"
            alt=""
            width={48}
            height={48}
            className="h-12 w-12 shrink-0 object-contain"
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <h2
              id="whitepaper-bsc-roadmap-title"
              className="text-amber-300 font-black uppercase tracking-wide text-sm sm:text-base leading-tight"
            >
              {t("bsc.modal.title")}
            </h2>
            <div className="mt-3 max-h-[min(52vh,380px)] overflow-y-auto pr-1 text-white/90 text-sm leading-relaxed whitespace-pre-line [scrollbar-gutter:stable]">
              {t("bsc.modal.body")}
            </div>
          </div>
        </div>
        <div
          className="mt-5 pt-4 border-t border-white/10 flex justify-center"
          role="group"
          aria-label={t("lang.switchAria")}
        >
          <LanguageSwitcher className="justify-center gap-2" />
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full py-3 rounded-xl font-bold text-black bg-amber-400 hover:bg-amber-300 active:scale-[0.98] transition-all text-sm border-b-4 border-amber-700"
        >
          {t("bsc.modal.dismiss")}
        </button>
      </div>
    </div>
  );
}
