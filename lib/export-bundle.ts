import { renderPage } from './render-page.ts';
import type { Project } from './page-model.ts';

/** Separate assets for people who want a small, editable website folder. */
export function pageFiles(project: Project): Record<string, string> {
    let html = renderPage(project);
    const styles = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
    html = html.replace(/<style>[\s\S]*?<\/style>/g, '<link rel="stylesheet" href="./styles.css">').replace(/<script>[\s\S]*?<\/script>/g, '');
    if (scripts) html = html.replace('</body>', '<script src="./page.js" defer></script></body>');
    return { 'index.html': html, 'styles.css': styles, ...(scripts ? { 'page.js': scripts } : {}), 'README.txt': 'Your Pagelet website\n\nOpen index.html in a browser, or upload this folder to a static host.\nKeep all files together. Uploaded images are embedded in the HTML and CSS.\nButtons use the destinations you provided. There is no built-in form collection, payment processing, or analytics.\nKeep an editable .pagelet.json backup to continue editing in Pagelet.\n' };
}

/** ZIP STORE writer: UTF-8 filenames, CRC-32, no dependencies or network. */
export function zipFiles(files: Record<string, string>): Uint8Array {
    const encoder = new TextEncoder(), local: Uint8Array[] = [], central: Uint8Array[] = [];
    let offset = 0;
    const crc = (data: Uint8Array) => {
        let value = 0xffffffff;
        for (const byte of data) { value ^= byte; for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0); }
        return (value ^ 0xffffffff) >>> 0;
    };
    for (const [filename, text] of Object.entries(files)) {
        const name = encoder.encode(filename), data = encoder.encode(text), checksum = crc(data);
        const header = new Uint8Array(30 + name.length), view = new DataView(header.buffer);
        view.setUint32(0, 0x04034b50, true); view.setUint16(4, 20, true); view.setUint16(6, 0x800, true); view.setUint16(12, 33, true);
        view.setUint32(14, checksum, true); view.setUint32(18, data.length, true); view.setUint32(22, data.length, true); view.setUint16(26, name.length, true); header.set(name, 30);
        const entry = new Uint8Array(46 + name.length), directory = new DataView(entry.buffer);
        directory.setUint32(0, 0x02014b50, true); directory.setUint16(4, 20, true); directory.setUint16(6, 20, true); directory.setUint16(8, 0x800, true); directory.setUint16(14, 33, true);
        directory.setUint32(16, checksum, true); directory.setUint32(20, data.length, true); directory.setUint32(24, data.length, true); directory.setUint16(28, name.length, true); directory.setUint32(42, offset, true); entry.set(name, 46);
        local.push(header, data); central.push(entry); offset += header.length + data.length;
    }
    const directorySize = central.reduce((sum, item) => sum + item.length, 0), end = new Uint8Array(22), view = new DataView(end.buffer);
    view.setUint32(0, 0x06054b50, true); view.setUint16(8, central.length, true); view.setUint16(10, central.length, true); view.setUint32(12, directorySize, true); view.setUint32(16, offset, true);
    const output = new Uint8Array(offset + directorySize + end.length);
    let cursor = 0; for (const chunk of [...local, ...central, end]) { output.set(chunk, cursor); cursor += chunk.length; }
    return output;
}
