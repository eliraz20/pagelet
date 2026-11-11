import { isVideo, mediaSource, percent } from './photo-placement.ts';
import type { PlacedPhoto } from './photo-placement.ts';

export function videoTag(src: string, label: string, decorative = false) {
    return '<video playsinline preload="metadata" ' + (decorative ? 'muted loop data-motion aria-hidden="true" tabindex="-1"' : 'controls aria-label="' + label + '"') + ' src="' + mediaSource(src) + '"></video>';
}

export function overlayMedia(photo: PlacedPhoto | null, escape: (s: string) => string, skin = false) {
    if (!photo || !mediaSource(photo.src)) return '';
    const x = percent(photo.x), y = percent(photo.y);
    const media = isVideo(photo.src) ? videoTag(photo.src, escape(photo.alt || 'Video'), skin)
        : '<img src="' + photo.src + '" alt="' + escape(skin ? '' : photo.alt) + '">';
    return '<span class="' + (skin ? 'button-skin' : 'front-media') + '" style="--mx:' + x + '%;--my:' + y + '%">' + media + '</span>';
}

export const mediaCss = `
.front-media{position:absolute;inset:0;z-index:1;pointer-events:none}
.front-media>:is(img,video){position:absolute;left:var(--mx);top:var(--my);transform:translate(calc(-1 * var(--mx)),calc(-1 * var(--my)));width:30%;height:30%;object-fit:contain;border-radius:var(--radius)}
.front-media>video{pointer-events:auto}
.button:has(.button-skin){position:relative;isolation:isolate;overflow:hidden;color:white!important;background:#202020}
.button-skin{position:absolute;inset:0;z-index:-1;pointer-events:none;background:#222}
.button-skin>:is(img,video),.section-background-image>video{width:100%;height:100%;object-fit:cover;object-position:var(--mx) var(--my);display:block}
.button-skin:after{content:'';position:absolute;inset:0;background:#000a}
.hero-image video{width:100%;display:block;aspect-ratio:480/510;object-fit:cover;border-radius:var(--radius)}
`;
export const motionScript = `<script>(()=>{const clips=document.querySelectorAll('video[data-motion]');const motion=matchMedia('(prefers-reduced-motion: reduce)');function sync(){clips.forEach(v=>{if(motion.matches)v.pause();else v.play().catch(()=>{});});}sync();motion.addEventListener('change',sync);})();</script>`;

