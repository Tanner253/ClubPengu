"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LOCALE,
  getWhitepaperMessage,
  type WhitepaperLocale,
} from "./translations";

const STORAGE_KEY = "whitepaper_locale";

type LanguageContextValue = {
  locale: WhitepaperLocale;
  setLocale: (locale: WhitepaperLocale) => void;
  t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readStoredLocale(): WhitepaperLocale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "zh-TW" || raw === "en") return raw;
  } catch {
    /* ignore */
  }
  return DEFAULT_LOCALE;
}

export function WhitepaperLanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<WhitepaperLocale>(DEFAULT_LOCALE);

  useEffect(() => {
    setLocaleState(readStoredLocale());
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale === "zh-TW" ? "zh-Hant" : "en";
  }, [locale]);

  const setLocale = useCallback((next: WhitepaperLocale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback(
    (key: string) => getWhitepaperMessage(locale, key),
    [locale]
  );

  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t]
  );

  return (
    <LanguageContext.Provider value={value}>
      <div
        className="min-h-screen"
        style={
          locale === "zh-TW"
            ? { fontFamily: "var(--font-noto-tc), var(--font-sans), system-ui, sans-serif" }
            : undefined
        }
      >
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

export function useWhitepaperLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useWhitepaperLanguage must be used within WhitepaperLanguageProvider");
  }
  return ctx;
}

/** Safe hook when provider may be absent (e.g. tests) — falls back to English. */
export function useWhitepaperT(): (key: string) => string {
  const ctx = useContext(LanguageContext);
  return ctx?.t ?? ((key: string) => getWhitepaperMessage(DEFAULT_LOCALE, key));
}
