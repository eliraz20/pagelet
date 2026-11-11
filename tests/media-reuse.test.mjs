import test from 'node:test';
import assert from 'node:assert/strict';
import { createProject, parseProject } from '../lib/page-model.ts';
import { placePhoto, replaceMedia } from '../lib/photo-placement.ts';
import { mergeUploads, pageUploads, recentUploads, rememberUploads } from '../lib/recent-uploads.ts';
import { pageFiles } from '../lib/export-bundle.ts';

const still = 'data:image/png;base64,QUJD';
const clip = 'data:video/mp4;base64,REVG';

test('replacing a hero keeps independent device crops and leaves other uses of the original intact', () => {
    const project = createProject();
    const hero = project.sections[0];
    const slot = { id:hero.id, role:'hero' };
    let placed = placePhoto(project,{ ...slot, src:still, alt:'Petals', x:12, y:37 });
    placed.sections[0].mobile = { ...hero.mobile, imageX:81, imageY:95 };
    placed = placePhoto(placed,{ id:project.sections[1].id, role:'front', src:still, alt:'Petals', x:5, y:20 });
    const swapped = replaceMedia(placed,slot,clip);
    assert.deepEqual(swapped.sections[0],{ ...placed.sections[0], image:clip });
    assert.equal(placed.sections[0].image,still);
    assert.equal(swapped.sections[1],placed.sections[1]);
    const restored = parseProject(JSON.parse(JSON.stringify(swapped)));
    assert.equal(restored.sections[0].mobile.imageX,81);
    const html = pageFiles(restored)['index.html'];
    assert.ok(html.includes(clip) && html.includes(still));
});

test('background replacement preserves tint, position, opacity and repeat settings for photos', () => {
    const p = createProject(), first = p.sections[0], target = {id:first.id,role:'background'};
    first.background = { ...first.background,kind:'upload',image:still,position:'top left',fit:'tile',tileSize:72,opacity:45,overlayOpacity:25 };
    const next = replaceMedia(p,target,'data:image/webp;base64,QUJD').sections[0];
    assert.deepEqual(next.background,{...first.background,image:'data:image/webp;base64,QUJD'});
    assert.deepEqual(replaceMedia(p,target,clip).sections[0].background,{...first.background,image:clip,fit:'cover'});
});

test('a button skin swap preserves its label, link, focal point and neighboring media', () => {
    const p=createProject(), id=p.sections[0].id;
    const placed=placePhoto(p,{id,role:'button',src:clip,alt:'',x:30,y:60});
    const next=replaceMedia(placed,{id,role:'button'},still);
    assert.deepEqual(next.sections[0],{...placed.sections[0],buttonPhoto:{...placed.sections[0].buttonPhoto,src:still}});
    assert.equal(replaceMedia(placed,{id,role:'front'},still),placed);
});

test('recent media deduplicates files across names, bounds history and works without browser storage', async () => {
    const batch = Array.from({length:10},(_,i)=>({ name:'Shot '+i, src:'data:image/jpeg;base64,'+Buffer.from('photo'+i).toString('base64') }));
    const renamed={...batch[2],name:'Cover photo'};
    const list=mergeUploads([renamed,{name:'Invalid',src:'data:text/plain;base64,AAAA'}],batch);
    assert.equal(list.length,8);
    assert.equal(list[0].name,'Cover photo');
    assert.equal(list.filter(entry=>entry.src===renamed.src).length,1);
    rememberUploads(batch);
    rememberUploads([renamed]);
    assert.deepEqual(await recentUploads(),list);
    const p=createProject();
    assert.ok(!JSON.stringify(pageFiles(p)).includes(renamed.src));
});

test('existing draft and gallery media can be reused in an image-only picker', () => {
    const p=createProject('sessions');
    p.sections[0].image=clip;
    const gallery=p.sections.find(s=>s.type==='gallery');
    gallery.gallery[0].src=still;
    const imported=parseProject(p);
    assert.deepEqual(pageUploads(imported,true).map(i=>i.src),[still]);
    assert.ok(pageUploads(imported).some(i=>i.src===clip));
});

