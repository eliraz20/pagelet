'use client';
import { mediaAccept } from '@/lib/read-media';
import { isVideo } from '@/lib/photo-placement';
import { useId, useRef } from 'react';
import { ImagePlus, Plus, Trash2, Upload, X } from 'lucide-react';
import { BACKGROUND_PRESETS, normalizeBackground } from '@/lib/backgrounds';
import { SOCIAL_FIELDS, contactHref, normalizeContact } from '@/lib/socials';
import type { Contact } from '@/lib/socials';
import type { Section } from '@/lib/page-model';
type Props = {
    section: Section;
    onChange: (change: Partial<Section>, group: string) => void;
};
function TextField({ label, value, onChange, hint, multiline = false, placeholder }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    hint?: string;
    multiline?: boolean;
    placeholder?: string;
}) {
    const id = useId();
    return <div className="field"><label htmlFor={id} className="setting-label">{label}</label>{multiline ? <textarea id={id} value={value} maxLength={12000} onChange={e => onChange(e.target.value)} rows={4} aria-describedby={hint ? id + '-hint' : undefined}/> : <input id={id} value={value} maxLength={2000} onChange={e => onChange(e.target.value)} placeholder={placeholder} aria-describedby={hint ? id + '-hint' : undefined}/>}{hint && <small id={id + '-hint'}>{hint}</small>}</div>;
}
function Range({ label, value, min = 0, max = 100, unit = '%', onChange }: {
    label: string;
    value: number;
    min?: number;
    max?: number;
    unit?: string;
    onChange: (value: number) => void;
}) {
    const id = useId();
    return <label className="range-field" htmlFor={id}><span>{label}<output>{Math.round(value)}{unit}</output></span><input id={id} type="range" min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))}/></label>;
}
export function ContactSettings({ section, onChange }: Props) {
    const contact = normalizeContact(section.contact);
    const set = (id: keyof Contact, value: Contact[keyof Contact]) => onChange({ contact: { ...contact, [id]: value } }, 'contact-' + id);
    const fields = (ids: string[]) => SOCIAL_FIELDS.filter(field => ids.includes(field.id)).map(field => <div key={field.id}><TextField label={field.name} value={contact[field.id]} placeholder={field.hint} onChange={value => set(field.id, value)}/>{contact[field.id] && !contactHref(field.id, contact[field.id]) && <p className="field-warning">Check this {field.name} address or username. Invalid links stay hidden.</p>}</div>);
    return <div className="contact-settings field-group"><p className="group-label">YOUR CONTACT DETAILS</p><p className="control-description">Add only the channels you use. Empty fields stay hidden; usernames turn into links automatically.</p>{fields(['email', 'phone', 'whatsapp'])}<details className="control-disclosure" open><summary>Social profiles<span>+</span></summary><div className="control-body">{fields(['linkedin', 'github', 'instagram', 'x', 'facebook', 'youtube', 'tiktok', 'website'])}</div></details><details className="control-disclosure"><summary>Other links<span>+</span></summary><div className="control-body"><p className="control-description">Add a booking page, Discord invite, Telegram, or any other link.</p>{contact.custom.map((item, index) => <div className="item-editor" key={index}><div className="item-editor-heading"><span>LINK {index + 1}</span><button className="icon-button danger" aria-label={`Remove custom link ${index + 1}`} onClick={() => set('custom', contact.custom.filter((_, i) => i !== index))}><X size={12}/></button></div><TextField label="Link label" value={item.label} onChange={value => set('custom', contact.custom.map((it, i) => i === index ? { ...it, label: value } : it))}/><TextField label="Link URL" value={item.url} onChange={value => set('custom', contact.custom.map((it, i) => i === index ? { ...it, url: value } : it))}/>{item.url && !contactHref('custom', item.url) && <p className="field-warning">Use a full website URL.</p>}</div>)}<button className="button secondary full-width" disabled={contact.custom.length >= 6} onClick={() => set('custom', [...contact.custom, { label: '', url: '' }])}><Plus size={13}/>Add another link</button></div></details></div>;
}
export function BackgroundSettings({ section, onChange, onUpload }: {
    onUpload: (file: File) => void;
} & Props) {
    const bg = normalizeBackground(section.background), input = useRef<HTMLInputElement>(null);
    const set = (change: Partial<typeof bg>, key = 'background') => onChange({ background: { ...bg, ...change } }, key);
    return <details className="control-disclosure section-background-settings"><summary><span className="control-summary-title"><ImagePlus size={14}/>Section background</span><span>+</span></summary><div className="control-body"><p className="control-description">Set a picture behind this section. Image opacity and tint never fade your text.</p><div className="segmented background-modes">{(['none', 'preset', 'upload'] as const).map(kind => <button key={kind} className={bg.kind === kind ? 'active' : ''} aria-pressed={bg.kind === kind} onClick={() => set({ kind }, 'background-kind')}>{kind === 'none' ? 'None' : kind === 'preset' ? 'Built-in' : 'Your image'}</button>)}</div>
 {bg.kind === 'preset' && <div className="background-presets">{BACKGROUND_PRESETS.map(preset => <button key={preset.id} className={bg.preset === preset.id ? 'chosen' : ''} aria-pressed={bg.preset === preset.id} onClick={() => set({ preset: preset.id, tileSize: preset.size, fit: ['sunrise', 'aurora'].includes(preset.id) ? 'cover' : 'tile' }, 'background-preset')}><span style={{ backgroundImage: preset.css, backgroundSize: ['sunrise', 'aurora'].includes(preset.id) ? 'cover' : '50px 50px' }}/><strong>{preset.name}</strong></button>)}</div>}
 {bg.kind === 'upload' && <div className="background-upload"><button className="button secondary full-width" onClick={() => input.current?.click()}><Upload size={14}/>{bg.image ? 'Replace background media' : 'Upload background media'}</button><small className="hint">JPEG, PNG, WebP · MP4 or WebM up to 12 MiB</small>{bg.image && <button className="text-button" onClick={() => set({ image: '', kind: 'none' }, 'background-remove')}><Trash2 size={12}/>Remove image</button>}</div>}
 {bg.kind !== 'none' && <><label className="field"><span>Image layout</span><select aria-label="Background image layout" value={bg.fit} onChange={e => set({ fit: e.target.value as typeof bg.fit }, 'background-fit')}><option value="cover">Fill section (cover)</option><option value="contain">Fit whole image (contain)</option>{!isVideo(bg.image) && <option value="tile">Repeat as a pattern</option>}</select></label><label className="field"><span>Image position</span><select aria-label="Background image position" value={bg.position} onChange={e => set({ position: e.target.value }, 'background-position')}>{bg.position.includes('%') && <option value={bg.position}>{bg.position}</option>}{['center', 'top', 'bottom', 'left', 'right', 'top left', 'top right', 'bottom left', 'bottom right'].map(position => <option key={position}>{position}</option>)}</select></label>{bg.fit === 'tile' && <Range label="Pattern size" value={bg.tileSize} min={32} max={800} unit=" px" onChange={value => set({ tileSize: value }, 'background-tile-size')}/>}<Range label="Image opacity" value={bg.opacity} onChange={value => set({ opacity: value }, 'background-opacity')}/><Range label="Image blur" value={bg.blur} max={20} unit=" px" onChange={value => set({ blur: value }, 'background-blur')}/><label className="color-field"><span>Overlay color</span><span>{bg.overlayColor.toUpperCase()}</span><input type="color" aria-label="Background overlay color" value={bg.overlayColor} onChange={e => set({ overlayColor: e.target.value }, 'background-overlay-color')}/></label><Range label="Overlay strength" value={bg.overlayOpacity} onChange={value => set({ overlayOpacity: value }, 'background-overlay-opacity')}/><small className="hint">A light or dark overlay can keep text readable over a busy photo.</small></>}
 <input ref={input} type="file" accept={mediaAccept} hidden onChange={e => { const file = e.target.files?.[0]; if (file)
        onUpload(file); e.target.value = ''; }}/>
 </div></details>;
}
export function RevealSettings({ section, onChange }: Props) {
    const reveal = section.reveal || { enabled: false, label: 'Read more', title: '', text: '', open: false };
    const set = (change: Partial<typeof reveal>, key: string) => onChange({ reveal: { ...reveal, ...change } }, 'reveal-' + key);
    return <details className="control-disclosure reveal-settings"><summary>Expandable details<span>+</span></summary><div className="control-body"><label className="toggle-field"><input type="checkbox" checked={reveal.enabled} onChange={e => set({ enabled: e.target.checked }, 'enabled')}/><span>Add a “Read more” button</span></label><p className="control-description">Let visitors open extra information without leaving the page.</p>{reveal.enabled && <><TextField label="Expand button text" value={reveal.label} onChange={value => set({ label: value }, 'label')}/><TextField label="Expanded heading" value={reveal.title} onChange={value => set({ title: value }, 'title')}/><TextField label="Expanded content" value={reveal.text} onChange={value => set({ text: value }, 'text')} multiline/><label className="toggle-field"><input type="checkbox" checked={reveal.open} onChange={e => set({ open: e.target.checked }, 'open')}/><span>Start expanded</span></label><small className="hint">Visitors can open and close this with a mouse, touch, or keyboard.</small></>}</div></details>;
}
