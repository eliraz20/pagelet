import { MAX_VIDEO_BYTES } from './photo-placement.ts';
export const mediaAccept = 'image/jpeg,image/png,image/webp,video/mp4,video/webm,.mp4,.webm';
export async function readMedia(file: File) {
    const type=file.type || (/\.mp4$/i.test(file.name)?'video/mp4':/\.webm$/i.test(file.name)?'video/webm':'');
    const video=type==='video/mp4'||type==='video/webm';
    if (!video && !['image/jpeg','image/png','image/webp'].includes(type)) throw Error('Choose a PNG, JPEG, WebP, MP4, or WebM file.');
    if (!file.size || file.size > (video?MAX_VIDEO_BYTES:1500*1024)) throw Error(video?'Choose a video up to 12 MiB.':'Choose an image up to 1.5 MB.');
    const blob=file.type?file:file.slice(0,file.size,type);
    if (video) {
        const player=document.createElement('video'), url=URL.createObjectURL(blob);
        try {
            await new Promise<void>((resolve,reject)=>{
                const timer=setTimeout(()=>reject(Error('The video did not load. Try an H.264 MP4.')),12000);
                player.onloadeddata=()=>{clearTimeout(timer);resolve();};
                player.onerror=()=>{clearTimeout(timer);reject(Error('This browser could not play the clip. Try an H.264 MP4.'));};
                player.muted=true;player.playsInline=true;player.preload='auto';player.src=url;
            });
        } finally { player.onloadeddata=player.onerror=null;player.removeAttribute('src');player.load();URL.revokeObjectURL(url); }
    }
    return new Promise<string>((resolve,reject)=>{
        const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(Error('The file could not be read.'));reader.readAsDataURL(blob);
    });
}

