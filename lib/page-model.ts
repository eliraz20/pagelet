import { readPhoto, isVideo, mediaSource } from './photo-placement.ts';
import type { PlacedPhoto } from './photo-placement.ts';
import { useStarter, starterIds } from './starters.ts';
import type { StarterId } from './starters.ts';
import { defaultBackground, normalizeBackground } from './backgrounds.ts';
import type { Background } from './backgrounds.ts';
import { defaultContact, normalizeContact } from './socials.ts';
import type { Contact } from './socials.ts';
import { defaultSticky, normalizeSticky, normalizeGallery } from './interactive-model.ts';
import type { GalleryImage, StickyContact } from './interactive-model.ts';
export type SectionType = 'hero' | 'features' | 'steps' | 'quote' | 'pricing' | 'faq' | 'cta' | 'contact' | 'tabs' | 'gallery';
export type Reveal = {
    enabled: boolean;
    label: string;
    title: string;
    text: string;
    open: boolean;
};
export type Item = {
    title: string;
    text: string;
};
export type Section = {
    id: string;
    type: SectionType;
    eyebrow: string;
    title: string;
    description: string;
    buttonLabel: string;
    buttonHref: string;
    items: Item[];
    image: string;
    frontPhoto: PlacedPhoto | null;
    buttonPhoto: PlacedPhoto | null;
    hidden: boolean;
    layout: 'standard' | 'centered' | 'compact';
    imageX: number;
    imageY: number;
    mobile: { hidden: boolean; titleSize: number; imageX: number; imageY: number };
    background: Background;
    contact: Contact;
    reveal: Reveal;
    gallery: GalleryImage[];
    galleryColumns: 2 | 3;
};
export type Theme = {
    accent: string;
    background: string;
    text: string;
    font: 'sans' | 'serif' | 'mono';
    radius: 'soft' | 'square' | 'round';
    spacing: 'compact' | 'comfortable' | 'airy';
    buttons: 'solid' | 'outline' | 'pill';
};
export type Project = {
    version: 1;
    name: string;
    brand: string;
    title: string;
    description: string;
    navLabel: string;
    navHref: string;
    footer: string;
    template: 'studio' | 'product' | 'launch' | StarterId;
    goal: 'inquiries' | 'product' | 'event' | 'portfolio';
    theme: Theme;
    sections: Section[];
    stickyContact: StickyContact;
};
export const SECTION_META: Record<SectionType, {
    name: string;
    description: string;
    symbol: string;
}> = { hero: { name: 'Hero', description: 'Make a great first impression.', symbol: '↗' }, features: { name: 'Features', description: 'Give people a reason to care.', symbol: '▦' }, steps: { name: 'How it works', description: 'A clear path to getting started.', symbol: '≋' }, quote: { name: 'Testimonial', description: 'Add a real customer’s words.', symbol: '“' }, pricing: { name: 'Pricing', description: 'One clear offer. No guesswork.', symbol: '$' }, faq: { name: 'FAQs', description: 'Answer the questions that matter.', symbol: '?' }, cta: { name: 'Call to action', description: 'Turn interest into a next step.', symbol: '→' }, contact: { name: 'Contact & socials', description: 'Your email and social links, ready to fill in.', symbol: '@' }, tabs: { name: 'Tabbed content', description: 'Let visitors choose what to explore.', symbol: '▤' }, gallery: { name: 'Image gallery', description: 'A closer look at your work.', symbol: '▧' } };
export const PALETTES = [{ name: 'Butter', accent: '#ead577', background: '#fbfaf6', text: '#292c27' }, { name: 'Sage', accent: '#c2d3b5', background: '#f8faf5', text: '#26332a' }, { name: 'Lilac', accent: '#c4b4ec', background: '#faf9ff', text: '#2d273b' }, { name: 'Terracotta', accent: '#df9d82', background: '#fff9f4', text: '#382a25' }, { name: 'Sky', accent: '#a9cde2', background: '#f6fafc', text: '#25323b' }, { name: 'Ink', accent: '#c4eb8c', background: '#181d19', text: '#f3f4ec' }];
export function uid() { return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `s-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
export function makeSection(type: SectionType): Section {
    const base = { id: uid(), type, eyebrow: '', title: '', description: '', buttonLabel: '', buttonHref: '#contact', items: [] as Item[], image: '', hidden: false, gallery: [] as GalleryImage[], galleryColumns: 3 as const, background: defaultBackground(), contact: defaultContact(), reveal: { enabled: false, label: 'Read more', title: 'A little more detail', text: 'Add the details visitors can explore when they’re ready.', open: false } };
    const defaults: Record<SectionType, Partial<Section>> = {
        hero: { eyebrow: 'SMALL STUDIO. BIG POSSIBILITIES.', title: 'Good things start\nwith a clear idea.', description: 'We turn your next big thing into a thoughtful digital experience. Less noise. More of what makes you, you.', buttonLabel: 'Let’s make something', items: [{ title: 'Thoughtful by design', text: 'Built around your next chapter.' }] },
        features: { eyebrow: 'A LITTLE DIFFERENT, BY DESIGN', title: 'Less ordinary.\nMore you.', description: 'Good design makes room for the things that matter.', items: [{ title: 'Find your point of view', text: 'A clear direction that feels unmistakably yours.' }, { title: 'Make every detail count', text: 'Thoughtful experiences, from the first impression to the last click.' }, { title: 'Built to grow with you', text: 'A flexible foundation for whatever comes next.' }] },
        steps: { eyebrow: 'FROM WHAT IF TO WHAT’S NEXT', title: 'A simple way forward.', description: 'Big ideas don’t need a complicated process.', items: [{ title: 'Start a conversation', text: 'Tell us what you have in mind and where you want to go.' }, { title: 'Shape it together', text: 'We explore, refine, and find the right direction.' }, { title: 'Make your next move', text: 'Launch something you’re excited to put into the world.' }] },
        quote: { eyebrow: 'WORDS FROM YOUR COMMUNITY', title: '“Add a real customer quote here. What changed for them, and why did it matter?”', description: 'Your customer’s name · Their role or company' },
        pricing: { eyebrow: 'YOUR NEXT CHAPTER', title: 'One clear starting point.', description: 'Replace this sample offer with your own pricing and what’s included.', buttonLabel: 'Let’s talk', items: [{ title: 'Your service', text: '$199 / project' }, { title: 'What’s included', text: 'Add the main benefit of your offer.' }, { title: 'A thoughtful process', text: 'Describe how you support your customer.' }, { title: 'Made for you', text: 'Explain what makes your offer different.' }] },
        faq: { eyebrow: 'A FEW GOOD QUESTIONS', title: 'Glad you asked.', items: [{ title: 'Who is this for?', text: 'Describe who you help and what they’re looking for.' }, { title: 'How do we get started?', text: 'Explain the first step and what happens next.' }, { title: 'What does the process look like?', text: 'Give people a clear idea of what to expect.' }] },
        cta: { eyebrow: 'SOMETHING GOOD STARTS HERE', title: 'Ready for your\nnext chapter?', description: 'Tell us what you’re dreaming about. We’ll figure out the next step together.', buttonLabel: 'Say hello', buttonHref: 'mailto:hello@example.com' },
        contact: { eyebrow: 'LET’S START A CONVERSATION', title: 'Find me around\nthe internet.', description: 'Have a question or an idea? Choose your favorite way to say hello.' },
        tabs: { eyebrow: 'A FEW WAYS TO EXPLORE', title: 'The details,\nat your own pace.', description: 'Choose what you’d like to know more about.', items: [{ title: 'Overview', text: 'Introduce what you do and who you help.' }, { title: 'Services', text: 'Describe the ways people can work with you.' }, { title: 'Details', text: 'Explain your process, timelines, or what’s included.' }] },
        gallery: { eyebrow: 'A CLOSER LOOK', title: 'A little visual\ninspiration.', description: 'Click any image for a closer look. Replace these illustrative studies with your own work.', gallery: [{ id: uid(), src: '', preset: 'arch', alt: 'Golden arch geometric illustration', caption: 'Arch study · sample illustration' }, { id: uid(), src: '', preset: 'coast', alt: 'Abstract coastal shapes in blue and sand colors', caption: 'Coastal shapes · sample illustration' }, { id: uid(), src: '', preset: 'garden', alt: 'Abstract leaf and sun illustration', caption: 'Garden notes · sample illustration' }] }
    };
    return { ...base, frontPhoto: null, buttonPhoto: null, layout: 'standard', imageX: 50, imageY: 50, mobile: { hidden: false, titleSize: 0, imageX: 50, imageY: 50 }, ...defaults[type] };
}
export function createProject(template: Project['template'] = 'studio'): Project {
    const project: Project = { version: 1, goal: template === 'product' ? 'product' : 'inquiries', name: 'My first page', brand: 'morrow', title: 'Morrow — Thoughtful digital experiences', description: 'A small creative studio for your next big idea.', navLabel: 'Let’s talk', navHref: '#contact', footer: 'Made with care. Built for what’s next.', template, theme: { ...PALETTES[0], font: 'sans', radius: 'soft', spacing: 'comfortable', buttons: 'solid' }, stickyContact: defaultSticky(), sections: ['hero', 'features', 'steps', 'faq', 'cta', 'contact'].map(type => makeSection(type as SectionType)) };
    if (template === 'product') {
        Object.assign(project, { brand: 'orbit', title: 'Orbit — Make room for meaningful work', description: 'A calmer home for your projects, ideas, and next steps.' });
        project.theme = { ...PALETTES[2], font: 'sans', radius: 'round', spacing: 'comfortable', buttons: 'pill' };
        Object.assign(project.sections[0], { eyebrow: 'LESS BUSYWORK. MORE GOOD WORK.', title: 'Make room for\nwhat matters.', description: 'Give your projects, ideas, and next steps a calm place to come together.', buttonLabel: 'Explore the possibilities' });
        Object.assign(project.sections[1], { title: 'Your day,\na little lighter.', items: [{ title: 'Everything in its place', text: 'Bring your ideas and projects into one clear view.' }, { title: 'Find your flow', text: 'Build a way of working that fits the way you think.' }, { title: 'Move forward together', text: 'Keep the next step visible and your team on the same page.' }] });
    }
    if (template === 'launch') {
        Object.assign(project, { brand: 'offscript', title: 'Offscript — Something different is coming', description: 'A space for ideas that don’t fit inside the lines.', navLabel: 'Get in touch' });
        project.theme = { ...PALETTES[5], font: 'sans', radius: 'square', spacing: 'comfortable', buttons: 'solid' };
        Object.assign(project.sections[0], { eyebrow: 'FOR IDEAS THAT DON’T FIT THE MOLD', title: 'A little less expected.\nA lot more possible.', description: 'Something new is taking shape. Be part of what happens next.', buttonLabel: 'Get in touch' });
        project.sections = [project.sections[0], project.sections[1], project.sections[3], project.sections[4], project.sections[5]];
        Object.assign(project.sections[3], { title: 'Meet you on\nthe other side.', description: 'Have a question, an idea, or a reason to say hello?', buttonLabel: 'Start a conversation' });
    }
    return useStarter(project);
}
export function moveSection(project: Project, id: string, offset: number): Project {
    const index = project.sections.findIndex(s => s.id === id), target = index + offset;
    if (index < 0 || target < 0 || target >= project.sections.length)
        return project;
    const sections = [...project.sections];
    [sections[index], sections[target]] = [sections[target], sections[index]];
    return { ...project, sections };
}
const string = (value: unknown, max = 4000) => typeof value === 'string' ? value.slice(0, max) : '';
const hex = (value: unknown) => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
export function parseProject(input: unknown): Project {
    if (!input || typeof input !== 'object')
        throw new Error('Choose a Pagelet project JSON file.');
    const data = input as Record<string, unknown>, theme = data.theme as Record<string, unknown>;
    if (data.version !== 1 || !theme || !Array.isArray(data.sections) || data.sections.length > 30)
        throw new Error('This file isn’t a supported Pagelet project (version 1, up to 30 sections).');
    if (!hex(theme.accent) || !hex(theme.background) || !hex(theme.text))
        throw new Error('This project contains invalid theme colors.');
    const seenIds = new Set<string>();
    const sections = data.sections.map((value: unknown) => {
        if (!value || typeof value !== 'object')
            throw new Error('A section is invalid.');
        const section = value as Record<string, unknown>;
        if (typeof section.type !== 'string' || !Object.hasOwn(SECTION_META, section.type))
            throw new Error('This project contains an unknown section type.');
        const result = makeSection(section.type as SectionType);
        if (typeof section.id === 'string' && /^[a-z\d-]{1,80}$/i.test(section.id) && !seenIds.has(section.id))
            result.id = section.id;
        seenIds.add(result.id);
        for (const key of ['eyebrow', 'title', 'description', 'buttonLabel', 'buttonHref', 'image'] as const)
            result[key] = string(section[key], key === 'image' ? 2200000 : 4000);
        if (typeof section.image === 'string' && isVideo(section.image)) result.image = mediaSource(section.image);
        result.frontPhoto = readPhoto(section.frontPhoto);
        result.buttonPhoto = readPhoto(section.buttonPhoto);
        result.hidden = section.hidden === true;
        result.layout = ['standard', 'centered', 'compact'].includes(String(section.layout)) ? section.layout as Section['layout'] : 'standard';
        const number = (value: unknown, min: number, max: number, fallback: number) => typeof value === 'number' && Number.isFinite(value) ? Math.round(Math.max(min, Math.min(max, value))) : fallback;
        result.imageX = number(section.imageX, 0, 100, 50);
        result.imageY = number(section.imageY, 0, 100, 50);
        const mobile = section.mobile && typeof section.mobile === 'object' ? section.mobile as Record<string, unknown> : {};
        result.mobile = { hidden: mobile.hidden === true, titleSize: mobile.titleSize === 0 || mobile.titleSize == null ? 0 : number(mobile.titleSize, 24, 72, 0), imageX: number(mobile.imageX, 0, 100, result.imageX), imageY: number(mobile.imageY, 0, 100, result.imageY) };
        result.background = normalizeBackground(section.background);
        result.contact = normalizeContact(section.contact);
        result.gallery = normalizeGallery(section.gallery);
        result.galleryColumns = section.galleryColumns === 2 ? 2 : 3;
        if (section.reveal && typeof section.reveal === 'object') {
            const reveal = section.reveal as Record<string, unknown>;
            result.reveal = { enabled: reveal.enabled === true, label: string(reveal.label, 100) || 'Read more', title: string(reveal.title), text: string(reveal.text, 12000), open: reveal.open === true };
        }
        result.items = Array.isArray(section.items) ? section.items.slice(0, 12).map((item) => ({ title: string(item?.title), text: string(item?.text) })) : [];
        return result;
    });
    return { version: 1, goal: ['inquiries', 'product', 'event', 'portfolio'].includes(String(data.goal)) ? data.goal as Project['goal'] : data.template === 'product' ? 'product' : 'inquiries', stickyContact: normalizeSticky(data.stickyContact), name: string(data.name, 100) || 'Untitled page', brand: string(data.brand, 100), title: string(data.title, 200), description: string(data.description, 500), navLabel: string(data.navLabel, 100), navHref: string(data.navHref, 2000), footer: string(data.footer, 500), template: ['studio', 'product', 'launch', ...starterIds].includes(String(data.template)) ? data.template as Project['template'] : 'studio', theme: { spacing: ['compact', 'comfortable', 'airy'].includes(String(theme.spacing)) ? theme.spacing as Theme['spacing'] : 'comfortable', buttons: ['solid', 'outline', 'pill'].includes(String(theme.buttons)) ? theme.buttons as Theme['buttons'] : 'solid', accent: theme.accent as string, background: theme.background as string, text: theme.text as string, font: ['sans', 'serif', 'mono'].includes(String(theme.font)) ? theme.font as Theme['font'] : 'sans', radius: ['soft', 'square', 'round'].includes(String(theme.radius)) ? theme.radius as Theme['radius'] : 'soft' }, sections };
}
export function contrast(a: string, b: string): number {
    const luminance = (hex: string) => { const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4); return c[0] * .2126 + c[1] * .7152 + c[2] * .0722; };
    const x = luminance(a), y = luminance(b);
    return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}
