export type GalleryImage = {
    id: string;
    src: string;
    alt: string;
    caption: string;
    preset: string;
};
export type StickyContact = {
    enabled: boolean;
    label: string;
    href: string;
    position: 'left' | 'right';
    visibility: 'always' | 'after-scroll';
    mobileOnly: boolean;
};
export const GALLERY_PRESETS = [{ id: 'arch', name: 'Arch study', color: '#e8dfbf' }, { id: 'coast', name: 'Coastal shapes', color: '#cbdde0' }, { id: 'garden', name: 'Garden notes', color: '#dce6d0' }];
export function defaultSticky(): StickyContact { return { enabled: false, label: 'Let’s talk', href: '#contact', position: 'right', visibility: 'always', mobileOnly: false }; }
export function normalizeSticky(input: unknown): StickyContact {
    const fallback = defaultSticky();
    if (!input || typeof input !== 'object')
        return fallback;
    const value = input as Record<string, unknown>;
    return { enabled: value.enabled === true, label: typeof value.label === 'string' ? value.label.slice(0, 80) : fallback.label, href: typeof value.href === 'string' ? value.href.slice(0, 2000) : fallback.href, position: value.position === 'left' ? 'left' : 'right', visibility: value.visibility === 'after-scroll' ? 'after-scroll' : 'always', mobileOnly: value.mobileOnly === true };
}
export function normalizeGallery(input: unknown): GalleryImage[] {
    if (!Array.isArray(input))
        return [];
    const seen = new Set<string>();
    return input.slice(0, 12).filter(item => item && typeof item === 'object').map((item, index) => {
        let id = typeof item.id === 'string' && /^[a-z\d-]{1,80}$/i.test(item.id) ? item.id : `image-${index}`;
        while (seen.has(id))
            id += '-copy';
        seen.add(id);
        return { id, src: typeof item.src === 'string' ? item.src.slice(0, 2200000) : '', alt: typeof item.alt === 'string' ? item.alt.slice(0, 500) : '', caption: typeof item.caption === 'string' ? item.caption.slice(0, 1000) : '', preset: GALLERY_PRESETS.some(p => p.id === item.preset) ? item.preset : '' };
    });
}
