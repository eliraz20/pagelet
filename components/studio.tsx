'use client';
import './page-guidance.css';
import { GoalSetup, SectionLayoutSettings, ImageCrop } from './page-guidance';
import { checkPage, nextLook, GOALS } from '@/lib/page-guidance';
import type { PageIssue } from '@/lib/page-guidance';
import { pageFiles, zipFiles } from '@/lib/export-bundle';
import { TabsSettings, GallerySettings, StickyContactSettings } from './interactive-settings';
import { BackgroundSettings, ContactSettings, RevealSettings } from './section-settings';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, ArrowLeft, ArrowUp, ArrowDown, Check, ChevronDown, ChevronRight, Copy, Download, Eye, EyeOff, FileJson, GripVertical, LayoutTemplate, Layers, Monitor, MoreHorizontal, MousePointer2, Palette, Plus, Redo2, Settings2, Smartphone, Sparkles, Trash2, Undo2, Upload, X, CheckCircle2, ImagePlus, ExternalLink, PanelLeftClose, PanelLeftOpen, HelpCircle } from 'lucide-react';
import { createProject, makeSection, moveSection, parseProject, uid, contrast, PALETTES, SECTION_META } from '@/lib/page-model';
import type { Project, Section, SectionType, Theme } from '@/lib/page-model';
import { renderPage, safeHref, safeImage } from '@/lib/render-page';
import { MediaPlacement, roles } from './media-placement';
import { STARTERS } from '@/lib/starters';
import { currentPhoto, clearPhoto, placePhoto, replaceMedia, isVideo, mediaSource } from '@/lib/photo-placement';
import type { PhotoDraft, PhotoRole } from '@/lib/photo-placement';
import { MediaPicker } from './media-picker';
import type { Upload as UploadedMedia } from '@/lib/recent-uploads';
import { loadDraft, saveDraft } from '@/lib/draft-storage';
type Tab = 'sections' | 'design' | 'settings';
type PickerTarget = { id: string; role: PhotoRole | 'gallery'; replace: boolean; galleryId?: string };
type Modal = 'picker' | 'placement' | 'templates' | 'add' | 'export' | 'preview' | 'help' | null;
type History = {
    past: Project[];
    current: Project;
    future: Project[];
};
const TEMPLATES = [{ id: 'studio' as const, name: 'The thoughtful studio', tag: 'Services & creatives', color: 'butter', description: 'Warm, editorial, and a little unexpected.' }, { id: 'product' as const, name: 'The next big thing', tag: 'Products & startups', color: 'lilac', description: 'A clear story for a product worth exploring.' }, { id: 'launch' as const, name: 'Something different', tag: 'Launches & ideas', color: 'ink', description: 'A bold first impression for what comes next.' }, ...STARTERS];
function download(content: string | Uint8Array<ArrayBuffer>, name: string, type: string) { const url = URL.createObjectURL(new Blob([content], { type })); const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
const slug = (value: string) => value.toLowerCase().replace(/[^a-z\d]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || 'my-page';
function Field({ label, value, onChange, multiline = false, hint, placeholder, maxLength = 4000 }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    multiline?: boolean;
    hint?: string;
    placeholder?: string;
    maxLength?: number;
}) { return <label className="field"><span>{label}</span>{multiline ? <textarea value={value} onChange={e => onChange(e.target.value)} rows={label === 'Headline' ? 3 : 3} placeholder={placeholder} maxLength={maxLength}/> : <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength}/>} {hint && <small>{hint}</small>}</label>; }
function TemplateThumb({ tone = 'butter' }: {
    tone?: string;
}) { return <div className={`template-thumb ${tone}`} aria-hidden="true"><div className="thumb-nav"><i /><b /><b /></div><div className="thumb-hero"><div><span /><span /><em /></div><figure><i /></figure></div><div className="thumb-line"/><div className="thumb-cards"><i /><i /><i /></div></div>; }
export default function Studio() {
    const [history, setHistory] = useState<History>(() => ({ past: [], current: createProject(), future: [] }));
    const project = history.current;
    const [placement,setPlacement] = useState<PhotoDraft | null>(null);
    const [starterLink,setStarterLink] = useState('');
    const [picker,setPicker] = useState<PickerTarget | null>(null);
    const [frameWidth, setFrameWidth] = useState(1060);
    const [ready, setReady] = useState(false), [tab, setTab] = useState<Tab>('sections'), [selectedId, setSelectedId] = useState(''), [device, setDevice] = useState<'desktop' | 'mobile'>('desktop'), [modal, setModal] = useState<Modal>(null), [toast, setToast] = useState(''), [saveState, setSaveState] = useState<'saving' | 'saved' | 'unavailable'>('saved'), [panelOpen, setPanelOpen] = useState(true), [dragged, setDragged] = useState<string | null>(null), [exported, setExported] = useState(false);
    const viewportRef = useRef<HTMLDivElement>(null), iframe = useRef<HTMLIFrameElement>(null), propertiesRef = useRef<HTMLElement>(null), importInput = useRef<HTMLInputElement>(null), modalRef = useRef<HTMLDialogElement>(null), scrollY = useRef(0), editGroup = useRef({ key: '', time: 0 }), modalTrigger = useRef<HTMLElement | null>(null), lastModal = useRef<Modal>(null);
    const selected = project.sections.find(s => s.id === selectedId), selectedIndex = project.sections.findIndex(s => s.id === selectedId);
    const visibleCount = project.sections.filter(s => !s.hidden).length;
    const previewScale = Math.min(1, frameWidth / (device === 'desktop' ? 1060 : 390));
    useEffect(() => {
        if (!ready || !viewportRef.current)
            return;
        const observer = new ResizeObserver(entries => setFrameWidth(Math.max(1, entries[0].contentRect.width)));
        observer.observe(viewportRef.current);
        return () => observer.disconnect();
    }, [ready]);
    const notify = useCallback((message: string) => setToast(message), []);
    const commit = useCallback((change: Project | ((p: Project) => Project), group = '') => {
        const now = Date.now(), merge = !!group && editGroup.current.key === group && now - editGroup.current.time < 800;
        editGroup.current = { key: group, time: now };
        setHistory(state => {
            const next = typeof change === 'function' ? change(state.current) : change;
            if (next === state.current)
                return state;
            return { past: merge ? state.past : [...state.past, state.current].slice(-60), current: next, future: [] };
        });
    }, []);
    const undo = useCallback(() => { editGroup.current = { key: '', time: 0 }; setHistory(state => state.past.length ? { past: state.past.slice(0, -1), current: state.past.at(-1)!, future: [state.current, ...state.future] } : state); }, []);
    const redo = useCallback(() => { editGroup.current = { key: '', time: 0 }; setHistory(state => state.future.length ? { past: [...state.past, state.current], current: state.future[0], future: state.future.slice(1) } : state); }, []);
    const updateProject = (key: 'brand' | 'name' | 'title' | 'description' | 'navLabel' | 'navHref' | 'footer', value: string) => commit(p => ({ ...p, [key]: value }), key);
    const updateTheme = (change: Partial<Theme>) => commit(p => ({ ...p, theme: { ...p.theme, ...change } }), 'theme');
    const updateSection = (id: string, change: Partial<Section>, key = 'section') => commit(p => ({ ...p, sections: p.sections.map(s => s.id === id ? { ...s, ...change } : s) }), `${id}-${key}`);
    const openModal = (next: Modal) => { modalTrigger.current = document.activeElement as HTMLElement; setExported(false); setModal(next); };
    const selectSection = (id: string, scroll = false) => {
        setSelectedId(id);
        setTab('sections');
        setPanelOpen(true);
        if (scroll)
            iframe.current?.contentWindow?.postMessage({ type: 'pagelet:focus', id }, '*');
        setTimeout(() => propertiesRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 80);
    };
    useEffect(() => {
        let active = true;
        async function restore() {
        try {
            const stored = await loadDraft();
            if (!active) return;
            if (stored) {
                const saved = parseProject(JSON.parse(stored));
                setHistory({ past: [], current: saved, future: [] });
                setSelectedId(saved.sections[0]?.id || '');
            }
            else {
                setSelectedId(project.sections[0]?.id || '');
                setModal('templates');
            }
        }
        catch {
            notify('Your saved draft could not be opened. A fresh page is ready; import a project backup to restore it.');
        }
        if (!active) return;
        if (window.matchMedia('(max-width:650px)').matches)
            setPanelOpen(false);
        setReady(true);
        }
        void restore();
        return () => {active=false;};
        // The browser draft is intentionally loaded once after hydration.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    useEffect(() => {
        if (!ready)
            return;
        setSaveState('saving');
        const timer = setTimeout(async () => {
            try {
                await saveDraft(JSON.stringify(project));
                setSaveState('saved');
            }
            catch {
                setSaveState('unavailable');
                notify('This draft couldn’t be saved in your browser. Download a project backup to keep your work.');
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [project, ready, notify]);
    useEffect(() => {
        if (!toast)
            return;
        const timer = setTimeout(() => setToast(''), 6000);
        return () => clearTimeout(timer);
    }, [toast]);
    useEffect(() => {
        const receive = (event: MessageEvent) => {
            if (event.source !== iframe.current?.contentWindow)
                return;
            const data = event.data;
            if (data?.type === 'pagelet:select' && typeof data.id === 'string' && project.sections.some(s => s.id === data.id))
                selectSection(data.id);
            if (data?.type === 'pagelet:edit' && typeof data.id === 'string' && project.sections.some(s => s.id === data.id) && ['eyebrow','title','description','buttonLabel'].includes(data.field) && typeof data.value === 'string') {
                updateSection(data.id, { [data.field]: data.value.slice(0, data.field === 'buttonLabel' ? 100 : 4000) }, 'inline-' + data.field);
            }
            if (data?.type === 'pagelet:image' && project.sections.some(s => s.id === data.id && s.type === 'hero')) {
                selectSection(data.id);
                pickUpload(data.id,'hero');
            }
            if (data?.type === 'pagelet:scroll' && typeof data.y === 'number' && Number.isFinite(data.y))
                scrollY.current = Math.max(0, data.y);
        };
        window.addEventListener('message', receive);
        return () => window.removeEventListener('message', receive);
        // Selection uses the current section list; messages are accepted only from our preview iframe.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [project.sections]);
    useEffect(() => {
        if (selectedId && !project.sections.some(s => s.id === selectedId))
            setSelectedId(project.sections[0]?.id || '');
    }, [project.sections, selectedId]);
    useEffect(() => {
        const dialog = modalRef.current;
        if (modal) {
            if (!dialog?.open)
                dialog?.showModal();
        }
        else if (lastModal.current) {
            dialog?.close();
            modalTrigger.current?.focus();
        }
        lastModal.current = modal;
    }, [modal]);
    useEffect(() => {
        const handle = (e: KeyboardEvent) => {
            if (!(e.ctrlKey || e.metaKey))
                return;
            const input = e.target instanceof HTMLElement && e.target.closest('input,textarea,[contenteditable]');
            if (e.key.toLowerCase() === 's') {
                e.preventDefault();
                download(JSON.stringify(project, null, 2), `${slug(project.name)}.pagelet.json`, 'application/json');
                notify('Project backup downloaded.');
            }
            if (!input && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                if (modal === 'placement' || modal === 'picker') return;
                if (e.shiftKey)
                    redo();
                else
                    undo();
            }
        };
        window.addEventListener('keydown', handle);
        return () => window.removeEventListener('keydown', handle);
    }, [project, undo, redo, notify, modal]);
    function focusSectionControl(selector: string) {
        const control = propertiesRef.current?.querySelector<HTMLDetailsElement>(selector);
        if (control) {
            control.open = true;
            control.scrollIntoView({ block: 'start', behavior: 'smooth' });
        }
    }
    function addSection(type: SectionType) {
        if (project.sections.length >= 30) {
            notify('This page has reached the 30-section limit.');
            return;
        }
        const section = makeSection(type);
        commit(p => ({ ...p, sections: [...p.sections, section] }));
        setModal(null);
        selectSection(section.id);
        setTimeout(() => iframe.current?.contentWindow?.postMessage({ type: 'pagelet:focus', id: section.id }, '*'), 200);
        notify(`${SECTION_META[type].name} added.`);
    }
    function duplicateSection() {
        if (!selected || project.sections.length >= 30)
            return;
        const copy = { ...selected, id: uid(), items: selected.items.map(item => ({ ...item })) };
        commit(p => ({ ...p, sections: p.sections.flatMap(s => s.id === selected.id ? [s, copy] : [s]) }));
        setSelectedId(copy.id);
        notify('Section duplicated.');
    }
    function removeSection() {
        if (!selected)
            return;
        commit(p => ({ ...p, sections: p.sections.filter(s => s.id !== selected.id) }));
        notify('Section removed. You can undo this.');
    }
    function startGoal(next: Project) { commit(next); setSelectedId(next.sections[0]?.id || ''); scrollY.current = 0; setModal(null); notify('Your starting page is ready. Make the words yours; Undo restores your previous page.'); }
    function reviewIssue(issue: PageIssue) {
        setModal(null);
        if (issue.sectionId) { setDevice('desktop'); selectSection(issue.sectionId, true); }
        else { setTab(issue.panel); setPanelOpen(true); }
    }
    function chooseTemplate(id: Project['template']) { const fresh = createProject(id);
        if (starterLink.trim()) {
            const url = safeHref(starterLink);
            if (url === '#' || !/^https?:/.test(url)) {notify('Enter a complete booking, signup, or checkout URL.');return;}
            fresh.navHref=url;
            fresh.sections=fresh.sections.map(s=>s.buttonLabel && (s.buttonHref==='#contact' || s.type==='cta') ? {...s,buttonHref:url} : s);
        }
        commit(fresh); setSelectedId(fresh.sections[0]?.id || ''); scrollY.current = 0; setModal(null); notify('New starting design applied. Your previous page is one undo away.'); }
    async function importProject(file?: File) {
        if (!file)
            return;
        try {
            if (file.size > 128 * 1024 * 1024)
                throw new Error('Choose a project file smaller than 128 MB.');
            const next = parseProject(JSON.parse(await file.text()));
            commit(next);
            setSelectedId(next.sections[0]?.id || '');
            scrollY.current = 0;
            notify('Project imported. Make yourself at home.');
        }
        catch (error) {
            notify(error instanceof SyntaxError ? 'That file isn’t valid JSON. Choose a Pagelet project backup.' : error instanceof Error ? error.message : 'The project could not be imported.');
        }
        if (importInput.current)
            importInput.current.value = '';
    }
    function pickUpload(id: string, role: PhotoRole, replace?: boolean) {
        const section = project.sections.find(s => s.id === id);
        if (!section) return;
        setPicker({ id, role, replace: replace ?? !!currentPhoto(section, role) });
        openModal('picker');
    }
    function pickGallery(id: string, galleryId?: string) {
        setPicker({ id, role:'gallery', replace:!!galleryId, galleryId });
        openModal('picker');
    }
    function chooseMedia(items: UploadedMedia[]) {
        if (!picker || !items.length) return;
        const { id,role,replace,galleryId } = picker;
        if (role === 'gallery') {
            commit(p => ({ ...p, sections:p.sections.map(s => {
                if (s.id !== id || s.type !== 'gallery') return s;
                const gallery = galleryId ? s.gallery.map(item => item.id === galleryId ? { ...item, src:items[0].src, preset:'' } : item)
                    : [...s.gallery, ...items.map(item => ({ id:uid(), src:item.src, alt:item.name.replace(/\.[^.]+$/, '').replace(/[-_]/g,' '), caption:'', preset:'' }))].slice(0, 12);
                return { ...s,gallery };
            }) }));
        } else if (replace) {
            commit(p => replaceMedia(p,{id,role},items[0].src));
        } else {
            stage({id,role,src:items[0].src,alt:'',x:50,y:50});
            return;
        }
        setModal(null);
        notify(replace ? 'Media replaced. Placement kept.' : 'Images added to the gallery.');
    }
    function stage(draft:PhotoDraft) {
        const target=project.sections.find(s=>s.id===draft.id && !s.hidden);
        if(!target){notify('Show the section before placing media in it.');return;}
        setPlacement(draft);openModal('placement');
    }
    function dropSection(targetId: string) {
        if (!dragged || targetId === dragged)
            return;
        commit(p => {
            const sections = [...p.sections], from = sections.findIndex(s => s.id === dragged), to = sections.findIndex(s => s.id === targetId);
            if (from < 0 || to < 0)
                return p;
            sections.splice(to, 0, sections.splice(from, 1)[0]);
            return { ...p, sections };
        });
        setDragged(null);
    }
    const warnings = checkPage(project);
    const editorDocument = useMemo(() => renderPage(project, { editable: true, scrollY: scrollY.current }), [project]);
    if (!ready)
        return <main className="loading"><div className="logo-icon">p<span>↗</span></div><p>Opening your studio…</p></main>;
    return <div className="studio">
    <a href="#editor-panel" className="skip-link">Skip to editing controls</a>
    <header className="app-header"><a className="app-brand" href="#" onClick={e => { e.preventDefault(); openModal('templates'); }}><span className="logo-icon">p<span>↗</span></span>pagelet<span className="studio-badge">STUDIO</span></a><div className="project-name"><span className="header-divider"/><input aria-label="Project name" value={project.name} maxLength={100} onChange={e => updateProject('name', e.target.value)}/><ChevronDown size={13}/></div><span className={`save-state ${saveState === 'unavailable' ? 'save-error' : ''}`}>{saveState === 'saved' ? <CheckCircle2 size={13}/> : saveState === 'saving' ? <span className="saving-dot"/> : <HelpCircle size={13}/>}<span>{saveState === 'saved' ? 'Saved on this device' : saveState === 'saving' ? 'Saving…' : 'Backup needed'}</span></span><div className="header-actions"><div className="history-buttons"><button className="icon-button" title="Undo (Ctrl/⌘ Z)" aria-label="Undo" disabled={!history.past.length} onClick={undo}><Undo2 size={16}/></button><button className="icon-button" title="Redo (Ctrl/⌘ Shift Z)" aria-label="Redo" disabled={!history.future.length} onClick={redo}><Redo2 size={16}/></button></div><button className="button secondary preview-button" aria-label="Preview" onClick={() => openModal('preview')}><Eye size={14}/><span>Preview</span></button><button className="button primary" onClick={() => openModal('export')}>Export page<ArrowUpRight size={15}/></button></div></header>
    <div className="workspace">
      <nav className="tool-rail" aria-label="Editor panels"><div className="rail-top">{([{ id: 'sections', label: 'Build', icon: Layers }, { id: 'design', label: 'Style', icon: Palette }, { id: 'settings', label: 'Page', icon: Settings2 }] as const).map(item => <button key={item.id} className={`rail-button ${tab === item.id && panelOpen ? 'active' : ''}`} onClick={() => { setTab(item.id); setPanelOpen(true); }} aria-pressed={tab === item.id && panelOpen}><item.icon size={20}/><span>{item.label}</span></button>)}</div><div className="rail-bottom"><button className="rail-button" onClick={() => openModal('templates')}><LayoutTemplate size={19}/><span>Start</span></button><button className="rail-button" onClick={() => openModal('help')}><HelpCircle size={19}/><span>Help</span></button></div></nav>
      {panelOpen && <aside id="editor-panel" className="editor-panel"><div className="panel-heading"><div><p className="overline">YOUR LITTLE CORNER OF THE WEB</p><h1>{tab === 'sections' ? 'Make it yours.' : tab === 'design' ? 'Set the feeling.' : 'The finishing touches.'}</h1></div><button className="icon-button" aria-label="Hide editing panel" title="Hide panel" onClick={() => setPanelOpen(false)}><PanelLeftClose size={17}/></button></div><div className="panel-scroll">
        {tab === 'sections' && <><div className="layout-prompt"><div className="layout-prompt-icon"><LayoutTemplate size={19}/></div><div><strong>A page with a purpose</strong><p>Start with what your page should do.</p></div><button className="icon-button" aria-label="Choose starting layout" onClick={() => openModal('templates')}><ArrowUpRight size={17}/></button></div><div className="outline-heading"><h2>Page sections <span>{project.sections.length}</span></h2><span>DRAG TO REORDER</span></div><div className="section-outline" aria-label="Page section order">{project.sections.map((section, i) => <div key={section.id} draggable onDragStart={() => setDragged(section.id)} onDragEnd={() => setDragged(null)} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); dropSection(section.id); }} className={`outline-row ${selectedId === section.id ? 'selected' : ''} ${section.hidden ? 'is-hidden' : ''} ${dragged === section.id ? 'dragging' : ''}`}><button className="outline-select" onClick={() => selectSection(section.id, true)} aria-pressed={selectedId === section.id}><GripVertical size={12} className="drag-handle"/><span className="section-symbol">{SECTION_META[section.type].symbol}</span><span>{SECTION_META[section.type].name}</span><span className="outline-number">{String(i + 1).padStart(2, '0')}</span></button><button className="visibility-button" title={section.hidden ? 'Show section' : 'Hide section'} aria-label={`${section.hidden ? 'Show' : 'Hide'} ${SECTION_META[section.type].name} section ${i + 1}`} onClick={() => updateSection(section.id, { hidden: !section.hidden }, 'visibility')}>{section.hidden ? <EyeOff size={13}/> : <Eye size={13}/>}</button></div>)}</div><button className="add-section" onClick={() => openModal('add')} disabled={project.sections.length >= 30}><Plus size={15}/>Add a section</button>
        {selected && <section className="section-properties" ref={propertiesRef} key={selected.id}><div className="properties-heading"><div><p className="overline">EDIT SECTION</p><h2>{SECTION_META[selected.type].name}</h2></div><div className="section-actions"><button className="icon-button" title="Move section up" aria-label="Move section up" disabled={selectedIndex === 0} onClick={() => commit(p => moveSection(p, selected.id, -1))}><ArrowUp size={14}/></button><button className="icon-button" title="Move section down" aria-label="Move section down" disabled={selectedIndex === project.sections.length - 1} onClick={() => commit(p => moveSection(p, selected.id, 1))}><ArrowDown size={14}/></button><button className="icon-button" title="Duplicate section" aria-label="Duplicate section" disabled={project.sections.length >= 30} onClick={duplicateSection}><Copy size={14}/></button><button className="icon-button danger" title="Remove section" aria-label="Remove section" onClick={removeSection}><Trash2 size={14}/></button></div></div><div className="properties-shortcuts"><button onClick={() => focusSectionControl('.section-background-settings')}><ImagePlus size={13}/>Background</button><button onClick={() => focusSectionControl('.reveal-settings')}><MoreHorizontal size={13}/>Read more</button></div>{selected.hidden && <p className="inline-notice">This section is hidden from your page and export.</p>}<SectionLayoutSettings section={selected} device={device} onMobile={() => setDevice('mobile')} onChange={(change, key) => updateSection(selected.id, change, key)}/><Field label="Small label" value={selected.eyebrow} onChange={value => updateSection(selected.id, { eyebrow: value }, 'eyebrow')} maxLength={150}/><Field label="Headline" value={selected.title} onChange={value => updateSection(selected.id, { title: value }, 'title')} multiline hint="A clear promise goes a long way."/><Field label={selected.type === 'quote' ? 'Attribution' : 'Description'} value={selected.description} onChange={value => updateSection(selected.id, { description: value }, 'description')} multiline/>
        {['hero', 'pricing', 'cta'].includes(selected.type) && <div className="field-group"><p className="group-label">THE NEXT STEP</p><Field label="Button text" value={selected.buttonLabel} onChange={value => updateSection(selected.id, { buttonLabel: value }, 'buttonLabel')} placeholder="e.g. Book a free consultation" maxLength={100}/><Field label="Button destination" value={selected.buttonHref} onChange={value => updateSection(selected.id, { buttonHref: value }, 'buttonHref')} hint="Use https://, mailto:, tel:, or #contact." maxLength={2000}/>{selected.buttonHref && safeHref(selected.buttonHref) === '#' && <p className="field-warning">This destination isn’t a valid link yet.</p>}</div>}
        {selected.type === 'hero' && <div className="field-group"><p className="group-label">A LITTLE VISUAL INTEREST</p><div className="image-control"><div className="image-mini">{selected.image && isVideo(selected.image) ? <video muted playsInline src={mediaSource(selected.image)}/> : selected.image ? <img src={safeImage(selected.image)} alt="Your uploaded hero"/> : <span>✳</span>}</div><div><strong>{selected.image ? 'Your uploaded media' : 'Built-in illustration'}</strong><p>{selected.image ? 'Included in your export' : 'Or bring your own perspective.'}</p><button className="text-button" onClick={() => pickUpload(selected.id,'hero')}><Upload size={12}/>{selected.image ? 'Replace media' : 'Upload photo or video'}</button></div></div>{selected.image && <button className="text-button" onClick={() => updateSection(selected.id, { image: '' }, 'image')}>Use illustration instead</button>}<small className="hint">Images up to 1.5 MB · MP4 or WebM up to 12 MiB</small>{selected.image && !isVideo(selected.image) && <ImageCrop key={selected.id + device} section={selected} device={device} onChange={(change, key) => updateSection(selected.id, change, key)}/>}<Field label="Image description" value={selected.items[0]?.text || ''} onChange={value => updateSection(selected.id, { items: [{ title: selected.items[0]?.title || '', text: value }] }, 'image-alt')} hint="Describe the image for people using screen readers."/><Field label="Note under the button" value={selected.items[0]?.title || ''} onChange={value => updateSection(selected.id, { items: [{ title: value, text: selected.items[0]?.text || '' }] }, 'note')}/></div>}
        {['features', 'steps', 'pricing', 'faq'].includes(selected.type) && <div className="field-group"><div className="items-heading"><p className="group-label">{selected.type === 'faq' ? 'QUESTIONS & ANSWERS' : selected.type === 'pricing' ? 'YOUR OFFER & INCLUSIONS' : 'THE DETAILS'}</p><button className="text-button" disabled={selected.items.length >= 12} onClick={() => updateSection(selected.id, { items: [...selected.items, { title: 'Something worth sharing', text: 'Add a little detail here.' }] }, 'add-item')}><Plus size={12}/>Add</button></div>{selected.items.map((item, i) => <div className="item-editor" key={i}><div className="item-editor-heading"><span>{selected.type === 'faq' ? 'QUESTION' : selected.type === 'pricing' && i === 0 ? 'OFFER' : 'ITEM'} {i + 1}</span><button className="icon-button danger" aria-label={`Remove item ${i + 1}`} onClick={() => updateSection(selected.id, { items: selected.items.filter((_, n) => n !== i) }, 'remove-item')}><X size={12}/></button></div><Field label={selected.type === 'faq' ? 'Question' : selected.type === 'pricing' && i === 0 ? 'Offer name' : 'Title'} value={item.title} onChange={value => updateSection(selected.id, { items: selected.items.map((it, n) => n === i ? { ...it, title: value } : it) }, `item-${i}-title`)}/><Field label={selected.type === 'faq' ? 'Answer' : selected.type === 'pricing' && i === 0 ? 'Price' : 'Details'} value={item.text} onChange={value => updateSection(selected.id, { items: selected.items.map((it, n) => n === i ? { ...it, text: value } : it) }, `item-${i}-text`)} multiline/></div>)}</div>}
        {selected.type === 'tabs' && <TabsSettings section={selected} onChange={(change, key) => updateSection(selected.id, change, key)}/>}
                {selected.type === 'gallery' && <GallerySettings section={selected} onChange={(change, key) => updateSection(selected.id, change, key)} onUpload={galleryId => pickGallery(selected.id, galleryId)}/>}
                {selected.type === 'contact' && <ContactSettings section={selected} onChange={(change, key) => updateSection(selected.id, change, key)}/>}
                <div className="field-group"><p className="group-label">SECTION MEDIA</p><button className="button secondary full-width" disabled={selected.hidden} onClick={()=>pickUpload(selected.id,'front',false)}><ImagePlus size={14}/>Place a photo or video</button>
                {(Object.keys(roles) as PhotoRole[]).map(role=>{const item=currentPhoto(selected,role);return item && mediaSource(item.src) && <div className="media-actions" key={role}><button className="text-button" disabled={selected.hidden} onClick={()=>stage({...item,id:selected.id,role,origin:{id:selected.id,role}})}>Move {roles[role].toLowerCase()}</button><button className="text-button" aria-label={'Replace '+roles[role]+' and keep placement'} onClick={()=>pickUpload(selected.id,role,true)}>Replace</button><button className="text-button" aria-label={'Remove '+roles[role]} onClick={()=>commit(p=>({...p,sections:p.sections.map(s=>s.id===selected.id?clearPhoto(s,role):s)}))}>Remove</button></div>;})}
                <small className="hint">Images up to 1.5 MB · MP4 or WebM up to 12 MiB</small></div>
                <BackgroundSettings section={selected} onChange={(change, key) => updateSection(selected.id, change, key)} onUpload={() => pickUpload(selected.id,'background')}/>
                <RevealSettings section={selected} onChange={(change, key) => updateSection(selected.id, change, key)}/>
                </section>}{!selected && <div className="panel-empty"><MousePointer2 size={24}/><p>Select a section or add your first one.</p></div>}</>}
        {tab === 'design' && <><p className="panel-intro">A few thoughtful choices. A whole different feeling.</p><button className="button secondary full-width try-look" onClick={() => { commit(nextLook); notify('A fresh look, with all your content kept. Undo to go back.'); }}><Sparkles size={15}/>Try another look</button><section className="design-group"><div className="group-title"><h2>Color stories</h2><span>6 CURATED PALETTES</span></div><div className="palette-grid">{PALETTES.map(palette => <button key={palette.name} className={`palette-option ${project.theme.accent === palette.accent && project.theme.background === palette.background ? 'chosen' : ''}`} onClick={() => updateTheme({ accent: palette.accent, background: palette.background, text: palette.text })}><span className="palette-colors"><i style={{ background: palette.background }}/><i style={{ background: palette.accent }}/><i style={{ background: palette.text }}/></span><span>{palette.name}</span>{project.theme.accent === palette.accent && project.theme.background === palette.background && <Check size={12}/>}</button>)}</div></section><section className="design-group"><h2>Make the colors yours</h2>{([{ key: 'accent', label: 'Accent' }, { key: 'background', label: 'Background' }, { key: 'text', label: 'Text' }] as const).map(item => <label className="color-field" key={item.key}><span>{item.label}</span><span>{project.theme[item.key].toUpperCase()}</span><input type="color" value={project.theme[item.key]} aria-label={`${item.label} color`} onChange={e => updateTheme({ [item.key]: e.target.value })}/></label>)}{contrast(project.theme.text, project.theme.background) < 4.5 && <p className="field-warning">Text may be hard to read. Try a darker text color or lighter background.</p>}</section><section className="design-group"><h2>Typography</h2><div className="font-options">{([{ id: 'sans', name: 'Modern & clear', sample: 'Aa' }, { id: 'serif', name: 'Warm & editorial', sample: 'Aa' }, { id: 'mono', name: 'A little technical', sample: 'Aa' }] as const).map(font => <button key={font.id} className={`font-option ${project.theme.font === font.id ? 'chosen' : ''}`} onClick={() => updateTheme({ font: font.id })}><span className={`font-sample ${font.id}`}>{font.sample}</span><span>{font.name}</span>{project.theme.font === font.id && <Check size={13}/>}</button>)}</div></section><section className="design-group"><h2>Corner style</h2><div className="segmented corner-options">{(['square', 'soft', 'round'] as const).map(radius => <button key={radius} className={project.theme.radius === radius ? 'active' : ''} onClick={() => updateTheme({ radius })}><span style={{ borderRadius: radius === 'square' ? 1 : radius === 'soft' ? 5 : 10 }}/>{radius}</button>)}</div></section><section className="design-group"><h2>Button style</h2><div className="segmented style-options">{(['solid','outline','pill'] as const).map(buttons => <button key={buttons} className={project.theme.buttons === buttons ? 'active' : ''} aria-pressed={project.theme.buttons === buttons} onClick={() => updateTheme({ buttons })}>{buttons}</button>)}</div></section><section className="design-group"><h2>Room to breathe</h2><div className="segmented style-options">{(['compact','comfortable','airy'] as const).map(spacing => <button key={spacing} className={project.theme.spacing === spacing ? 'active' : ''} aria-pressed={project.theme.spacing === spacing} onClick={() => updateTheme({ spacing })}>{spacing === 'comfortable' ? 'Balanced' : spacing}</button>)}</div></section><div className="tip-card"><Sparkles size={17}/><div><strong>Designed to work together.</strong><p>Changes apply across your whole page. No nudging individual pixels.</p></div></div></>}
        {tab === 'settings' && <><p className="panel-intro">Give your page a name, a clear next step, and a home in search results.</p><section className="settings-group"><h2>Your identity</h2><Field label="Brand name" value={project.brand} onChange={value => updateProject('brand', value)} maxLength={100}/><Field label="Footer message" value={project.footer} onChange={value => updateProject('footer', value)} multiline maxLength={500}/></section><section className="settings-group"><h2>Top navigation</h2><Field label="Button text" value={project.navLabel} onChange={value => updateProject('navLabel', value)} maxLength={100}/><Field label="Button destination" value={project.navHref} onChange={value => updateProject('navHref', value)} hint="#contact scrolls to your Contact section, or a call-to-action if you haven’t added one." maxLength={2000}/></section><StickyContactSettings value={project.stickyContact} onChange={value => commit(p => ({ ...p, stickyContact: value }), 'sticky-contact')}/><section className="settings-group"><h2>Search & sharing</h2><Field label="Page title" value={project.title} onChange={value => updateProject('title', value)} hint="The title shown in browser tabs and search results." maxLength={200}/><Field label="Page description" value={project.description} onChange={value => updateProject('description', value)} multiline maxLength={500}/><div className="search-preview"><small>YOUR PAGE IN SEARCH</small><strong>{project.title || 'Your page title'}</strong><p>{project.description || 'A short description of your page.'}</p></div></section><section className="settings-group"><h2>Keep your work</h2><p className="hint">Your draft saves on this device. A project backup lets you move it anywhere.</p><button className="button secondary full-width" onClick={() => { download(JSON.stringify(project, null, 2), `${slug(project.name)}.pagelet.json`, 'application/json'); notify('Editable project backup downloaded.'); }}><FileJson size={15}/>Download project</button><button className="button secondary full-width" onClick={() => importInput.current?.click()}><Upload size={15}/>Import project</button></section></>}
      </div><div className="panel-footer"><span className="footer-spark">✳</span>A little page. A big beginning.</div></aside>}
      <main className={`canvas-area ${device === 'mobile' ? 'mobile-view' : ''}`}><div className="canvas-toolbar"><div className="canvas-label">{!panelOpen && <button className="icon-button" aria-label="Show editing panel" onClick={() => setPanelOpen(true)}><PanelLeftOpen size={17}/></button>}<span className="canvas-dot"/><span>YOUR PAGE</span><span className="canvas-label-divider">/</span><span className="canvas-template">{GOALS.find(g => g.id === project.goal)?.name || TEMPLATES.find(t => t.id === project.template)?.tag}</span></div><div className="segmented device-switch" aria-label="Preview size"><button className={device === 'desktop' ? 'active' : ''} onClick={() => setDevice('desktop')} aria-pressed={device === 'desktop'} title="Desktop preview"><Monitor size={14}/><span>Desktop</span></button><button className={device === 'mobile' ? 'active' : ''} onClick={() => setDevice('mobile')} aria-pressed={device === 'mobile'} title="Mobile preview"><Smartphone size={14}/><span>Mobile</span></button></div><button className="text-button canvas-preview-link" onClick={() => openModal('preview')}>Open preview<ArrowUpRight size={13}/></button></div><div className="canvas-scroll"><div className="canvas-hint"><MousePointer2 size={12}/><span>Click text to edit. Click an image to replace it.</span><span className="hint-separator">·</span><span>Changes save when you leave the text</span></div><div className={`browser-frame ${device}`}><div className="browser-chrome"><div className="browser-dots"><i /><i /><i /></div><span className="browser-address"><span className="address-lock">◇</span>{slug(project.brand || 'your-page')}.page <span> / preview</span></span><button className="icon-button" aria-label="Open full page preview" title="Open preview" onClick={() => openModal('preview')}><ExternalLink size={12}/></button></div><div className="iframe-viewport" ref={viewportRef}><iframe ref={iframe} title="Live landing page editor preview" sandbox="allow-scripts" style={{ width: 100 / previewScale + '%', height: 100 / previewScale + '%', transform: 'scale(' + previewScale + ')' }} srcDoc={editorDocument}/></div></div><div className="canvas-bottom"><span><span className="canvas-dot"/>{visibleCount} sections · One continuous page</span><span>Responsive by nature<Check size={11}/></span></div></div><div className="sample-note"><Sparkles size={12}/><span>Good bones, your story. Template copy is a starting point—make it yours.</span></div></main>
    </div>
    <input ref={importInput} type="file" accept="application/json,.json" hidden onChange={e => importProject(e.target.files?.[0])}/>
    {toast && <div className="toast" role="status"><CheckCircle2 size={16}/><span>{toast}</span><button aria-label="Dismiss message" onClick={() => setToast('')}><X size={14}/></button></div>}
    <dialog ref={modalRef} className={`modal ${modal === 'placement' ? 'placement-modal' : modal === 'preview' ? 'preview-modal' : ''} ${modal === 'templates' ? 'templates-modal' : ''}`} onCancel={() => setModal(null)} onClick={e => {
            if (e.target === e.currentTarget)
                setModal(null);
        }} aria-labelledby="modal-title">
      <div className="modal-header"><div><p className="overline">{modal === 'placement' || modal === 'picker' ? 'SECTION MEDIA' : modal === 'templates' ? 'NO BLANK CANVAS REQUIRED' : modal === 'add' ? 'BUILD A CLEARER STORY' : modal === 'export' ? 'READY FOR THE WORLD' : modal === 'preview' ? 'LOOKING GOOD' : 'WELCOME TO YOUR STUDIO'}</p><h2 id="modal-title">{modal === 'picker' ? (picker?.replace ? 'Replace media' : 'Choose media') : modal === 'placement' ? 'Place your media' : modal === 'templates' ? 'What should your page do?' : modal === 'add' ? 'What comes next?' : modal === 'export' ? 'Your page. Yours to take.' : modal === 'preview' ? project.name : 'Small learning curve. Big possibilities.'}</h2></div><button className="icon-button" aria-label="Close dialog" onClick={() => setModal(null)}><X size={19}/></button></div>
      {modal === 'picker' && picker && <MediaPicker project={project} imagesOnly={picker.role==='gallery'} replace={picker.replace} limit={picker.role==='gallery' && !picker.replace ? 12 - (project.sections.find(s=>s.id===picker.id)?.gallery.length || 0) : 1} choose={chooseMedia}/>}
      {modal === 'placement' && placement && <MediaPlacement project={project} initial={placement} apply={d=>{commit(p=>placePhoto(p,d));setSelectedId(d.id);setPlacement(null);setModal(null);notify('Media placed.');}} cancel={()=>{setPlacement(null);setModal(null);}}/>}
      {modal === 'templates' && <><p className="modal-intro">Pick a goal. Add your name and offer. We’ll put the right sections in order.</p><GoalSetup onCreate={startGoal}/><details open className="visual-starters"><summary>Choose a ready-made template</summary><Field label="Booking, signup, or checkout link (optional)" value={starterLink} onChange={setStarterLink} placeholder="https://…" maxLength={2000}/><div className="template-grid">{TEMPLATES.map(template => <button className={`template-card ${project.template === template.id ? 'current' : ''}`} key={template.id} onClick={() => chooseTemplate(template.id)}><TemplateThumb tone={template.color}/><div className="template-info"><span>{template.tag}</span><h3>{template.name}</h3><p>{template.description}</p><strong>Start with this<ArrowUpRight size={14}/></strong></div></button>)}</div></details><p className="modal-footnote"><Undo2 size={13}/>Starting a new page replaces this draft. Your previous page is one undo away.</p></>}
      {modal === 'add' && <><p className="modal-intro">Each section has a job. Add what your story needs.</p><div className="block-grid">{(Object.entries(SECTION_META) as [
                SectionType,
                typeof SECTION_META[SectionType]
            ][]).map(([type, meta]) => <button className="block-card" key={type} onClick={() => addSection(type)}><span className="block-symbol">{meta.symbol}</span><div><h3>{meta.name}</h3><p>{meta.description}</p></div><Plus size={16}/></button>)}</div><p className="modal-footnote">You can reorder, duplicate, or hide any section later.</p></>}
      {modal === 'export' && <><p className="modal-intro">A complete, responsive website in a single HTML file. No subscriptions, dependencies, or Pagelet account required to use it.</p><div className="export-summary"><div className="export-file-icon"><Download size={24}/></div><div><strong>{slug(project.brand)}.html</strong><p>{visibleCount} visible sections · Styles and uploaded images included</p></div><span className="file-badge">HTML</span></div>{warnings.length > 0 ? <div className="export-checks"><h3>Your pre-export check</h3><p>Select an item to fix it. You can also export now and return later.</p><ul>{warnings.map(warning => <li key={warning.id}><button className="issue-link" onClick={() => reviewIssue(warning)}><span>↗</span><span>{warning.sectionId && <strong>{SECTION_META[project.sections.find(s => s.id === warning.sectionId)!.type].name} · </strong>}{warning.message}</span></button></li>)}</ul></div> : <div className="export-ready"><CheckCircle2 size={18}/><span>No common issues found. Review your copy, images, and mobile page before publishing.</span></div>}<button className="button primary export-main" onClick={() => { download(renderPage(project), `${slug(project.brand)}.html`, 'text/html'); setExported(true); notify('Your standalone page has been downloaded.'); }}>{exported ? <Check size={17}/> : <Download size={17}/>} {exported ? 'Downloaded — download again' : 'Download your page'}<ArrowUpRight size={16}/></button><button className="button secondary full-width" onClick={() => { const data = zipFiles(pageFiles(project)); download(new Uint8Array(data), `${slug(project.brand)}-website.zip`, 'application/zip'); notify('Website folder downloaded. Keep its files together when you publish.'); }}><Download size={15}/>Download HTML / CSS / JS folder (.zip)</button><div className="export-secondary"><button className="text-button" onClick={() => { download(JSON.stringify(project, null, 2), `${slug(project.name)}.pagelet.json`, 'application/json'); notify('Editable project backup downloaded.'); }}><FileJson size={14}/>Save editable project</button><button className="text-button" onClick={() => { setModal('preview'); }}><Eye size={14}/>One last preview</button></div><div className="export-explainer"><strong>What happens next?</strong><p>Open the HTML file in a browser, or rename it to <code>index.html</code> and upload it to GitHub Pages, Netlify, or your own hosting. Buttons use the links you set; form collection and payments need an external service.</p></div></>}
      {modal === 'preview' && <><div className="full-preview-toolbar"><span>This is your exported page. Try the links and scroll through every section.</span><div className="segmented device-switch"><button className={device === 'desktop' ? 'active' : ''} onClick={() => setDevice('desktop')} aria-label="Desktop preview"><Monitor size={15}/></button><button className={device === 'mobile' ? 'active' : ''} onClick={() => setDevice('mobile')} aria-label="Mobile preview"><Smartphone size={15}/></button></div></div><div className={`full-preview ${device}`}><iframe title="Full landing page preview" sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox" srcDoc={renderPage(project, { preview: true })}/></div></>}
      {modal === 'help' && <div className="help-content"><div><span>01</span><section><h3>Start with a direction.</h3><p>Pick a layout for your service, product, or launch. Each is a long, scrolling page—not a fixed-size poster.</p></section></div><div><span>02</span><section><h3>Make the story yours.</h3><p>Click a headline or description to edit directly. Click outside the text to save, or press Ctrl/⌘ Enter. Click an image to replace it. Add sections, drag to reorder, or use the up/down buttons.</p></section></div><div><span>03</span><section><h3>Set the feeling.</h3><p>Open Style for colors, typography, and corners. Check the Mobile preview before you export.</p></section></div><div><span>04</span><section><h3>Take it anywhere.</h3><p>Export a standalone HTML page and an editable JSON backup. Drafts save in this browser; they don’t sync between devices.</p></section></div><div className="help-shortcut"><kbd>Ctrl / ⌘ + Z</kbd> Undo <kbd>Ctrl / ⌘ + S</kbd> Download project</div></div>}
    </dialog>
  </div>;
}
