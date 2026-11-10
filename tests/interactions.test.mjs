import test from 'node:test';
import assert from 'node:assert/strict';
import {Script} from 'node:vm';
import {createProject,makeSection,parseProject} from '../lib/page-model.ts';
import {defaultSticky,normalizeGallery} from '../lib/interactive-model.ts';
import {renderPage} from '../lib/render-page.ts';

test('tab exports contain linked accessible panels and include their self-contained runtime',()=>{
 const project=createProject(),tabs=makeSection('tabs');project.sections.push(tabs);
 tabs.items[1]={title:'Pricing',text:'One plan\n<script>bad()</script>'};
 const html=renderPage(project);
 assert.equal((html.match(/role="tab" id=/g)||[]).length,3);
 assert.equal((html.match(/role="tabpanel" id=/g)||[]).length,3);
 assert.ok(html.includes(`aria-controls="panel-${tabs.id}-1"`));
 assert.ok(html.includes('One plan<br>&lt;script&gt;bad()&lt;/script&gt;'));
 assert.ok(!html.includes('<script>bad()'));
 assert.ok(html.includes("event.key==='ArrowRight'"));
 for(const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g))assert.doesNotThrow(()=>new Script(match[1]));
});
test('multiple galleries share one lightbox and omit unsafe image sources',()=>{
 const project=createProject(),first=makeSection('gallery'),second=makeSection('gallery');
 second.gallery=[{id:'bad',src:'javascript:alert(1)',alt:'Bad',caption:'Bad',preset:''}];
 first.gallery[0].caption='</p><script>bad()</script>';
 project.sections.push(first,second);
 const html=renderPage(project);
 assert.equal((html.match(/data-pagelet-lightbox aria-label/g)||[]).length,1);
 assert.equal((html.match(/data-gallery-item data-interactive/g)||[]).length,3);
 assert.ok(!html.includes('src="javascript:'));
 assert.ok(html.includes('&lt;/p&gt;&lt;script&gt;bad()&lt;/script&gt;'));
 assert.ok(html.includes('aria-label="Close image viewer"'));
 assert.ok(html.includes("if(e.key==='ArrowLeft')"));
});
test('gallery images and display options round-trip, with bounded lists and unique ids',()=>{
 const project=createProject(),gallery=makeSection('gallery');gallery.galleryColumns=2;
 gallery.gallery.push({id:'upload',src:'data:image/png;base64,YQ==',alt:'A sample image',caption:'Caption',preset:''});project.sections.push(gallery);
 const restored=parseProject(JSON.parse(JSON.stringify(project))).sections.at(-1);
 assert.equal(restored.galleryColumns,2);assert.deepEqual(restored.gallery,gallery.gallery);
 const normalized=normalizeGallery(Array.from({length:20},()=>({id:'duplicate',src:'',alt:'',caption:'',preset:'unknown'})));
 assert.equal(normalized.length,12);assert.equal(new Set(normalized.map(i=>i.id)).size,12);assert.ok(normalized.every(i=>i.preset===''));
});
test('sticky buttons render only when enabled and safe, with placement and visibility options',()=>{
 const project=createProject();assert.ok(!renderPage(project).includes('<a class="pagelet-sticky'));
 project.stickyContact={...defaultSticky(),enabled:true,label:'Talk to me',position:'left',visibility:'after-scroll',mobileOnly:true};
 let html=renderPage(project);
 assert.ok(html.includes('class="pagelet-sticky sticky-left sticky-mobile-only" href="#contact" data-sticky-after-scroll'));
 assert.ok(html.includes('scrollY>240'));
 project.stickyContact.href='javascript:alert(1)';html=renderPage(project);assert.ok(!html.includes('<a class="pagelet-sticky'));
});
test('old drafts get opt-in defaults while new options survive import and undo-compatible copies',()=>{
 const original=createProject();delete original.stickyContact;for(const section of original.sections){delete section.gallery;delete section.galleryColumns;}
 const restored=parseProject(original);assert.deepEqual(restored.stickyContact,defaultSticky());assert.ok(restored.sections.every(s=>s.gallery.length===0&&s.galleryColumns===3));
 restored.stickyContact={...restored.stickyContact,enabled:true,href:'https://example.org/book',position:'left'};
 assert.deepEqual(parseProject(JSON.parse(JSON.stringify(restored))).stickyContact,restored.stickyContact);
});
test('hidden interactive sections do not add lightboxes or scripts to otherwise static exports',()=>{
 const project=createProject(),gallery=makeSection('gallery'),tabs=makeSection('tabs');gallery.hidden=true;tabs.hidden=true;project.sections.push(gallery,tabs);
 const html=renderPage(project);assert.ok(!html.includes('<script>'));assert.ok(!html.includes('data-pagelet-lightbox aria-label'));
});
