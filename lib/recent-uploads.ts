import { database } from './draft-storage.ts';
import { currentPhoto, isVideo, mediaSource } from './photo-placement.ts';
import type { Project } from './page-model.ts';

export type Upload = { name: string; src: string };
const KEY = 'recent-uploads';
const LIMIT = 8;
let session: Upload[] = [];
let pending = Promise.resolve();

export function mergeUploads(newest: Upload[], older: Upload[]): Upload[] {
    const result: Upload[] = [];
    const seen = new Set<string>();
    let size = 0;
    for (const item of [...newest, ...older]) {
        if (!item || typeof item.name !== 'string' || seen.has(item.src) || !mediaSource(item.src)) continue;
        if (size + item.src.length > 32 * 1024 * 1024) continue;
        seen.add(item.src);
        result.push({ name: item.name.slice(0, 200), src: item.src });
        size += item.src.length;
        if (result.length === LIMIT) break;
    }
    return result;
}

export function pageUploads(project: Project, imagesOnly = false): Upload[] {
    const entries: Upload[] = [];
    for (const section of project.sections) {
        for (const role of ['hero','front','background','button'] as const) {
            const item = currentPhoto(section, role);
            if (item) entries.push({ name: item.alt || (section.title || section.type) + ' · ' + role, src: item.src });
        }
        for (const item of section.gallery) if (item.src) entries.push({ name: item.alt || item.caption || 'Gallery image', src: item.src });
    }
    return mergeUploads(imagesOnly ? entries.filter(item => !isVideo(item.src)) : entries, []);
}

async function storedUploads(incoming: Upload[]): Promise<Upload[]> {
    const db = await database();
    return new Promise((resolve,reject) => {
        const tx = db.transaction('drafts', incoming.length ? 'readwrite' : 'readonly');
        const store = tx.objectStore('drafts');
        const read = store.get(KEY);
        let result: Upload[] = [];
        read.onsuccess = () => {
            result = mergeUploads(incoming, Array.isArray(read.result) ? read.result : []);
            if (incoming.length) store.put(result, KEY);
        };
        tx.oncomplete = () => resolve(result);
        tx.onabort = tx.onerror = () => reject(tx.error);
    });
}

export function rememberUploads(incoming: Upload[]) {
    session = mergeUploads(incoming, session);
    pending = pending.then(() => storedUploads(incoming)).then(() => {}).catch(() => {});
}

export async function recentUploads() {
    await pending;
    try { return mergeUploads(session, await storedUploads([])); }
    catch { return session; }
}

