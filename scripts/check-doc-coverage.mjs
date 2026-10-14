import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// 轻量源码覆盖检查，不是 Kotlin 解析器，也不证明说明的语义正确。
export function constructorParameters(source, name) {
  const match = new RegExp(`\\bclass\\s+${name}\\s*\\(`).exec(source);
  if (!match) throw new Error(`找不到构造声明：${name}`);
  const start = match.index + match[0].length;
  let depth = 1, end = start, quote = null;
  for (; end < source.length && depth; end++) {
    const char = source[end];
    if (quote) {
      if (char === '\\') end++;
      else if (char === quote) quote = null;
    } else if (char === '"' || char === "'") quote = char;
    else if (char === '(') depth++;
    else if (char === ')') depth--;
  }
  if (depth) throw new Error(`构造声明不完整：${name}`);
  const header = source.slice(start, end - 1);
  const parameters = [...header.matchAll(/(?:^|\n)\s*(?:(?:val|var|private|public|override)\s+)*(\w+)\s*:/g)].map(m => m[1]);
  if (!parameters.length) throw new Error(`没有提取到参数：${name}`);
  return parameters;
}

export function tableParameters(markdown, column = 0) {
  // 只认可指定表格列中的反引号参数名，不把签名或顺带提及当作说明。
  return new Set(markdown.split(/\r?\n/).filter(line => line.startsWith('|'))
    .flatMap(line => [...(line.split('|')[column + 1] ?? '').matchAll(/`([A-Za-z]\w*)`/g)].map(x => x[1])));
}

export function missingParameters(parameters, markdown, column = 0) {
  const documented = tableParameters(markdown, column);
  return [...new Set(parameters)].filter(p => !documented.has(p));
}

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export function checkCoverage(snapshotRoot = resolve(repo, '../snapshot')) {
  const core = resolve(snapshotRoot, 'core/src/main/kotlin/com/muedsa/snapshot');
  const parser = resolve(snapshotRoot, 'parser/src/main/kotlin/com/muedsa/snapshot/parser');
  const mappings = [
    ['paint/text/TextStyle.kt', 'TextStyle', 'text-style'],
    ['paint/decoration/BoxDecoration.kt', 'BoxDecoration', 'box-decoration'],
    ['paint/decoration/DecorationImage.kt', 'DecorationImage', 'decoration-image'],
    ['paint/decoration/Border.kt', 'Border', 'borders'],
    ['paint/decoration/BorderSide.kt', 'BorderSide', 'borders'],
    ['paint/decoration/BorderRadius.kt', 'BorderRadius', 'borders'],
    ['paint/decoration/BoxShadow.kt', 'BoxShadow', 'box-shadow'],
    ['paint/gradient/LinearGradient.kt', 'LinearGradient', 'gradients'],
    ['paint/gradient/RadialGradient.kt', 'RadialGradient', 'gradients'],
    ['paint/gradient/SweepGradient.kt', 'SweepGradient', 'gradients'],
  ];
  const failures = [];
  let checked = 0;
  const check = (label, parameters, page, column = 0) => {
    checked += parameters.length;
    const missing = missingParameters(parameters, readFileSync(resolve(repo, `src/content/docs/reference/${page}.mdoc`), 'utf8'), column);
    if (missing.length) failures.push(`${label}: 缺少表格条目 ${missing.join(', ')}`);
  };
  for (const [file, name, page] of mappings) {
    check(name, constructorParameters(readFileSync(resolve(core, file), 'utf8'), name), page);
  }
  const textSource = readFileSync(resolve(parser, 'widget/TextParser.kt'), 'utf8');
  const attributes = [...textSource.matchAll(/val\s+ATTR_(\w+)\s*=\s*[^\n]*?\(\s*"(\w+)"/g)]
    .filter(m => m[1] !== 'IMAGE_ALIGNMENT').map(m => m[2]);
  if (attributes.length < 30) throw new Error('TextParser 声明格式变化，请更新检查器');
  const commonSource = readFileSync(resolve(parser, 'attr/CommonAttrDefine.kt'), 'utf8');
  const styleSource = readFileSync(resolve(parser, 'widget/TextStyleParser.kt'), 'utf8');
  const commonNames = new Set([...styleSource.matchAll(/CommonAttrDefine\.(\w+)/g)].map(m => m[1]));
  commonNames.add('TEXT_N');
  for (const name of commonNames) {
    const match = new RegExp(`val\\s+${name}\\b[^=]*=\\s*\\w+\\(\\s*(?:name\\s*=\\s*)?"(\\w+)"`).exec(commonSource);
    if (!match) throw new Error(`无法解析公共属性：${name}`);
    attributes.push(match[1]);
  }
  check('Parser Text', [...new Set(attributes)], 'parser-text');
  const gradientSource = readFileSync(resolve(parser, 'widget/GradientParser.kt'), 'utf8');
  const gradientAttributes = [...gradientSource.matchAll(/(?:\(|copyWith\()"(gradient\w+)"/g)].map(m => m[1]);
  if (gradientAttributes.length < 10) throw new Error('GradientParser 声明格式变化，请更新检查器');
  check('Parser Gradient', [...new Set(gradientAttributes)], 'gradients', 1);
  if (failures.length) throw new Error(failures.join('\n'));
  return `PASS: ${mappings.length} 个配置类及 Parser 文本/渐变，共 ${checked} 个参数位置有表格说明`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { console.log(checkCoverage(process.argv[2] ? resolve(process.argv[2]) : undefined)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
