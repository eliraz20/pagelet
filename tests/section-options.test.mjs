import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject,makeSection,parseProject} from '../lib/page-model.ts';
import {BACKGROUND_PRESETS,normalizeBackground} from '../lib/backgrounds.ts';
import {contactHref,SOCIAL_FIELDS} from '../lib/socials.ts';
import {renderPage} from '../lib/render-page.ts';

test('contact usernames become profile links and blank or unsafe inputs are omitted',()=>{
 assert.equal(contactHref('github','@octocat'),'https://github.com/octocat');
 assert.equal(contactHref('instagram','your.name'),'https://www.instagram.com/your.name');
 assert.equal(contactHref('whatsapp','+1 (555) 123-4567'),'https://wa.me/15551234567');
 assert.equal(contactHref('email','you@example.org'),'mailto:you@example.org');
 assert.equal(contactHref('phone','+1 555 123-4567'),'tel:+15551234567');
 assert.equal(contactHref('website','example.org'),'https://example.org/');
 for(const field of SOCIAL_FIELDS){assert.equal(contactHref(field.id,''),'');assert.equal(contactHref(field.id,'javascript:alert(1)'),'');}
});
test('contact export renders only valid filled-in links, escapes labels, and owns #contact',()=>{
 const project=createProject(),contact=project.sections.find(s=>s.type==='contact');
 contact.contact.github='octocat';contact.contact.email='you@example.org';
 contact.contact.linkedin='javascript:bad';contact.contact.custom=[{label:'<script>My booking page</script>',url:'https://example.org/book'}];
 const html=renderPage(project);
 assert.ok(html.includes('href="https://github.com/octocat"'));
 assert.ok(html.includes('href="mailto:you@example.org"'));
 assert.ok(!html.includes('<strong>Instagram</strong>'));
 assert.ok(!html.includes('<strong>LinkedIn</strong>'));
 assert.ok(html.includes('&lt;script&gt;My booking page&lt;/script&gt;'));
 assert.equal((html.match(/id="contact"/g)||[]).length,1);
 assert.ok(html.includes(`id="contact" data-section="${contact.id}"`));
 assert.ok(!html.includes('<script>'));
});
test('older version-one drafts migrate without changing content or section order',()=>{
 const original=createProject();for(const section of original.sections){delete section.background;delete section.contact;delete section.reveal;}
 const parsed=parseProject(original);
 assert.deepEqual(parsed.sections.map(s=>s.id),original.sections.map(s=>s.id));
 assert.equal(parsed.sections[0].title,original.sections[0].title);
 assert.equal(parsed.sections[0].background.kind,'none');
 assert.equal(parsed.sections[0].contact.email,'');
 assert.equal(parsed.sections[0].reveal.enabled,false);
});
test('background controls are bounded and untrusted CSS values are not accepted',()=>{
 const bg=normalizeBackground({kind:'preset',preset:'bad',fit:'bad',position:'center;display:none',opacity:500,blur:-10,tileSize:Infinity,overlayColor:'red; color: transparent',overlayOpacity:-80});
 assert.equal(bg.preset,'dots');assert.equal(bg.fit,'cover');assert.equal(bg.position,'center');assert.equal(bg.opacity,100);assert.equal(bg.blur,0);assert.equal(bg.tileSize,240);assert.equal(bg.overlayColor,'#ffffff');assert.equal(bg.overlayOpacity,0);
});
test('all built-in backgrounds export without remote assets and retain opacity/tile controls',()=>{
 for(const preset of BACKGROUND_PRESETS){
  const project=createProject(),section=project.sections[0];
  section.background={...section.background,kind:'preset',preset:preset.id,fit:'tile',tileSize:128,opacity:42,blur:3,overlayOpacity:25};
  const html=renderPage(project);
  assert.ok(html.includes('section-background-image'));
  assert.ok(html.includes('background-size:128px 128px'));
  assert.ok(html.includes('background-repeat:repeat;opacity:0.42;filter:blur(3px)'));
  assert.ok(html.includes('background:#ffffff;opacity:0.25'));
  assert.ok(!html.includes('src="http'));
 }
});
test('uploaded raster backgrounds stay embedded, preserve aspect ratio when tiled, and cannot inject CSS',()=>{
 const project=createProject(),section=project.sections[0];
 section.background={...section.background,kind:'upload',image:'data:image/png;base64,YQ==',fit:'tile',tileSize:180,opacity:20};
 let html=renderPage(project);
 assert.ok(html.includes('data:image/png;base64,YQ=='));
 assert.ok(html.includes('background-size:180px auto'));
 section.background.image='https://example.org/a");color:red;/*';
 html=renderPage(project);
 assert.ok(!html.includes('url(&quot;https://example.org/a&quot;);color:red'));
 section.background.image='data:image/svg+xml,<svg onload=alert(1)>';
 html=renderPage(project);assert.ok(!html.includes('section-backdrop"'));
});
test('read-more exports use native details and keep user content escaped',()=>{
 const project=createProject(),section=project.sections[0];
 section.reveal={enabled:true,label:'Read the story',title:'Extra context',text:'First line\n<script>unsafe()</script>',open:false};
 const html=renderPage(project);
 assert.ok(html.includes('<details class="section-reveal"><summary>'));
 assert.ok(html.includes('Read the story'));
 assert.ok(html.includes('First line<br>&lt;script&gt;unsafe()&lt;/script&gt;'));
 assert.ok(!html.includes('<script>'));
 section.reveal.open=true;assert.ok(renderPage(project).includes('<details class="section-reveal" open>'));
 section.reveal.enabled=false;assert.ok(!renderPage(project).includes('Read the story'));
});
test('background, disclosure, and social settings survive editable project round trips',()=>{
 const project=createProject(),section=project.sections[0],contact=project.sections.find(s=>s.type==='contact');
 section.background={...section.background,kind:'preset',preset:'waves',fit:'tile',tileSize:160,opacity:75};
 section.reveal={enabled:true,label:'Explore',title:'Story',text:'Detail',open:true};
 contact.contact.youtube='@mychannel';
 const restored=parseProject(JSON.parse(JSON.stringify(project)));
 assert.deepEqual(restored.sections[0].background,section.background);
 assert.deepEqual(restored.sections[0].reveal,section.reveal);
 assert.equal(restored.sections.find(s=>s.type==='contact').contact.youtube,'@mychannel');
});
