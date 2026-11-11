import { makeSection, PALETTES } from './page-model.ts';
import type { Project, Section, SectionType } from './page-model.ts';

export const STARTERS = [
    { id: 'waitlist', name: 'First access', tag: 'Product waitlist', color: 'ink', description: 'Introduce one idea and invite early testers.' },
    { id: 'sessions', name: 'Portrait afternoon', tag: 'Photo mini-sessions', color: 'sage', description: 'Show a gallery, explain the session, and link to booking.' },
    { id: 'fieldguide', name: 'The field guide', tag: 'Digital download', color: 'terracotta', description: 'Give readers a sample before sending them to checkout.' }
] as const;
export type StarterId = typeof STARTERS[number]['id'];
export const starterIds = STARTERS.map(s => s.id);
const section = (type: SectionType, values: Partial<Section>) => ({ ...makeSection(type), ...values });

export function useStarter(project: Project): Project {
    const starter = STARTERS.find(s => s.id === project.template);
    if (!starter) return project;
    let sections: Section[], palette: number, brand: string, action: string;
    let goal: Project['goal'] = 'product';
    if (starter.id === 'waitlist') {
        brand = 'Daymark'; palette = 5; action = 'Join the waitlist';
        sections = [
            section('hero', { layout: 'centered', eyebrow: 'EARLY ACCESS', title: 'Keep track of the ideas you want to try.', description: 'Daymark is a pocket notebook for small experiments. Save an idea, choose a first step, and revisit what you learned.', items: [], buttonLabel: action }),
            section('steps', { eyebrow: 'INSIDE DAYMARK', title: 'From a thought to a first attempt.', description: '', items: [{ title: 'Catch the idea', text: 'Write down a question while it is fresh.' }, { title: 'Try one thing', text: 'Choose a small experiment and record what happened.' }] }),
            section('cta', { title: 'Try an early version.', eyebrow: 'JOIN THE LIST', description: 'Get a note when the next test opens.', buttonLabel: action })
        ];
    } else if (starter.id === 'sessions') {
        brand = 'Sunday Portraits'; palette = 1; action = 'See available times'; goal = 'inquiries';
        sections = [
            section('hero', { eyebrow: 'PORTRAIT MINI-SESSIONS', title: 'An afternoon in the garden.', description: 'Short, outdoor portrait sessions for people who feel most like themselves in natural light.', buttonLabel: action, items: [] }),
            section('gallery', { title: 'A feel for the session', eyebrow: 'PORTRAITS', description: 'Replace the sample studies with a small set from a recent shoot.', galleryColumns: 2 }),
            section('pricing', { title: 'Your session', eyebrow: 'BEFORE YOU BOOK', description: 'Add your location, date, and session length here.', buttonLabel: action, items: [{ title: 'Portrait mini-session', text: 'Your session price' }, { title: 'Edited portraits', text: 'List how many images clients receive and when.' }] }),
            section('faq', { title: 'Before we meet', eyebrow: 'SESSION NOTES', items: [{ title: 'What should I wear?', text: 'Choose something comfortable that feels like you.' }, { title: 'What if it rains?', text: 'Add your weather and rescheduling policy here.' }] })
        ];
    } else {
        brand = 'Field Notes Press'; palette = 3; action = 'Get the guide';
        sections = [
            section('hero', { eyebrow: 'A POCKET FIELD GUIDE', title: 'Learn to look a little closer.', description: 'A printable observation journal for walks, windowsills, and the patch of green outside your door.', buttonLabel: 'Peek inside', items: [] }),
            section('tabs', { title: 'Open to a sample page.', eyebrow: 'INSIDE THE GUIDE', description: '', items: [{ title: 'Look', text: 'Choose one leaf. Sketch its outline before filling in the veins.' }, { title: 'Listen', text: 'Stand still for a minute. Mark the direction of each sound on a small map.' }, { title: 'Return', text: 'Revisit the same spot next week and record a change.' }] }),
            section('pricing', { title: 'Take it on your next walk.', eyebrow: 'THE DOWNLOAD', description: 'Connect your own digital storefront to this button.', buttonLabel: action, items: [{ title: 'Printable journal', text: 'Your price' }, { title: 'Inside the file', text: 'Add your page count, paper sizes, and file format.' }] })
        ];
        sections[0].buttonHref = '#section-' + sections[1].id;
    }
    sections.push(section('contact', { title: 'Get in touch', eyebrow: brand.toUpperCase(), description: 'Questions? Reach out here.' }));
    for (const item of sections) if (item.buttonLabel === action) item.buttonHref = '#contact';
    return { ...project, goal, brand, name: starter.name, title: brand + ' — ' + starter.tag,
        description: sections[0].description, navLabel: action, footer: brand, sections,
        theme: { ...project.theme, ...PALETTES[palette], font: starter.id === 'waitlist' ? 'sans' : 'serif', buttons: starter.id === 'waitlist' ? 'pill' : 'solid' } };
}

