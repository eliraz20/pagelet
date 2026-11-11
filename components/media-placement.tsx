import { useEffect, useMemo, useRef, useState } from 'react';
import type { Project, Section } from '@/lib/page-model';
import { SECTION_META } from '@/lib/page-model';
import { renderPage, sectionHtml } from '@/lib/render-page';
import { clearPhoto, currentPhoto, isVideo, placePhoto, supportsPhoto } from '@/lib/photo-placement';
import type { PhotoDraft, PhotoRole } from '@/lib/photo-placement';
import { placementTools } from '@/lib/placement-preview';
import './media-placement.css';

export const roles: Record<PhotoRole,string> = { front:'Foreground', background:'Background', button:'Button skin', hero:'Hero artwork' };
export function MediaPlacement({ project, initial, apply, cancel }: {
    project: Project; initial: PhotoDraft; apply: (draft: PhotoDraft) => void; cancel: () => void
}) {
    const [draft, setDraft] = useState(initial);
    const [preferred,setPreferred] = useState(initial.role);
    const [grid,setGrid] = useState(() => { try {return localStorage.getItem('pagelet.grid') !== 'off';} catch {return true;} });
    const [phone,setPhone] = useState(false), [loaded,setLoaded] = useState(0);
    const iframe = useRef<HTMLIFrameElement>(null), focus = useRef(true);
    const base = useMemo(() => ({ ...project, sections: project.sections.map(s => s.id === initial.origin?.id ? clearPhoto(s,initial.origin.role) : s) }), [project,initial]);
    const page = useMemo(() => renderPage(base).replace('</body>', () => placementTools + '</body>'), [base]);
    const sections = base.sections.filter(s => !s.hidden);
    const section = sections.find(s => s.id === draft.id)!;
    const previous = currentPhoto(section, draft.role);
    const html = useMemo(() => {
        const fixed = { ...initial, id:draft.id, role:draft.role, alt:draft.alt };
        const staged = placePhoto(base,fixed);
        const visible = staged.sections.filter(s => !s.hidden);
        const index = visible.findIndex(s => s.id === fixed.id);
        if (index < 0) return '';
        const contact = visible.find(s => s.type === 'contact') || visible.find(s => s.type === 'cta');
        return sectionHtml(visible[index],index,contact?.id || '');
    }, [base, initial, draft.id, draft.role, draft.alt]);
    const last = useRef({ html:'',loaded:0 });
    useEffect(() => {
        const replace = last.current.html !== html || last.current.loaded !== loaded || focus.current;
        iframe.current?.contentWindow?.postMessage({ type: replace ? 'placement:frame' : 'placement:position',
            html:replace?html:undefined, id:draft.id,role:draft.role,x:draft.x,y:draft.y,grid,preferred,focus:focus.current || last.current.loaded !== loaded },'*');
        last.current={html,loaded};focus.current=false;
    }, [draft,grid,preferred,html,loaded]);
    useEffect(() => {
        function receive(e: MessageEvent) {
            if(e.source!==iframe.current?.contentWindow || e.data?.type!=='placement:pick')return;
            const {id,role,x,y}=e.data;
            const target=base.sections.find(s=>s.id===id && !s.hidden);
            if(!target || !(Object.hasOwn(roles,role)) || !supportsPhoto(target,role) ||
                ![x,y].every(v=>Number.isInteger(v) && v>=0 && v<=100))return;
            setDraft(d=>({...d,id,role,x,y}));
        }
        window.addEventListener('message',receive);
        return ()=>window.removeEventListener('message',receive);
    },[base]);
    function choose(s:Section,role:PhotoRole) {
        focus.current=true;setPreferred(role);
        setDraft(d=>({...d,id:s.id,role}));
    }
    return <div className="media-placement">
      <p>Drag across sections or onto a button. Scroll to reach more sections. On touchscreens, drag the round handle.</p>
      <div className="placement-controls">
        <label>Section<select value={draft.id} onChange={e=>{const next=sections.find(s=>s.id===e.target.value)!;choose(next,supportsPhoto(next,preferred)?preferred:'front');}}>
          {sections.map((s,i)=><option key={s.id} value={s.id}>{i+1}. {s.title.replace(/\n/g,' ') || SECTION_META[s.type].name}</option>)}
        </select></label>
        <label>Use as<select value={draft.role} onChange={e=>choose(section,e.target.value as PhotoRole)}>{(Object.keys(roles) as PhotoRole[]).filter(r=>supportsPhoto(section,r)).map(r=><option key={r} value={r}>{roles[r]}</option>)}</select></label>
        <label><input type="checkbox" checked={grid} onChange={e=>{setGrid(e.target.checked);try{localStorage.setItem('pagelet.grid',e.target.checked?'on':'off');}catch{}}}/> Snap to grid</label>
        <label><input type="checkbox" checked={phone} onChange={e=>setPhone(e.target.checked)}/> Phone preview</label>
      </div>
      <iframe title="Media placement canvas" ref={iframe} sandbox="allow-scripts" className={phone?'phone':''} srcDoc={page} onLoad={()=>setLoaded(n=>n+1)}/>
      {phone && section.mobile.hidden && <p role="status">This section is hidden on phones.</p>}
      <div className="placement-controls">{(['x','y'] as const).map(axis=><label key={axis}>{axis==='x'?'Horizontal':'Vertical'} · {draft[axis]}%<input type="range" min="0" max="100" step={grid?10:1} value={draft[axis]} onChange={e=>setDraft(d=>({...d,[axis]:Number(e.target.value)}))}/></label>)}
      {['hero','front'].includes(draft.role) && <label>{isVideo(draft.src)?'Video label':'Image description'}<input value={draft.alt} maxLength={500} onChange={e=>setDraft(d=>({...d,alt:e.target.value}))}/></label>}</div>
      <div className="placement-footer"><small>{previous?'Applying replaces the media in this slot.':'Hold Alt or Option while dragging for free placement.'}</small><button className="button secondary" onClick={cancel}>Cancel</button><button className="button primary" onClick={()=>apply(draft)}>Apply placement</button></div>
    </div>;
}

