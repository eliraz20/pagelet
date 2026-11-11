import type { Project, Section } from './page-model.ts';

export type PhotoRole = 'front' | 'background' | 'button' | 'hero';
export type Target = { id: string; role: PhotoRole };
export type PhotoPosition = { x: number; y: number };
export type PlacedPhoto = PhotoPosition & { src: string; alt: string };
export type PhotoDraft = Target & PlacedPhoto & { origin?: Target };

export function percent(value: unknown) {
    return typeof value === 'number' && Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 50;
}

export const MAX_VIDEO_BYTES = 12 * 1024 * 1024;
export const isVideo = (src: string) => /^data:video\/(mp4|webm);base64,/i.test(src);
export function mediaSource(value: unknown): string {
    if (typeof value !== 'string') return '';
    const limit = isVideo(value) ? 4 * Math.ceil(MAX_VIDEO_BYTES / 3) + 32 : 2200000;
    return value.length <= limit && /^data:(?:image\/(?:png|jpeg|webp)|video\/(?:mp4|webm));base64,[a-z0-9+/]+=*$/i.test(value) ? value : '';
}

export function readPhoto(value: unknown): PlacedPhoto | null {
    if (!value || typeof value !== 'object') return null;
    const photo = value as Partial<PlacedPhoto>;
    if (typeof photo.src !== 'string' || !mediaSource(photo.src)) return null;
    return { src: photo.src, alt: typeof photo.alt === 'string' ? photo.alt.slice(0, 500) : '', x: percent(photo.x), y: percent(photo.y) };
}

export function supportsPhoto(section: Section, role: PhotoRole) {
    if (role === 'hero') return section.type === 'hero';
    if (role === 'button') return ['hero','cta','pricing'].includes(section.type) && !!section.buttonLabel;
    return role === 'background' || role === 'front';
}

export function currentPhoto(section: Section, role: PhotoRole): PlacedPhoto | null {
    if (role === 'front') return section.frontPhoto;
    if (role === 'button') return section.buttonPhoto;
    if (role === 'hero') return section.image ? { src: section.image, alt: section.items[0]?.text || '', x: section.imageX, y: section.imageY } : null;
    if (section.background.kind !== 'upload' || !section.background.image) return null;
    const [x,y] = section.background.position.split(' ').map(parseFloat);
    return { src: section.background.image, alt: '', x: Number.isFinite(x) ? x : section.background.position.includes('left') ? 0 : section.background.position.includes('right') ? 100 : 50,
        y: Number.isFinite(y) ? y : section.background.position.includes('top') ? 0 : section.background.position.includes('bottom') ? 100 : 50 };
}

export function clearPhoto(section: Section, role: PhotoRole): Section {
    if (role === 'background') return { ...section, background: { ...section.background, kind: 'none', image: '' } };
    if (role === 'hero') return { ...section, image: '' };
    return { ...section, [role === 'front' ? 'frontPhoto' : 'buttonPhoto']: null };
}

export function placePhoto(project: Project, draft: PhotoDraft): Project {
    const destination = project.sections.find(s => s.id === draft.id);
    const photo = readPhoto(draft);
    if (!destination || !photo || !supportsPhoto(destination, draft.role)) return project;
    const { origin } = draft;
    return { ...project, sections: project.sections.map(section => {
        if (origin?.id === section.id && (origin.id !== draft.id || origin.role !== draft.role))
            section = clearPhoto(section, origin.role);
        if (section.id !== draft.id) return section;
        switch (draft.role) {
            case 'background': return { ...section, background: { ...section.background, kind: 'upload', image: photo.src, fit: isVideo(photo.src) && section.background.fit === 'tile' ? 'cover' : section.background.fit, position: photo.x + '% ' + photo.y + '%' } };
            case 'button': return { ...section, buttonPhoto: photo };
            case 'front': return { ...section, frontPhoto: photo };
            case 'hero': return { ...section, image: photo.src, imageX: photo.x, imageY: photo.y, mobile: { ...section.mobile, imageX: photo.x, imageY: photo.y },
                items: [{ title: section.items[0]?.title || '', text: photo.alt }, ...section.items.slice(1)] };
        }
    }) };
}

