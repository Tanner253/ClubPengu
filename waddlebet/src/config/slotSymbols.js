/**
 * Meme slot reel symbols — drop PNG/WebP files into public/slot-symbols/
 * Files are served at /slot-symbols/<filename>
 */

export const LOBBY_MEME_SYMBOLS = [
    { id: 'trollface', file: 'trollface.png' },
    { id: 'pepe', file: 'pepe.png' },
    { id: 'wojak', file: 'wojak.png' },
    { id: 'doge', file: 'doge.png' },
    { id: 'chad', file: 'chad.png' },
    { id: 'stonks', file: 'stonks.png' },
    { id: 'gigachad', file: 'gigachad.png' },
    { id: 'crab', file: 'crab.png' },
];

const imageCache = new Map();
let sharedLoadPromise = null;

function loadImage(src) {
    if (imageCache.has(src)) {
        return Promise.resolve(imageCache.get(src));
    }

    return new Promise(resolve => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            imageCache.set(src, img);
            resolve(img);
        };
        img.onerror = () => {
            imageCache.set(src, null);
            resolve(null);
        };
        img.src = src;
    });
}

/**
 * Load meme symbol images once (shared across all lobby slot machines)
 * @param {Array<{id: string, file: string}>} symbols
 * @returns {Promise<Array<{id: string, image: HTMLImageElement|null}>>}
 */
export function loadSlotSymbolImages(symbols = LOBBY_MEME_SYMBOLS) {
    if (sharedLoadPromise) return sharedLoadPromise;

    sharedLoadPromise = Promise.all(
        symbols.map(async entry => ({
            id: entry.id,
            image: await loadImage(`/slot-symbols/${entry.file}`)
        }))
    );

    return sharedLoadPromise;
}

export function clearSlotSymbolCache() {
    imageCache.clear();
    sharedLoadPromise = null;
}
