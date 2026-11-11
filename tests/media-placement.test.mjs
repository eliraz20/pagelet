import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { createProject,parseProject } from '../lib/page-model.ts';
import { placePhoto,currentPhoto,readPhoto } from '../lib/photo-placement.ts';
import { starterIds } from '../lib/starters.ts';
import { renderPage } from '../lib/render-page.ts';
import { pageFiles } from '../lib/export-bundle.ts';
import { placementTools } from '../lib/placement-preview.ts';

const img='data:image/png;base64,AAAA';
const video='data:video/mp4;base64,AAAA';
test('purpose templates round-trip and every local action has a rendered destination',()=>{
    for(const id of starterIds){
        const p=createProject(id),html=renderPage(p);
        assert.equal(parseProject(p).template,id);
        for(const s of p.sections.filter(s=>s.buttonLabel)) assert.ok(html.includes('id="'+s.buttonHref.slice(1)+'"'));
    }
});
for(const src of [img,video,'data:video/webm;base64,AAAA']){
    test('place, move and export '+src.slice(5,15),()=>{
        const base=createProject(),hero=base.sections[0],cta=base.sections.find(s=>s.type==='cta');
        for(const role of ['front','hero','background','button']){
            const draft={id:hero.id,role,src,alt:'Outdoors',x:20,y:80};
            const placed=parseProject(placePhoto(base,draft));
            assert.deepEqual(currentPhoto(placed.sections[0],role),{src,alt:role==='background'?'':'Outdoors',x:20,y:80});
            assert.equal(currentPhoto(base.sections[0],role),null);
            const moved=placePhoto(placed,{...draft,id:cta.id,role:'button',origin:{id:hero.id,role}});
            assert.equal(currentPhoto(moved.sections[0],role),null);
            assert.equal(currentPhoto(moved.sections.find(s=>s.id===cta.id),'button').src,src);
            const html=renderPage(placed),folder=pageFiles(placed);
            assert.ok(html.includes(src));assert.ok(folder['index.html'].includes(src));assert.ok(!html.includes('placement:pick'));
            if(src.startsWith('data:video')) {
                assert.ok(/<video\b[^>]*\bplaysinline\b/.test(html));
                assert.ok(html.includes(['hero','front'].includes(role)?'controls aria-label="Outdoors"':'muted loop data-motion'));
            }
        }
    });
}
test('unavailable destinations and unsupported media leave the original project intact',()=>{
    const p=createProject(),base={id:p.sections[1].id,role:'button',src:img,x:50,y:50,alt:''};
    assert.equal(placePhoto(p,base),p);
    assert.equal(placePhoto(p,{...base,id:'gone',role:'front'}),p);
    assert.equal(readPhoto({...base,src:'data:text/html;base64,QUJD'}),null);
    assert.equal(readPhoto({...base,src:'data:video/mp4;base64,\" onload=\"'}),null);
});
test('canvas drag snaps to the grid, Alt bypasses it, and a button is a drop target',()=>{
    const listeners={},messages=[];
    const section={dataset:{section:'s1',label:'cta'},getBoundingClientRect:()=>({left:0,top:0,width:100,height:100}),querySelector:()=>button};
    const button={getBoundingClientRect:section.getBoundingClientRect};
    let onButton=false;
    const hit={closest:selector=>selector==='[data-section]'?section:selector==='a.button'&&onButton?button:null};
    const document={documentElement:{setPointerCapture(){}},elementFromPoint:()=>hit,addEventListener:(name,fn)=>listeners[name]=fn};
    vm.runInNewContext(placementTools.match(/<script>([\s\S]*)<\/script>/)[1],{document,parent:{postMessage:m=>messages.push(m)},innerHeight:480,scrollBy(){},addEventListener(){}});
    const e={button:0,pointerId:1,clientX:42,clientY:67,target:hit,preventDefault(){}};
    listeners.pointerdown(e);assert.deepEqual([messages.at(-1).x,messages.at(-1).y],[40,70]);
    onButton=true;listeners.pointermove({...e,altKey:true});
    assert.deepEqual([messages.at(-1).x,messages.at(-1).y,messages.at(-1).role],[42,67,'button']);
});

