import test from 'node:test';
import assert from 'node:assert/strict';
import { createProject, makeSection, parseProject } from '../lib/page-model.ts';
import { GOALS, createGoalProject, nextLook, checkPage } from '../lib/page-guidance.ts';
import { renderPage } from '../lib/render-page.ts';
import { pageFiles, zipFiles } from '../lib/export-bundle.ts';
import vm from 'node:vm';

test('each page goal creates its suggested story and wires every main button to the supplied destination', () => {
    for (const goal of GOALS) {
        const project = createGoalProject(goal.id, 'Aster', 'A clear offer.', 'https://aster.test/start');
        assert.equal(project.goal, goal.id);
        assert.equal(project.brand, 'Aster');
        assert.equal(project.sections[0].title, 'A clear offer.');
        assert.deepEqual(project.sections.map(s => s.type), [...goal.order]);
        assert.ok(project.sections.filter(s => ['hero','cta','pricing'].includes(s.type)).every(s => s.buttonHref === project.navHref));
        assert.equal(project.navHref, 'https://aster.test/start');
        assert.equal(parseProject(JSON.parse(JSON.stringify(project))).goal, goal.id);
    }
    const project = createGoalProject('inquiries', '  Aster  ', 'Offer', '');
    assert.equal(project.navHref, '#contact');
    assert.ok(project.sections.some(s => s.type === 'contact'));
});

test('old projects retain content, with independent normalized mobile settings and safe design defaults', () => {
    const old = createProject();
    delete old.goal; delete old.theme.spacing; delete old.theme.buttons;
    for (const section of old.sections) { delete section.layout; delete section.mobile; delete section.imageX; delete section.imageY; }
    const restored = parseProject(old);
    assert.equal(restored.theme.spacing, 'comfortable');
    assert.equal(restored.theme.buttons, 'solid');
    assert.equal(restored.sections[0].layout, 'standard');
    assert.equal(restored.sections[0].title, old.sections[0].title);
    assert.deepEqual(restored.sections[0].mobile, {hidden:false,titleSize:0,imageX:50,imageY:50});
    restored.sections[0].mobile.hidden = true;
    assert.equal(restored.sections[1].mobile.hidden, false);
});

test('layout, crop and mobile settings round trip and hostile values cannot reach exported CSS', () => {
    const project = createProject(), section = project.sections[0];
    section.layout = 'centered'; section.imageX = 20; section.imageY = 80;
    section.mobile = {hidden:true,titleSize:36,imageX:75,imageY:25};
    project.theme.spacing = 'airy'; project.theme.buttons = 'outline';
    const restored = parseProject(project);
    assert.deepEqual(restored.sections[0].mobile, section.mobile);
    assert.equal(restored.sections[0].layout, 'centered');
    const html = renderPage(restored);
    assert.ok(html.includes('layout-centered hero section'));
    assert.ok(html.includes('object-position:20% 80%'));
    assert.ok(html.includes('object-position:75% 25%'));
    assert.ok(html.includes('font-size:36px'));
    assert.ok(html.includes('display:none!important'));
    Object.assign(section, {layout:'</style><script>bad()</script>',imageX:Infinity,imageY:'red;'});
    section.mobile = {hidden:'yes',titleSize:1000,imageX:-100,imageY:NaN};
    project.theme.spacing = 'bad'; project.theme.buttons = 'bad';
    const normalized = parseProject(project).sections[0];
    assert.equal(normalized.layout,'standard'); assert.equal(normalized.imageX,50);
    assert.deepEqual(normalized.mobile,{hidden:false,titleSize:72,imageX:0,imageY:50});
    assert.ok(!renderPage(parseProject(project)).includes('bad()'));
});

test('trying another look preserves all content and mobile settings without mutating the original', () => {
    const project = createProject(), before = JSON.stringify(project), next = nextLook(project);
    assert.notEqual(next.theme.accent, project.theme.accent);
    assert.notEqual(next.theme.font, project.theme.font);
    assert.equal(next.sections, project.sections);
    assert.equal(next.name, project.name);
    assert.equal(JSON.stringify(project), before);
});

