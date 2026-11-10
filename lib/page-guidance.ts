import { createProject, makeSection, contrast, PALETTES } from './page-model.ts';
import type { Project, Section, SectionType } from './page-model.ts';
import { contactHref, SOCIAL_FIELDS } from './socials.ts';
import { safeHref, safeImage } from './render-page.ts';

export const GOALS = [
    { id: 'inquiries', name: 'Get inquiries', symbol: '↗', description: 'Explain your service and make it easy to get in touch.', order: ['hero', 'features', 'steps', 'faq', 'cta', 'contact'] },
    { id: 'product', name: 'Sell a product', symbol: '◈', description: 'Show the benefits, explain the offer, and link to checkout.', order: ['hero', 'features', 'gallery', 'pricing', 'faq', 'cta', 'contact'] },
    { id: 'event', name: 'Promote an event', symbol: '✳', description: 'Introduce the event, outline the agenda, and link to registration.', order: ['hero', 'features', 'steps', 'faq', 'cta', 'contact'] },
    { id: 'portfolio', name: 'Show my work', symbol: '▧', description: 'Put your projects first and invite the right conversations.', order: ['hero', 'gallery', 'features', 'steps', 'cta', 'contact'] },
] as const;

export function createGoalProject(goal: Project['goal'], brand: string, offer: string, destination: string): Project {
    const definition = GOALS.find(item => item.id === goal) || GOALS[0];
    const project = createProject(goal === 'product' ? 'product' : goal === 'event' ? 'launch' : 'studio');
    project.goal = definition.id;
    project.sections = definition.order.map(type => makeSection(type as SectionType));
    project.brand = brand.trim().slice(0, 100) || 'Your brand';
    project.name = `${project.brand} · ${definition.name}`.slice(0, 100);
    project.title = `${project.brand} — ${definition.name}`;
    project.description = offer.trim().slice(0, 500);
    const label = { inquiries: 'Let’s talk', product: 'Shop now', event: 'Register your interest', portfolio: 'Work with me' }[definition.id];
    project.navLabel = label;
    project.navHref = destination.trim().slice(0, 2000) || '#contact';
    const hero = project.sections[0];
    hero.title = offer.trim().slice(0, 200) || 'Your next chapter starts here.';
    hero.description = 'Describe who this is for and what they can expect.';
    hero.eyebrow = project.brand.toUpperCase();
    hero.buttonLabel = label;
    hero.buttonHref = project.navHref;
    const benefits = project.sections.find(s => s.type === 'features')!;
    if (goal === 'product') {
        benefits.title = 'Made for your everyday.';
        benefits.description = 'Describe the problem your product solves.';
        benefits.items = ['A meaningful benefit', 'The details that count', 'Why choose this'].map(title => ({ title, text: 'Describe the benefit in your customer’s own terms.' }));
        const pricing = project.sections.find(s => s.type === 'pricing')!;
        pricing.title = 'The offer, clearly explained.';
        pricing.items[0] = { title: project.brand, text: 'Your price' };
    }
    if (goal === 'event') {
        benefits.title = 'Why be there?';
        benefits.description = 'Describe who should attend and what they will take away.';
        benefits.items = ['The people', 'The ideas', 'The experience'].map(title => ({ title, text: 'Add your event details here.' }));
        const agenda = project.sections.find(s => s.type === 'steps')!;
        agenda.title = 'What’s on the agenda?';
        agenda.description = 'Add your event date, time, time zone, and venue.';
        agenda.items = ['Welcome', 'The main event', 'Questions & connections'].map(title => ({ title, text: 'Add the time and a short description.' }));
    }
    if (goal === 'portfolio') {
        project.sections.find(s => s.type === 'gallery')!.title = 'Selected work.';
        benefits.title = 'What I can help with.';
        benefits.description = 'Describe the kind of work you want to do more of.';
        benefits.items = ['Your core service', 'Your approach', 'Your next project'].map(title => ({ title, text: 'Describe how you can help your next collaborator.' }));
        hero.layout = 'centered';
    }
    for (const section of project.sections.filter(s => s.type === 'cta' || s.type === 'pricing')) {
        section.buttonLabel = label;
        section.buttonHref = project.navHref;
    }
    return project;
}

export function nextLook(project: Project): Project {
    const index = PALETTES.findIndex(p => p.accent === project.theme.accent);
    const palette = PALETTES[(index + 1) % PALETTES.length];
    const fonts = ['sans', 'serif', 'mono'] as const;
    const radii = ['soft', 'round', 'square'] as const;
    return { ...project, theme: { ...project.theme, accent: palette.accent, background: palette.background, text: palette.text, font: fonts[(fonts.indexOf(project.theme.font) + 1) % fonts.length], radius: radii[(radii.indexOf(project.theme.radius) + 1) % radii.length] } };
}

