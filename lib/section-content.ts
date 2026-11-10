import type { Section } from './page-model';
import { normalizeBackground, BACKGROUND_PRESETS } from './backgrounds.ts';
import { normalizeContact, contactHref, SOCIAL_FIELDS } from './socials.ts';
const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const paths: Record<string, string> = {
    email: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
    phone: '<path d="M5 3h4l2 5-3 2c2 4 3 5 7 7l2-3 4 2v4c0 2-4 2-7 0C6 15 2 8 3 5c0-1 1-2 2-2Z"/>',
    whatsapp: '<path d="M4 18 3 22l5-2a9 9 0 1 0-4-2Z"/><path d="M8 7c0 5 4 8 8 9l1-3-3-1-1 1-2-2 1-1-1-3Z"/>',
    linkedin: '<path d="M5 10v10M5 5v.1M10 20V10h4v2c1-3 6-3 6 2v6M14 13v7"/>',
    github: '<path d="M9 19c-5 2-5-3-7-3m14 5v-4c0-1-.3-2-1-2 4 0 6-2 6-5 0-2-1-3-2-4 0-1 0-2-1-3l-4 2h-4L6 3C5 4 5 5 5 6c-1 1-2 2-2 4 0 3 2 5 6 5-1 0-1 1-1 2v4"/>',
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/>',
    x: '<path d="m4 3 16 18h-5L3 3h5Zm0 18L20 3"/>',
    facebook: '<path d="M14 22V12h4l1-4h-5V6c0-1 1-2 2-2h3V1h-4c-3 0-5 2-5 5v2H7v4h3v10"/>',
    youtube: '<rect x="2" y="5" width="20" height="14" rx="4"/><path d="m10 9 6 3-6 3Z"/>',
    tiktok: '<path d="M14 3v13a5 5 0 1 1-5-5M14 3c1 4 3 6 7 6"/>',
    website: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-5 5-5 13 0 18 5-5 5-13 0-18Z"/>',
};
function icon(platform: string) { return `<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[platform] || '<path d="M7 17 17 7M7 7h10v10"/>'}</svg>`; }
export function renderContact(section: Section, heading: string, attr: string, editable = false): string {
    const contact = normalizeContact(section.contact);
    const links = SOCIAL_FIELDS.map(field => ({ id: field.id, name: field.name, href: contactHref(field.id, contact[field.id]), value: contact[field.id] })).filter(link => link.href);
    const custom = contact.custom.map(link => ({ id: 'custom', name: link.label, href: contactHref('custom', link.url), value: link.url })).filter(link => link.name.trim() && link.href);
    return `<section ${attr} class="section contact-section"><div class="contact-intro">${heading}</div><div class="contact-links">${[...links, ...custom].map(link => `<a class="contact-link" href="${esc(link.href)}"${/^https?:/.test(link.href) ? ' target="_blank" rel="noopener noreferrer"' : ''}>${icon(link.id)}<span><strong>${esc(link.name)}</strong>${['email', 'phone'].includes(link.id) ? `<small>${esc(link.value.replace(/^(mailto:|tel:)/i, ''))}</small>` : ''}</span><span aria-hidden="true">↗</span></a>`).join('')}${!links.length && !custom.length && editable ? '<p class="contact-empty">Your links will appear here. Add your email or a social profile in the editing panel.</p>' : ''}</div></section>`;
}
export function decorateSection(section: Section, html: string, safeImage: (value: string) => string): string {
    const bg = normalizeBackground(section.background);
    let image = '';
    if (bg.kind === 'preset')
        image = BACKGROUND_PRESETS.find(p => p.id === bg.preset)?.css || '';
    if (bg.kind === 'upload') {
        const url = safeImage(bg.image).replace(/["'()\\<>]/g, char => `%${char.charCodeAt(0).toString(16)}`);
        if (url)
            image = `url("${url}")`;
    }
    if (image) {
        const size = bg.fit === 'tile' ? `${bg.tileSize}px ${bg.kind === 'upload' ? 'auto' : bg.tileSize + 'px'}` : bg.fit;
        const layer = `<div class="section-backdrop" aria-hidden="true"><div class="section-background-image" style="background-image:${esc(image)};background-size:${size};background-position:${bg.position};background-repeat:${bg.fit === 'tile' ? 'repeat' : 'no-repeat'};opacity:${bg.opacity / 100};filter:blur(${bg.blur}px)"></div><div class="section-background-tint" style="background:${bg.overlayColor};opacity:${bg.overlayOpacity / 100}"></div></div>`;
        html = html.replace('class="', 'class="has-background ').replace(/<section[^>]*>/, match => match + layer);
    }
    const reveal = section.reveal;
    if (reveal?.enabled) {
        const details = `<details class="section-reveal"${reveal.open ? ' open' : ''}><summary><span class="reveal-closed">${esc(reveal.label || 'Read more')}</span><span class="reveal-open">Show less</span><span class="reveal-plus" aria-hidden="true">+</span></summary><div class="reveal-body">${reveal.title ? `<h3>${esc(reveal.title)}</h3>` : ''}<p>${esc(reveal.text).replace(/\n/g, '<br>')}</p></div></details>`;
        html = html.replace('class="', 'class="has-reveal ').replace(/<\/section>$/, details + '</section>');
    }
    return html;
}
export const sectionContentCss = `.section{position:relative;isolation:isolate}.section-backdrop{position:absolute;inset:0;border-radius:inherit;overflow:hidden;z-index:-1;pointer-events:none}.section-background-image,.section-background-tint{position:absolute;inset:0}.section-background-image{transform:translateZ(0)}.has-background{padding-left:32px;padding-right:32px;border-radius:var(--radius)}.has-reveal{flex-wrap:wrap}.section-reveal{grid-column:1/-1;flex-basis:100%;width:100%;margin-top:30px;position:relative}.section-reveal summary{display:inline-flex;align-items:center;justify-content:space-between;gap:22px;padding:12px 18px;border:1px solid var(--line);border-radius:7px;list-style:none;font-size:12px;cursor:pointer;background:color-mix(in srgb,var(--bg) 88%,transparent);color:var(--ink)}.section-reveal summary::-webkit-details-marker{display:none}.reveal-open{display:none}.section-reveal[open] .reveal-open{display:inline}.section-reveal[open] .reveal-closed{display:none}.reveal-plus{font-size:20px;line-height:1}.section-reveal[open] .reveal-plus{transform:rotate(45deg)}.reveal-body{border-left:2px solid var(--line);padding:7px 0 7px 20px;margin-top:23px;max-width:760px}.reveal-body h3{font-size:22px;margin-bottom:13px}.reveal-body p{font-size:14px;line-height:1.9;opacity:.8}.contact-section{display:grid;grid-template-columns:1fr 1fr;gap:55px}.contact-links{display:grid;grid-template-columns:1fr 1fr;gap:10px;align-content:start}.contact-link{display:flex;align-items:center;gap:11px;border:1px solid var(--line);border-radius:var(--radius);padding:18px 15px;min-width:0;background:color-mix(in srgb,var(--bg) 90%,transparent);transition:transform .15s}.contact-link:hover{transform:translateY(-2px);background:var(--soft)}.contact-link>span:first-of-type{min-width:0}.contact-link strong{display:block;font-size:12px;font-weight:550}.contact-link small{display:block;font-size:10px;opacity:.6;overflow-wrap:anywhere;margin-top:3px}.contact-link>span:last-child{margin-left:auto;font-size:16px;opacity:.6}.contact-empty{grid-column:1/-1;border:1px dashed var(--line);padding:25px;font-size:12px;opacity:.55;border-radius:var(--radius)}@media(max-width:800px){.contact-section{gap:28px}.contact-links{grid-template-columns:1fr}}@media(max-width:580px){.contact-section{grid-template-columns:1fr;gap:28px}.contact-links{grid-template-columns:1fr 1fr}.contact-link{padding:15px 11px;gap:8px}.contact-link strong{font-size:11px}.contact-link svg{width:18px;height:18px}.has-background{padding-left:20px;padding-right:20px}.section-reveal{margin-top:24px}.reveal-body{padding-left:15px}.contact-link small{font-size:9px}}@media(max-width:340px){.contact-links{grid-template-columns:1fr}}`;