test('pre-export checks locate invalid buttons, missing anchors and mobile-hidden destinations', () => {
    const project = createProject();
    project.sections[0].buttonHref = 'javascript:alert(1)';
    project.navHref = '#missing';
    const contact = project.sections.find(s => s.type === 'contact');
    contact.mobile.hidden = true;
    const cta = project.sections.find(s => s.type === 'cta'); cta.buttonHref = '#contact';
    let issues = checkPage(project);
    assert.ok(issues.some(i => i.sectionId === project.sections[0].id && /valid destination/.test(i.message)));
    assert.ok(issues.some(i => i.panel === 'settings' && /missing or hidden/.test(i.message)));
    assert.ok(issues.some(i => i.sectionId === cta.id && /hidden on mobile/.test(i.message)));
    contact.hidden = true; cta.hidden = true;
    issues = checkPage(project);
    assert.ok(!issues.some(i => i.sectionId === contact.id || i.sectionId === cta.id));
});

test('pre-export checks cover empty and invalid contact methods, alt text, placeholders, and contrast', () => {
    const project = createProject(), hero = project.sections[0], contact = project.sections.find(s => s.type === 'contact');
    hero.image = 'data:image/png;base64,YQ=='; hero.items[0].text = '';
    contact.contact.email = 'not an email';
    project.theme.text = project.theme.background;
    const issues = checkPage(project);
    assert.ok(issues.some(i => i.sectionId === hero.id && /Describe the hero image/.test(i.message)));
    assert.ok(issues.some(i => i.sectionId === contact.id && /Email: correct/.test(i.message)));
    assert.ok(issues.some(i => i.panel === 'design' && /contrast/.test(i.message)));
    assert.ok(issues.some(i => /sample destination/.test(i.message)));
    contact.contact.email = '';
    assert.ok(checkPage(project).some(i => i.sectionId === contact.id && /at least one contact/.test(i.message)));
    contact.contact.email = 'hello@aster.test';
    assert.ok(!checkPage(project).some(i => i.sectionId === contact.id));
});

test('inline editing attributes and event bridge exist only in editor previews', () => {
    const project = createProject(), editor = renderPage(project,{editable:true}), exported = renderPage(project);
    for (const field of ['title','description','eyebrow','buttonLabel']) assert.ok(editor.includes(`data-edit="${field}"`));
    assert.ok(editor.includes('contenteditable="plaintext-only"'));
    assert.ok(editor.includes("type:'pagelet:edit'"));
    assert.ok(!exported.includes('contenteditable'));
    assert.ok(!exported.includes('pagelet:edit'));
    for (const script of [...editor.matchAll(/<script>([\s\S]*?)<\/script>/g)]) assert.doesNotThrow(() => new vm.Script(script[1]));
});

test('website folder separates assets and includes runtime only when the exported page needs it', () => {
    const project = createProject(), files = pageFiles(project);
    assert.deepEqual(Object.keys(files),['index.html','styles.css','README.txt']);
    assert.ok(files['index.html'].includes('href="./styles.css"'));
    assert.ok(!files['index.html'].includes('<style>'));
    assert.ok(files['styles.css'].includes('@media(max-width:580px)'));
    project.sections.push(makeSection('tabs'));
    const interactive = pageFiles(project);
    assert.ok(interactive['page.js']);
    assert.ok(interactive['index.html'].includes('<script src="./page.js" defer></script>'));
    assert.doesNotThrow(() => new vm.Script(interactive['page.js']));
    assert.ok(!interactive['page.js'].includes('pagelet:edit'));
});

test('ZIP stores Unicode contents in matching local headers, directory and end record', () => {
    const files = {'index.html':'<!doctype html>你好 ✳','styles.css':'body{color:#234}'}, zip = zipFiles(files), view = new DataView(zip.buffer);
    assert.equal(view.getUint32(0,true),0x04034b50);
    let position = 0;
    for (const [name, text] of Object.entries(files)) {
        const size=view.getUint32(position+18,true), nameSize=view.getUint16(position+26,true);
        assert.equal(view.getUint16(position+6,true),0x800);
        assert.equal(new TextDecoder().decode(zip.slice(position+30,position+30+nameSize)),name);
        assert.equal(new TextDecoder().decode(zip.slice(position+30+nameSize,position+30+nameSize+size)),text);
        position += 30 + nameSize + size;
    }
    assert.equal(view.getUint32(position,true),0x02014b50);
    assert.equal(view.getUint32(zip.length-22,true),0x06054b50);
    assert.equal(view.getUint16(zip.length-12,true),2);
    assert.equal(view.getUint32(zip.length-6,true),position);
});
