'use client';
import { useId, useState } from 'react';
import { ArrowUpRight, Check, Smartphone, Sparkles } from 'lucide-react';
import type { Project, Section } from '@/lib/page-model';
import { GOALS, createGoalProject } from '@/lib/page-guidance';
import { safeImage } from '@/lib/render-page';

export function GoalSetup({ onCreate }: { onCreate: (project: Project) => void }) {
    const [goal, setGoal] = useState<Project['goal']>('inquiries');
    const [brand, setBrand] = useState(''), [offer, setOffer] = useState(''), [destination, setDestination] = useState('');
    const definition = GOALS.find(item => item.id === goal)!;
    return <form className="goal-setup" onSubmit={event => { event.preventDefault(); onCreate(createGoalProject(goal, brand, offer, destination)); }}>
        <div className="goal-options" role="group" aria-label="Page purpose">{GOALS.map(item => <button key={item.id} type="button" className={`goal-option ${goal === item.id ? 'chosen' : ''}`} aria-pressed={goal === item.id} onClick={() => setGoal(item.id)}><span className="goal-symbol">{item.symbol}</span><span><strong>{item.name}</strong><small>{item.description}</small></span>{goal === item.id && <Check size={16}/>}</button>)}</div>
        <div className="goal-brief"><span className="goal-step">YOUR PAGE, WITH A HEAD START</span><h3>What are you putting<br/>into the world?</h3>
            <label className="field"><span>Brand or your name</span><input required maxLength={100} value={brand} onChange={e => setBrand(e.target.value)} placeholder="e.g. North Studio"/></label>
            <label className="field"><span>Your offer in one sentence</span><textarea required maxLength={200} value={offer} onChange={e => setOffer(e.target.value)} rows={2} placeholder={goal === 'portfolio' ? 'Thoughtful identities for ambitious brands.' : goal === 'event' ? 'An evening of ideas worth sharing.' : goal === 'product' ? 'A calmer home for your everyday essentials.' : 'Beautiful websites for small businesses.'}/></label>
            <label className="field"><span>{goal === 'product' ? 'Checkout or shop link' : goal === 'event' ? 'Registration link' : 'Main button destination'} <small>(optional)</small></span><input maxLength={2000} value={destination} onChange={e => setDestination(e.target.value)} placeholder="https://… or mailto:you@yourdomain.com"/><small>Leave blank to point to your Contact section. Add your contact details there before exporting.</small></label>
            <div className="suggested-story"><span>SUGGESTED STORY</span><p>{definition.order.map(type => ({hero:'Introduction',features:'Benefits',steps: goal === 'event' ? 'Agenda' : 'Process',faq:'Questions',cta:'Next step',contact:'Contact',gallery:'Gallery',pricing:'Offer'})[type]).join(' → ')}</p></div>
            <button className="button primary" type="submit"><Sparkles size={15}/>Build my starting page<ArrowUpRight size={15}/></button>
        </div>
    </form>;
}

type Props = { section: Section; onChange: (change: Partial<Section>, key: string) => void; device: 'desktop' | 'mobile'; onMobile: () => void };
export function SectionLayoutSettings({ section, onChange, device, onMobile }: Props) {
    return <div className="section-layout-settings field-group"><p className="group-label">SECTION LAYOUT</p><div className="layout-choices" role="group" aria-label="Section layout">{(['standard', 'centered', 'compact'] as const).map(layout => <button key={layout} className={section.layout === layout ? 'chosen' : ''} aria-pressed={section.layout === layout} onClick={() => onChange({ layout }, 'layout')}><span className={`layout-mini ${layout}`} aria-hidden="true"><i/><i/><i/></span>{layout === 'standard' ? 'Classic' : layout === 'centered' ? 'Centered' : 'Compact'}</button>)}</div>
        <details className="control-disclosure mobile-settings" open={device === 'mobile'}><summary><span className="control-summary-title"><Smartphone size={14}/>Mobile adjustments</span><span>+</span></summary><div className="control-body"><p className="control-description">These settings affect screens up to 580px wide. Desktop keeps its own layout.</p><button className="text-button" onClick={onMobile}>Show mobile preview<ArrowUpRight size={12}/></button><label className="mobile-toggle"><input type="checkbox" checked={section.mobile.hidden} onChange={e => onChange({ mobile: { ...section.mobile, hidden: e.target.checked } }, 'mobile-hidden')}/>Hide this section on mobile</label>{section.mobile.hidden && <p className="inline-notice">This section is hidden in the mobile preview and export. Uncheck to show it.</p>}<label className="range-field"><span>Mobile heading size <output>{section.mobile.titleSize ? `${section.mobile.titleSize}px` : 'Automatic'}</output></span><input aria-label="Mobile heading size" type="range" min={24} max={72} value={section.mobile.titleSize || 42} onChange={e => onChange({ mobile: { ...section.mobile, titleSize: Number(e.target.value) } }, 'mobile-size')}/></label><button className="text-button" disabled={!section.mobile.titleSize} onClick={() => onChange({ mobile: { ...section.mobile, titleSize: 0 } }, 'mobile-size')}>Use automatic size</button></div></details>
    </div>;
}

export function ImageCrop({ section, onChange, device }: Omit<Props, 'onMobile'>) {
    const id = useId(), [point, setPoint] = useState<{x:number;y:number}|null>(null);
    const mobile = device === 'mobile';
    const current = { x: mobile ? section.mobile.imageX : section.imageX, y: mobile ? section.mobile.imageY : section.imageY };
    const set = (x: number, y: number) => mobile ? onChange({ mobile: { ...section.mobile, imageX: x, imageY: y } }, 'mobile-crop') : onChange({ imageX: x, imageY: y }, 'crop');
    const locate = (e: React.PointerEvent<HTMLDivElement>) => { const box = e.currentTarget.getBoundingClientRect(); return { x: Math.round(Math.max(0,Math.min(100,(e.clientX-box.left)/box.width*100))), y: Math.round(Math.max(0,Math.min(100,(e.clientY-box.top)/box.height*100))) }; };
    const shown = point || current;
    return <div className="image-crop"><p className="group-label">{mobile ? 'MOBILE' : 'DESKTOP'} IMAGE FOCAL POINT</p><p className="control-description">Drag the marker toward the part of the image to keep in view.</p><div className="focal-pad" onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); setPoint(locate(e)); }} onPointerMove={e => { if(e.currentTarget.hasPointerCapture(e.pointerId))setPoint(locate(e)); }} onPointerUp={e => { const p=locate(e); setPoint(null); set(p.x,p.y); }} onPointerCancel={() => setPoint(null)}><img draggable={false} src={safeImage(section.image)} alt="Image crop positioning" style={{objectPosition:`${shown.x}% ${shown.y}%`}}/><span className="focal-marker" style={{left:`${shown.x}%`,top:`${shown.y}%`}}/></div>{(['x','y'] as const).map(axis => <label className="range-field" htmlFor={`${id}-${axis}`} key={axis}><span>{axis === 'x' ? 'Horizontal position' : 'Vertical position'}<output>{current[axis]}%</output></span><input id={`${id}-${axis}`} type="range" min={0} max={100} value={current[axis]} onChange={e => set(axis === 'x' ? Number(e.target.value) : current.x,axis === 'y' ? Number(e.target.value) : current.y)}/></label>)}{mobile && <button className="text-button" onClick={() => set(section.imageX,section.imageY)}>Copy desktop crop</button>}</div>;
}
