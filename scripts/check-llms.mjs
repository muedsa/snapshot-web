import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { parse as parseYaml } from 'yaml';

// 检查真实构建产物，避免插件升级后无声丢失示例、表格或提示。
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const root = join(repo, 'dist');
const sourceRoot = join(repo, 'src/content/docs');
const site = 'https://snapshot.muedsa.com';
const parser = unified().use(remarkParse).use(remarkGfm);
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const read = path => readFileSync(path, 'utf8');
if (!existsSync(join(root, 'llms.txt'))) throw new Error('没有 AI 文档产物，请先执行 pnpm build');

function nodes(tree, type) {
  return [
    ...(tree.type === type ? [tree] : []),
    ...(tree.children ?? []).flatMap(child => nodes(child, type)),
  ];
}

function content(node) {
  return node.value ?? (node.children ?? []).map(content).join('');
}

function codeBlocks(tree) {
  // Expressive Code 会增加空行。仅忽略空白行和行尾空格，保留语言、
  // 非空行的缩进与字符；围栏在 Tabs 列表中的缩进由 Markdown 解析器消除。
  return nodes(tree, 'code').map(node => ({
    language: node.lang ?? '',
    lines: node.value.split('\n').map(line => line.trimEnd()).filter(line => line.trim()),
  }));
}

function tables(tree) {
  return nodes(tree, 'table').map(table => table.children.map(row =>
    row.children.map(cell => content(cell).replace(/\s+/g, ' ').trim())));
}

let linkCount = 0;
function checkLinks(name, tree) {
  for (const node of [...nodes(tree, 'link'), ...nodes(tree, 'image'), ...nodes(tree, 'definition')]) {
    if (node.url.startsWith('#')) continue;
    let url;
    try { url = new URL(node.url, `${site}/${name}`); }
    catch { check(false, `${name}: 无效链接 ${node.url}`); continue; }
    if (url.origin !== site) continue;
    const target = resolve(root, decodeURIComponent(url.pathname).slice(1));
    const inside = !relative(root, target).startsWith('..');
    const exists = inside && existsSync(target);
    check(exists && (!statSync(target).isDirectory() || existsSync(join(target, 'index.html'))),
      `${name}: 找不到站内链接或图片 ${node.url}`);
    linkCount++;
  }
}

const documents = new Map();
let codeCount = 0, tableCount = 0;
for (const file of readdirSync(sourceRoot, { recursive: true }).filter(file => file.endsWith('.mdoc'))) {
  const source = read(join(sourceRoot, file));
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(source);
  const data = frontmatter ? parseYaml(frontmatter[1]) : {};
  if (data.draft) continue;
  const id = data.slug ?? file.replaceAll('\\', '/').replace(/\.mdoc$/, '');
  if (['404', 'search'].includes(id)) continue;
  const name = `${id}.md`;
  if (!existsSync(join(root, name))) { check(false, `${file}: 缺少 ${name}`); continue; }
  const markdown = read(join(root, name)).trim();
  documents.set(name, markdown);
  check(markdown.startsWith(`# ${data.hero?.title || data.title}\n`), `${name}: 缺少页面标题`);
  const sourceTree = parser.parse(source.slice(frontmatter?.[0].length ?? 0));
  const exportedTree = parser.parse(markdown);
  const expectedCode = codeBlocks(sourceTree);
  check(JSON.stringify(expectedCode) === JSON.stringify(codeBlocks(exportedTree)),
    `${name}: 代码块语言、内容或缩进与源文档不一致`);
  check(JSON.stringify(tables(sourceTree)) === JSON.stringify(tables(exportedTree)),
    `${name}: 表格内容与源文档不一致`);
  codeCount += expectedCode.length;
  tableCount += tables(sourceTree).length;
  checkLinks(name, exportedTree);

  // Head 应保留 Starlight 原有元数据，同时准确指向插件的静态 Markdown 文件。
  const pagePath = id.replace(/(^|\/)index$/, '');
  const htmlPath = pagePath ? `${pagePath}/index.html` : 'index.html';
  const html = read(join(root, htmlPath));
  check(html.includes(`rel="alternate" type="text/markdown" href="${site}/${name}"`),
    `${htmlPath}: 缺少 Markdown 发现链接`);
  check(html.includes(`rel="describedby" type="text/plain" href="${site}/llms.txt"`),
    `${htmlPath}: 缺少 llms.txt 发现链接`);
  check(html.includes('rel="canonical"'), `${htmlPath}: 原有 canonical 丢失`);
}
check(documents.size > 0, '未找到已发布的文档');

