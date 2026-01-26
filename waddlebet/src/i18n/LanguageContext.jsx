/**
 * Language Context - Provides internationalization throughout the app
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { translations, LANGUAGES, DEFAULT_LANGUAGE, getNextLanguage } from './translations';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
    // Load saved language or use default
    const [language, setLanguageState] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('waddleBetLanguage');
            if (saved && LANGUAGES[saved]) {
                return saved;
            }
            // Try to detect browser language
            const browserLang = navigator.language?.split('-')[0];
            if (browserLang && LANGUAGES[browserLang]) {
                return browserLang;
            }
        }
        return DEFAULT_LANGUAGE;
    });

    // Save language preference
    const setLanguage = useCallback((lang) => {
        if (LANGUAGES[lang]) {
            setLanguageState(lang);
            localStorage.setItem('waddleBetLanguage', lang);
        }
    }, []);

    // Cycle through languages
    const cycleLanguage = useCallback(() => {
        const nextLang = getNextLanguage(language);
        setLanguage(nextLang);
        return nextLang;
    }, [language, setLanguage]);

    // Translation function
    const t = useCallback((key, fallback = null) => {
        const entry = translations[key];
        if (!entry) {
            if (fallback) return fallback;
            console.warn(`Translation missing: ${key}`);
            return key;
        }
        return entry[language] || entry[DEFAULT_LANGUAGE] || fallback || key;
    }, [language]);

    // Get current language info
    const currentLanguage = LANGUAGES[language] || LANGUAGES[DEFAULT_LANGUAGE];

    const value = {
        language,
        setLanguage,
        cycleLanguage,
        t,
        currentLanguage,
        availableLanguages: LANGUAGES,
    };

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
}

// Hook to use language context
export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}

// Simple hook for just translations (no need for full context)
export function useTranslation() {
    const { t, language } = useLanguage();
    return { t, language };
}

export default LanguageContext;