export type PageIssue = { id: string; message: string; sectionId?: string; panel: 'sections' | 'settings' | 'design' };
export function checkPage(project: Project): PageIssue[] {
    const issues: PageIssue[] = [], visible = project.sections.filter(s => !s.hidden);
    const add = (id: string, message: string, section?: Section, panel: PageIssue['panel'] = 'sections') => issues.push({ id: `${section?.id || 'page'}-${id}`, message, sectionId: section?.id, panel });
    if (!project.title.trim()) add('title', 'Add a page title for browser tabs and search.', undefined, 'settings');
    if (!project.description.trim()) add('description', 'Add a short description for search and sharing.', undefined, 'settings');
    if (!visible.length) add('empty', 'Add a visible section to start your page.');
    if (!visible.some(s => s.type === 'hero')) add('hero', 'Add a hero to introduce your offer.');
    if (!visible.some(s => s.buttonLabel.trim()) && !project.navLabel.trim()) add('cta', 'Add a button with a clear next step.');
    if (!visible.some(s => !s.mobile.hidden)) add('mobile-empty', 'Every section is hidden on mobile. Show at least one section.');
    const contact = visible.find(s => s.type === 'contact') || visible.find(s => s.type === 'cta');
    const anchorTarget = (href: string) => href === '#contact' ? contact : visible.find(s => `#section-${s.id}` === href);
    const checkLink = (label: string, value: string, section?: Section) => {
        const href = safeHref(value), panel = section ? 'sections' : 'settings';
        if (!value.trim() || href === '#') add(`link-${label}`, `${label}: choose a valid destination.`, section, panel);
        else if (/example\.(com|org|net)|your[-_.]?(site|name)|placeholder/i.test(value)) add(`sample-${label}`, `${label}: replace the sample destination.`, section, panel);
        else if (href.startsWith('#') && !anchorTarget(href)) add(`anchor-${label}`, `${label}: the destination section is missing or hidden.`, section, panel);
        else if (href.startsWith('#') && anchorTarget(href)?.mobile.hidden) add(`mobile-${label}`, `${label}: its destination is hidden on mobile.`, section, panel);
    };
    if (project.navLabel.trim()) checkLink('Navigation button', project.navHref);
    if (project.stickyContact.enabled) checkLink('Sticky contact button', project.stickyContact.href);
    for (const s of visible) {
        if (s.buttonLabel.trim() && ['hero', 'cta', 'pricing'].includes(s.type)) checkLink('Section button', s.buttonHref, s);
        if (!s.title.trim()) add('heading', 'Add a heading so this section has a clear purpose.', s);
        const copy = [s.title, s.description, ...s.items.flatMap(i => [i.title, i.text])].join(' ');
        if (/add a real|replace (this|these)|describe (who|how|the)|your customer|add (the|your) (time|event|main)|your (service|price|brand)|sample (offer|illustration)|something worth sharing|add a little detail|your next chapter starts here/i.test(copy)) add('sample', 'Review the starter text and replace any placeholders.', s);
        if (safeImage(s.image) && !s.items[0]?.text.trim()) add('image-alt', 'Describe the hero image for people using screen readers.', s);
        if (s.type === 'gallery' && s.gallery.some(i => !i.alt.trim())) add('gallery-alt', 'Add an image description to each gallery image.', s);
        if (s.type === 'gallery' && s.gallery.some(i => i.preset)) add('gallery-sample', 'Replace the illustrative gallery studies with your own work.', s);
        if (s.type === 'contact') {
            const filled = SOCIAL_FIELDS.filter(f => s.contact[f.id].trim());
            if (!filled.length && !s.contact.custom.some(i => i.url.trim())) add('empty-contact', 'Add at least one contact method, or hide this section.', s);
            for (const field of filled) if (!contactHref(field.id, s.contact[field.id])) add(`social-${field.id}`, `${field.name}: correct this link; it will be hidden in the export.`, s);
            for (const [index, item] of s.contact.custom.entries()) if ((item.label.trim() || item.url.trim()) && (!item.label.trim() || !contactHref('custom', item.url))) add(`custom-${index}`, 'Custom contact links need both a label and a valid URL.', s);
        }
        if (s.background.kind === 'upload' && s.background.opacity > 60 && s.background.overlayOpacity < 30) add('background', 'Check text readability over this background image. Try an overlay if needed.', s);
    }
    if (contrast(project.theme.text, project.theme.background) < 4.5) add('contrast', 'Increase contrast between the page text and background.', undefined, 'design');
    return issues;
}