const index = read(join(root, 'llms.txt'));
const indexTree = parser.parse(index);
const indexed = new Set(nodes(indexTree, 'link').map(node => node.url));
for (const name of documents.keys()) {
  check(indexed.has(`${site}/${name}`), `llms.txt: 未收录 ${name}`);
}
const generated = readdirSync(root, { recursive: true }).filter(file => file.endsWith('.md'));
check(generated.length === documents.size, 'Markdown 导出数量与已发布源文档不一致');
checkLinks('llms.txt', indexTree);

const collections = ['llms-full.txt', 'llms-small.txt', '_llms-txt/kotlin.txt', '_llms-txt/dsl.txt'];
const outputs = new Map([['llms.txt', index], ...documents]);
for (const name of collections) {
  check(indexed.has(`${site}/${name}`), `llms.txt: 未收录合集 ${name}`);
  if (!existsSync(join(root, name))) { check(false, `缺少合集 ${name}`); continue; }
  const text = read(join(root, name));
  outputs.set(name, text);
  check(nodes(parser.parse(text), 'heading').length > 1, `${name}: 合集为空`);
  checkLinks(name, parser.parse(text));
}

for (const [name, markdown] of documents) {
  check(outputs.get('llms-full.txt')?.includes(markdown), `llms-full.txt: 正文不完整 ${name}`);
  if (!['index.md', 'reference/source-index.md', 'guides/visual-reference.md'].includes(name)) {
    check(outputs.get('llms-small.txt')?.includes(markdown), `llms-small.txt: 丢失正文或提示 ${name}`);
  }
}
for (const [set, required] of [
  ['kotlin', ['guides/quickstart.md', 'guides/reusable-components.md', 'guides/ai-development.md', 'widgets/text/text.md', 'reference/text-style.md']],
  ['dsl', ['guides/parser.md', 'guides/ai-development.md', 'reference/parser-tags.md', 'reference/parser-errors.md']],
]) {
  for (const name of required) {
    check(outputs.get(`_llms-txt/${set}.txt`)?.includes(documents.get(name)), `${set} 合集: 缺少 ${name}`);
  }
}

// Markdoc 组件应变成可读正文，不能残留模板标记、样式、脚本或标题辅助链接。
for (const [name, text] of outputs) {
  check(!/\{%\s*\/?(?:aside|tabs|tabitem|steps|card|cardgrid|linkcard)\b|<script\b|<style\b|\[Section titled /i.test(text),
    `${name}: 残留模板或网页交互内容`);
}
const installation = documents.get('guides/installation.md') ?? '';
for (const label of ['快照依赖会变化', '保护 GitHub Token', 'Composite build', '本地 JAR']) {
  check(installation.includes(label), `安装指南: 提示或标签页标题丢失 ${label}`);
}
for (const id of ['404', 'playground']) {
  check(!existsSync(join(root, `${id}.md`)), `${id}: 不应导出为文档`);
  const html = read(join(root, id === '404' ? '404.html' : `${id}/index.html`));
  check(!/rel="alternate" type="text\/markdown"/.test(html), `${id}: 宣传了不存在的 Markdown 文件`);
}

if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
else console.log(`PASS: ${documents.size} 个 Markdown 页面、${collections.length} 个合集、${codeCount} 个代码块、${tableCount} 张表格、${linkCount} 个站内链接/图片`);
