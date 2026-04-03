/**
 * Internationalization — composed from per-section modules in ./translations/
 */
import menu from './translations/menu.js';
import creator from './translations/creator.js';
import ui from './translations/ui.js';
import game from './translations/game.js';
import interact from './translations/interact.js';
import rooms from './translations/rooms.js';
import settings from './translations/settings.js';
import fishing from './translations/fishing.js';
import changelog from './translations/changelog.js';
import misc from './translations/misc.js';
import tokenomics from './translations/tokenomics.js';
import hud from './translations/hud.js';
import loading from './translations/loading.js';

/** ISO 3166-1 alpha-2 for flagcdn.com PNG flags (language picker icons) */
export const LANGUAGES = {
    en: { code: 'en', name: 'English', flag: '🇺🇸', nativeName: 'English', flagCode: 'us' },
    zh: { code: 'zh', name: 'Chinese', flag: '🇨🇳', nativeName: '中文', flagCode: 'cn' },
    es: { code: 'es', name: 'Spanish', flag: '🇪🇸', nativeName: 'Español', flagCode: 'es' },
    pt: { code: 'pt', name: 'Portuguese', flag: '🇧🇷', nativeName: 'Português', flagCode: 'br' },
    ko: { code: 'ko', name: 'Korean', flag: '🇰🇷', nativeName: '한국어', flagCode: 'kr' },
    ja: { code: 'ja', name: 'Japanese', flag: '🇯🇵', nativeName: '日本語', flagCode: 'jp' },
    fr: { code: 'fr', name: 'French', flag: '🇫🇷', nativeName: 'Français', flagCode: 'fr' },
    de: { code: 'de', name: 'German', flag: '🇩🇪', nativeName: 'Deutsch', flagCode: 'de' },
    ru: { code: 'ru', name: 'Russian', flag: '🇷🇺', nativeName: 'Русский', flagCode: 'ru' },
    ar: { code: 'ar', name: 'Arabic', flag: '🇸🇦', nativeName: 'العربية', flagCode: 'sa' },
};

export const translations = {
    ...menu,
    ...creator,
    ...ui,
    ...game,
    ...interact,
    ...rooms,
    ...settings,
    ...fishing,
    ...changelog,
    ...misc,
    ...tokenomics,
    ...hud,
    ...loading,
};

export const DEFAULT_LANGUAGE = 'en';

export function getTranslation(key, language = DEFAULT_LANGUAGE) {
    const entry = translations[key];
    if (!entry) {
        console.warn(`Translation missing for key: ${key}`);
        return key;
    }
    return entry[language] || entry[DEFAULT_LANGUAGE] || key;
}

export function getAvailableLanguages() {
    return Object.values(LANGUAGES);
}

export function getNextLanguage(currentLang) {
    const codes = Object.keys(LANGUAGES);
    const currentIndex = codes.indexOf(currentLang);
    const nextIndex = (currentIndex + 1) % codes.length;
    return codes[nextIndex];
}
