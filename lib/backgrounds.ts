export type Background = {
    kind: 'none' | 'preset' | 'upload';
    preset: string;
    image: string;
    fit: 'cover' | 'contain' | 'tile';
    position: string;
    tileSize: number;
    opacity: number;
    blur: number;
    overlayColor: string;
    overlayOpacity: number;
};
const svg = (body: string) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320">${body}</svg>`)}")`;
export const BACKGROUND_PRESETS = [
    { id: 'dots', name: 'Quiet dots', size: 32, css: 'radial-gradient(circle, #7f9570 1.6px, transparent 1.8px)' },
    { id: 'grid', name: 'Graph paper', size: 48, css: 'linear-gradient(#92a38355 1px,transparent 1px),linear-gradient(90deg,#92a38355 1px,transparent 1px)' },
    { id: 'waves', name: 'Soft waves', size: 320, css: svg('<rect width="320" height="320" fill="#e8ede5"/><g fill="none" stroke="#9eb3a0" stroke-width="2"><path d="M-80 80Q0 0 80 80T240 80T400 80M-80 110Q0 30 80 110T240 110T400 110M-80 140Q0 60 80 140T240 140T400 140M-80 170Q0 90 80 170T240 170T400 170M-80 200Q0 120 80 200T240 200T400 200M-80 230Q0 150 80 230T240 230T400 230"/></g>') },
    { id: 'botanical', name: 'Botanical', size: 320, css: svg('<rect width="320" height="320" fill="#edf0e4"/><g fill="none" stroke="#7b956d" stroke-width="2"><path d="M30 320Q100 130 270 0M105 200Q30 100 75 55Q155 85 145 145M165 115Q155 35 215 20M165 115Q250 135 278 75M75 255Q170 280 220 215"/><path d="M45 315Q10 220 40 185M145 155Q225 180 265 140"/></g>') },
    { id: 'sunrise', name: 'Golden hour', size: 320, css: 'radial-gradient(ellipse at 25% 90%,#e9bca0 0%,transparent 60%),radial-gradient(ellipse at 80% 10%,#f4df9c 0%,#e4e8d7 75%)' },
    { id: 'aurora', name: 'Blue hour', size: 320, css: 'radial-gradient(ellipse at 10% 15%,#a9cdd3 0%,transparent 60%),radial-gradient(ellipse at 90% 80%,#d4c1e5 0%,#e5eaf3 75%)' },
];
export function defaultBackground(): Background { return { kind: 'none', preset: 'dots', image: '', fit: 'cover', position: 'center', tileSize: 240, opacity: 35, blur: 0, overlayColor: '#ffffff', overlayOpacity: 0 }; }
const clamp = (value: unknown, min: number, max: number, fallback: number) => typeof value === 'number' && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
export function normalizeBackground(input: unknown): Background {
    const base = defaultBackground();
    if (!input || typeof input !== 'object')
        return base;
    const value = input as Record<string, unknown>;
    return { ...base, kind: ['none', 'preset', 'upload'].includes(String(value.kind)) ? value.kind as Background['kind'] : 'none', preset: BACKGROUND_PRESETS.some(p => p.id === value.preset) ? String(value.preset) : 'dots', image: typeof value.image === 'string' ? value.image.slice(0, 2200000) : '', fit: ['cover', 'contain', 'tile'].includes(String(value.fit)) ? value.fit as Background['fit'] : 'cover', position: ['center', 'top', 'bottom', 'left', 'right', 'top left', 'top right', 'bottom left', 'bottom right'].includes(String(value.position)) ? String(value.position) : 'center', tileSize: clamp(value.tileSize, 32, 800, 240), opacity: clamp(value.opacity, 0, 100, 35), blur: clamp(value.blur, 0, 20, 0), overlayColor: typeof value.overlayColor === 'string' && /^#[a-f\d]{6}$/i.test(value.overlayColor) ? value.overlayColor : '#ffffff', overlayOpacity: clamp(value.overlayOpacity, 0, 100, 0) };
}
