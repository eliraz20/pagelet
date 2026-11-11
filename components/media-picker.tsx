import { useEffect, useMemo, useRef, useState } from 'react';
import { Upload as UploadIcon } from 'lucide-react';
import type { Project } from '@/lib/page-model';
import { isVideo } from '@/lib/photo-placement';
import { readMedia, mediaAccept } from '@/lib/read-media';
import { pageUploads, recentUploads, rememberUploads } from '@/lib/recent-uploads';
import type { Upload } from '@/lib/recent-uploads';

export function MediaPicker({ project, imagesOnly, limit, replace, choose }: {
    project: Project; imagesOnly: boolean; limit: number; replace: boolean; choose: (uploads: Upload[]) => void;
}) {
    const input = useRef<HTMLInputElement>(null);
    const active = useRef(false);
    const [recent, setRecent] = useState<Upload[]>([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const existing = useMemo(() => pageUploads(project, imagesOnly), [project, imagesOnly]);
    useEffect(() => {
        active.current = true;
        void recentUploads().then(items => { if (active.current) setRecent(items); });
        return () => { active.current = false; };
    }, []);

    function select(items: Upload[]) {
        rememberUploads(items);
        choose(items);
    }
    async function openFiles(files: File[]) {
        if (!files.length) return;
        if (files.length > limit) { setError('Choose up to ' + limit + ' files for this gallery.'); return; }
        setError(''); setBusy(true);
        try {
            const items = await Promise.all(files.map(async file => {
                if (imagesOnly && !['image/jpeg','image/png','image/webp'].includes(file.type)) throw Error('Choose JPEG, PNG, or WebP for a gallery.');
                return { name: file.name, src: await readMedia(file) };
            }));
            if (active.current) select(items);
        } catch (err) {
            if (active.current) setError(err instanceof Error ? err.message : 'Could not open that file.');
        } finally { if (active.current) setBusy(false); }
    }
    const recentSources = new Set(recent.map(item => item.src));
    const groups = [
        { label:'Recent uploads', items:recent },
        { label:'On this page', items:existing.filter(item => !recentSources.has(item.src)) }
    ];
    return <div className="media-picker">
      {replace && <p>Choose a new file to keep this placement and its settings.</p>}
      <button className="button primary" disabled={busy} onClick={()=>input.current?.click()}><UploadIcon size={15}/>{busy?'Opening media…':'Upload from device'}</button>
      <input ref={input} type="file" hidden multiple={limit>1} accept={imagesOnly?'image/jpeg,image/png,image/webp':mediaAccept} onChange={e=>{const files=Array.from(e.target.files || []);e.target.value='';void openFiles(files);}}/>
      {error && <p role="alert">{error}</p>}
      {!recent.length && !existing.length && <small>Your recent uploads will appear here for reuse in this browser.</small>}
      {groups.map(group=>{
          const items=group.items.filter(item=>!imagesOnly || !isVideo(item.src));
          if(!items.length) return null;
          return <section key={group.label}><h3>{group.label}</h3><div className="upload-tray">{items.map((item,i)=>
            <button key={i} disabled={busy} title={item.name} onClick={()=>select([item])}>
              {isVideo(item.src)?<video muted playsInline preload="metadata" src={item.src}/>:<img src={item.src} alt=""/>}
              <span>{item.name}</span>{isVideo(item.src) && <small>Video</small>}
            </button>)}</div></section>;
      })}
    </div>;
}

