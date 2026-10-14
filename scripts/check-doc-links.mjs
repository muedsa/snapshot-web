import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { resolve, join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// 检查生产 HTML 中的站内链接、锚点与 src 资源；不请求外链。
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const root = resolve(repo, 'dist');
const site = 'https://snapshot.muedsa.com';
if (!existsSync(root)) throw new Error('没有 dist，请先执行 pnpm build');
const pages = readdirSync(root, { recursive: true }).filter(name => name.endsWith('.html'));
if (!pages.length) throw new Error('dist 中没有 HTML 页面');
const seen = new Set(), ids = new Map(), failures = [];
let anchors = 0;
for (const page of pages) {
  // canonical 是部署 URL 元数据，不是可点击链接；Starlight 的 404 canonical
  // 为 /404/，实际静态错误页为 404.html，不要求两者是同一个磁盘文件。
  const html = readFileSync(join(root, page), 'utf8').replace(/<link\b[^>]*\brel="canonical"[^>]*>/g, '');
  const base = new URL(page.replaceAll('\\', '/'), `${site}/`);
  for (const [, attribute, rawValue] of html.matchAll(/\b(href|src)="([^"]+)"/g)) {
    const value = rawValue.replaceAll('&amp;', '&');
    let url;
    try { url = new URL(value, base); }
    catch { failures.push(`${page}: 无效 URL ${value}`); continue; }
    if (url.origin !== site) continue;
    const path = decodeURIComponent(url.pathname).slice(1);
    let target = resolve(root, path);
    if (relative(root, target).startsWith('..')) { failures.push(`${page}: 越界路径 ${value}`); continue; }
    if (existsSync(target) && statSync(target).isDirectory()) target = join(target, 'index.html');
    const key = `${attribute}:${target}${url.hash}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (!existsSync(target)) { failures.push(`${page}: 找不到 ${value}`); continue; }
    if (attribute === 'href' && url.hash && target.endsWith('.html')) {
      if (!ids.has(target)) ids.set(target, new Set([...readFileSync(target, 'utf8').matchAll(/\bid="([^"]+)"/g)].map(m => m[1])));
      if (!ids.get(target).has(decodeURIComponent(url.hash.slice(1)))) failures.push(`${page}: 找不到锚点 ${value}`);
      anchors++;
    }
  }
}
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
else console.log(`PASS: ${pages.length} 个页面，${seen.size} 个站内链接/资源目标，${anchors} 个锚点`);
