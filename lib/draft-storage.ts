const KEY = 'pagelet.project.v1';
const LARGE = '@indexed';
let connection: Promise<IDBDatabase> | undefined;
function database() {
    if (!connection) connection = new Promise<IDBDatabase>((resolve,reject) => {
        const req = indexedDB.open('pagelet-media-drafts',1);
        req.onupgradeneeded = () => req.result.createObjectStore('drafts');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    }).catch(err => { connection = undefined; throw err; });
    return connection;
}
export async function loadDraft(): Promise<string | null> {
    const local = localStorage.getItem(KEY);
    if (local !== LARGE) return local;
    const db = await database();
    return new Promise((resolve,reject) => {
        const req = db.transaction('drafts').objectStore('drafts').get(KEY);
        req.onsuccess = () => req.result ? resolve(req.result) : reject(new Error('Missing media draft'));
        req.onerror = () => reject(req.error);
    });
}
let queue = Promise.resolve();
export function saveDraft(text: string) {
    const save = async () => {
        if (text.length < 2000000) {
            try { localStorage.setItem(KEY,text); return; } catch { /* Try the larger media store. */ }
        }
        const db = await database();
        await new Promise<void>((resolve,reject) => {
            const tx = db.transaction('drafts','readwrite');
            tx.objectStore('drafts').put(text,KEY);
            tx.oncomplete = () => resolve();
            tx.onabort = tx.onerror = () => reject(tx.error);
        });
        localStorage.setItem(KEY,LARGE);
    };
    const next=queue.then(save);queue=next.catch(()=>{});return next;
}

