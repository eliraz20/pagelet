import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject,makeSection,moveSection,parseProject,contrast} from '../lib/page-model.ts';
import {renderPage,safeHref,safeImage} from '../lib/render-page.ts';

test('templates are complete, independent long pages with unique section ids',()=>{
  for(const template of ['studio','product','launch']){
    const project=createProject(template),other=createProject(template);
    assert.ok(project.sections.length>=4);
    assert.equal(new Set(project.sections.map(s=>s.id)).size,project.sections.length);
    project.sections[0].title='Changed';
    assert.notEqual(other.sections[0].title,'Changed');
    assert.ok(project.sections.some(s=>s.type==='faq'));
    assert.ok(project.sections.some(s=>s.type==='cta'));
  }
});
test('reordering keeps data intact and handles list boundaries',()=>{
  const project=createProject(),id=project.sections[0].id;
  assert.equal(moveSection(project,id,-1),project);
  const moved=moveSection(project,id,2);
  assert.equal(moved.sections[2].id,id);
  assert.equal(project.sections[0].id,id);
  assert.equal(moveSection(project,'missing',1),project);
});
test('editable backup round-trips and preserves section anchors',()=>{
  const project=createProject();project.sections[0].image='data:image/png;base64,YQ==';
  const restored=parseProject(JSON.parse(JSON.stringify(project)));
  assert.equal(restored.sections[0].id,project.sections[0].id);
  assert.equal(restored.sections[0].image,project.sections[0].image);
  assert.deepEqual(restored.sections.map(s=>s.type),project.sections.map(s=>s.type));
});
test('invalid backups fail and duplicate or unsafe ids are normalized',()=>{
  assert.throws(()=>parseProject(null),/project JSON/);
  assert.throws(()=>parseProject({version:2}),/supported/);
  const project=createProject();project.theme.accent='red;}</style><script>alert(1)</script>';
  assert.throws(()=>parseProject(project),/theme colors/);
  const valid=createProject();valid.sections[1].id=valid.sections[0].id;
  valid.sections[2].id='x" onclick="alert(1)';
  const parsed=parseProject(valid);
  assert.equal(new Set(parsed.sections.map(s=>s.id)).size,parsed.sections.length);
  assert.ok(parsed.sections.every(s=>/^[a-z\d-]+$/i.test(s.id)));
  assert.throws(()=>parseProject({...createProject(),sections:[{type:'constructor'}]}),/unknown section/);
});
test('text, metadata, and links cannot inject executable HTML',()=>{
  const project=createProject();
  project.title='</title><script>alert(1)</script>';
  project.sections[0].title='<img src=x onerror=alert(1)>';
  project.sections[0].buttonHref='javascript:alert(1)';
  project.sections[0].image='data:image/svg+xml,<svg onload=alert(1)>';
  const html=renderPage(project);
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('<img src=x'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('&lt;img'));
  assert.ok(!html.includes('href="javascript:'));
  assert.ok(!html.includes('src="data:image/svg'));
});
test('exports omit hidden sections and editor scripts and retain working FAQ markup',()=>{
  const project=createProject();project.sections[1].hidden=true;
  const html=renderPage(project);
  assert.ok(!html.includes(`data-section="${project.sections[1].id}"`));
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('pagelet:select'));
  assert.ok(html.includes('<details><summary>'));
  assert.ok(html.includes('id="contact"'));
  assert.ok(html.includes('@media(max-width:580px)'));
  assert.equal((html.match(/<h1>/g)||[]).length,1);
  const reordered=moveSection(project,project.sections[0].id,2);
  assert.equal((renderPage(reordered).match(/<h1>/g)||[]).length,1);
});
test('all section types render, including empty pages and duplicate calls to action',()=>{
  const project=createProject();project.sections=['hero','features','steps','quote','pricing','faq','cta','cta'].map(makeSection);
  const html=renderPage(project);
  assert.equal((html.match(/id="contact"/g)||[]).length,1);
  assert.equal((html.match(/<section /g)||[]).length,8);
  assert.ok(renderPage({...project,sections:[]}).includes('Add a section'));
});
test('link and image allowlists reject script schemes and preserve useful destinations',()=>{
  for(const value of ['javascript:alert(1)','data:text/html,bad','//evil.test','https://a.test/\nfoo'])assert.equal(safeHref(value),'#');
  assert.equal(safeHref('#contact'),'#contact');
  assert.equal(safeHref('mailto:hello@example.com'),'mailto:hello@example.com');
  assert.equal(safeHref('https://example.com'),'https://example.com/');
  assert.equal(safeImage('data:image/svg+xml;base64,YQ=='),'');
  assert.equal(safeImage('data:image/png;base64,YQ=='),'data:image/png;base64,YQ==');
});
test('contrast provides useful readability feedback',()=>{
  assert.equal(contrast('#000000','#ffffff'),21);
  assert.equal(contrast('#ffffff','#ffffff'),1);
});
