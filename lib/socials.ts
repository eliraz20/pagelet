export const SOCIAL_FIELDS = [
    { id: 'email', name: 'Email', hint: 'you@example.com' },
    { id: 'phone', name: 'Phone', hint: '+1 555 123 4567' },
    { id: 'whatsapp', name: 'WhatsApp', hint: 'Phone with country code, or a wa.me link' },
    { id: 'linkedin', name: 'LinkedIn', hint: 'Your profile URL or profile name' },
    { id: 'github', name: 'GitHub', hint: 'Your username or profile URL' },
    { id: 'instagram', name: 'Instagram', hint: '@yourname or profile URL' },
    { id: 'x', name: 'X', hint: '@yourname or profile URL' },
    { id: 'facebook', name: 'Facebook', hint: 'Your page name or profile URL' },
    { id: 'youtube', name: 'YouTube', hint: '@yourchannel or channel URL' },
    { id: 'tiktok', name: 'TikTok', hint: '@yourname or profile URL' },
    { id: 'website', name: 'Website', hint: 'https://your-site.com' },
] as const;
export type SocialPlatform = typeof SOCIAL_FIELDS[number]['id'];
export type Contact = Record<SocialPlatform, string> & {
    custom: {
        label: string;
        url: string;
    }[];
};
export function defaultContact(): Contact { return Object.fromEntries([...SOCIAL_FIELDS.map(f => [f.id, '']), ['custom', []]]) as Contact; }
export function normalizeContact(input: unknown): Contact {
    const contact = defaultContact();
    if (!input || typeof input !== 'object')
        return contact;
    const value = input as Record<string, unknown>;
    for (const field of SOCIAL_FIELDS)
        contact[field.id] = typeof value[field.id] === 'string' ? String(value[field.id]).slice(0, 2000) : '';
    if (Array.isArray(value.custom))
        contact.custom = value.custom.slice(0, 6).filter(item => item && typeof item === 'object').map(item => ({ label: typeof item.label === 'string' ? item.label.slice(0, 100) : '', url: typeof item.url === 'string' ? item.url.slice(0, 2000) : '' }));
    return contact;
}
export function contactHref(platform: SocialPlatform | 'custom', input: string): string {
    const value = input.trim();
    if (!value || /[\u0000-\u001f\u007f]/.test(value))
        return '';
    if (platform === 'email') {
        const address = value.replace(/^mailto:/i, '');
        return /^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(address) ? `mailto:${address}` : '';
    }
    if (platform === 'phone') {
        const phone = value.replace(/^tel:/i, '').replace(/[\s().-]/g, '');
        return /^\+?\d{6,15}$/.test(phone) ? `tel:${phone}` : '';
    }
    if (/^https?:\/\//i.test(value)) {
        try {
            const url = new URL(value);
            return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
        }
        catch {
            return '';
        }
    }
    if (platform === 'whatsapp') {
        const phone = value.replace(/[\s()+.-]/g, '');
        return /^\d{6,15}$/.test(phone) ? `https://wa.me/${phone}` : '';
    }
    if (platform === 'website' || platform === 'custom') {
        if (!/^[\w-]+(?:\.[\w-]+)+(?:[/:?#].*)?$/.test(value))
            return '';
        try {
            return new URL(`https://${value}`).href;
        }
        catch {
            return '';
        }
    }
    const handle = value.replace(/^@/, '');
    if (!/^[a-z\d_.-]{1,100}$/i.test(handle))
        return '';
    const prefix = { linkedin: 'https://www.linkedin.com/in/', github: 'https://github.com/', instagram: 'https://www.instagram.com/', x: 'https://x.com/', facebook: 'https://www.facebook.com/', youtube: 'https://www.youtube.com/@', tiktok: 'https://www.tiktok.com/@' };
    return `${prefix[platform]}${encodeURIComponent(handle)}`;
}
