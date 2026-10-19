import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRenderDiagnostics, parseRenderError, renderErrorTitle, resolveDiagnosticPosition,
} from '../src/playground/render-diagnostics.ts';

const source = '<Snapshot>\n  <Row mainAxisAlignment="MIDDLE"/>\n</Snapshot>';
const snapshot = { source, version: 1 };
const attributeError = (overrides = {}) => ({
  code: 'PARSE_ERROR', message: '属性值无效\n格式：以下取值之一', requestId: 'test-request',
  diagnostic: {
    attributeName: 'mainAxisAlignment', elementName: 'Row', valueState: 'present',
    position: { offset: source.indexOf('MIDDLE'), line: 2, column: 27 },
    format: '以下取值之一，区分大小写', allowedValues: ['START', 'END', 'CENTER'], examples: ['START'],
    ...overrides,
  },
});

// 只模拟 DOM 的文本槽位和事件，不模拟 HTML 解析；真实浏览器验证另行进行。
function setupView() {
  const elements = new Map();
  const root = {
    querySelector(selector) {
      if (!elements.has(selector)) {
        const element = new EventTarget();
        Object.assign(element, { hidden: false, textContent: '', row: { hidden: false } });
        element.closest = () => element.row;
        Object.defineProperty(element, 'innerHTML', { set() { assert.fail('服务端文本不得写入 innerHTML'); } });
        elements.set(selector, element);
      }
      return elements.get(selector);
    },
  };
  let version = 1;
  let marker;
  const locations = [];
  const view = createRenderDiagnostics(root, {
    getVersionId: () => version,
    setMarker: (next) => { marker = next; },
    revealPosition: (position) => locations.push(position),
  });
  return {
    view, locations,
    element: (name = '') => root.querySelector(`[data-diagnostic${name ? `-${name}` : ''}]`),
    marker: () => marker,
    edit: () => { version++; view.onContentChange(); },
    // 模拟点击前版本刚好变化，验证点击处理本身也检查版本。
    changeVersionOnly: () => { version++; },
  };
}

test('结构化响应保留格式、候选和首错位置，普通错误兼容旧服务', () => {
  const payload = parseRenderError(attributeError());
  assert.equal(payload.diagnostic.truncated, false);
  assert.equal(payload.requestId, 'test-request');
  assert.deepEqual(payload.diagnostic.allowedValues, ['START', 'END', 'CENTER']);
  const legacy = { code: 'PARSE_ERROR', message: '旧版结构错误\n第二行', requestId: 'legacy' };
  assert.deepEqual(parseRenderError(legacy), legacy);
  for (const invalid of [null, undefined, '<html>502</html>', [], 12]) assert.equal(parseRenderError(invalid), undefined);
  const malformed = parseRenderError({ code: {}, message: [], requestId: 5, diagnostic: { attributeName: 'x', valueState: '__proto__' } });
  assert.deepEqual(malformed, { code: undefined, message: undefined, requestId: undefined });
});

test('可选元数据、空数组和异常字段不会阻止展示属性诊断', () => {
  const payload = parseRenderError(attributeError({
    elementName: undefined, position: { offset: -1, line: 0, column: '2' }, format: undefined,
    allowedValues: [], examples: [null, '示例', 12], truncated: 'true',
  }));
  assert.equal(payload.diagnostic.elementName, undefined);
  assert.deepEqual(payload.diagnostic.examples, ['示例']);
  assert.equal(payload.diagnostic.truncated, false);
  const ui = setupView();
  ui.view.show(payload, snapshot);
  assert.equal(ui.element().hidden, false);
  for (const name of ['element', 'position', 'format', 'values']) assert.equal(ui.element(name).row.hidden, true, name);
  assert.equal(ui.element('locate').hidden, true);
  assert.match(ui.element('location-note').textContent, /未提供可定位/);
  assert.equal(ui.marker(), undefined);
});

test('四种值状态清晰区分，候选和示例可以为空', () => {
  const ui = setupView();
  for (const [state, label] of [
    ['missing', '缺少属性'], ['unassigned', '仅写属性名，未赋值'], ['empty', '空字符串'], ['present', '已赋值（包括纯空白）'],
  ]) {
    ui.view.show(parseRenderError(attributeError({ valueState: state, allowedValues: [], examples: [] })), snapshot);
    assert.equal(ui.element('state').textContent, label);
    assert.equal(ui.element('values').row.hidden, true);
    assert.equal(ui.element('examples').row.hidden, true);
  }
});

test('按错误码分类，图片错误附带诊断仍显示图片加载失败', () => {
  const image = parseRenderError({ ...attributeError(), code: 'IMAGE_LOAD_ERROR', message: '不是固定文案' });
  assert.ok(image.diagnostic);
  assert.equal(renderErrorTitle(image.code), '图片加载失败');
  assert.equal(renderErrorTitle(parseRenderError({ code: 'PARSE_ERROR', message: 'image URL' }).code), 'DSL 解析失败');
  assert.equal(renderErrorTitle('RATE_LIMITED'), '请求过于频繁');
  for (const unknown of [undefined, '__proto__', 'FUTURE_ERROR']) assert.equal(renderErrorTitle(unknown), '渲染失败');
});

test('偏移使用 UTF-16，中文、emoji、多行和 CRLF 不导致位置偏移', () => {
  const dsl = '<Snapshot>中文😀\r\n  <Text text="一\n二" color="BAD"/>\r\n</Snapshot>';
  const offset = dsl.indexOf('BAD');
  const expected = { lineNumber: 3, column: 11 };
  assert.deepEqual(resolveDiagnosticPosition({ offset }, dsl), expected);
  assert.deepEqual(resolveDiagnosticPosition({ line: 3, column: 11 }, dsl), expected);
  assert.deepEqual(resolveDiagnosticPosition({ offset, line: 3, column: 11 }, dsl), expected);
  assert.deepEqual(resolveDiagnosticPosition({ offset: '中文😀'.length }, '中文😀X'), { lineNumber: 1, column: 5 });
  assert.deepEqual(resolveDiagnosticPosition({ offset: 0 }, dsl), { lineNumber: 1, column: 1 });
  assert.deepEqual(resolveDiagnosticPosition({ offset: dsl.length }, dsl), { lineNumber: 4, column: 12 });
  assert.deepEqual(resolveDiagnosticPosition({ offset: 0 }, ''), { lineNumber: 1, column: 1 });
});

test('不猜测缺失、越界、矛盾或 CRLF 中间的位置', () => {
  for (const position of [undefined, {}, { line: 2 }, { column: 1 }, { offset: -1 }, { offset: NaN },
    { offset: Infinity }, { offset: 0.5 }, { offset: 99 }, { line: 99, column: 1 }, { line: 1, column: 99 },
    { offset: 0, line: 2, column: 1 }, { offset: 0, column: 2 }, { offset: 2 },
  ]) assert.equal(resolveDiagnosticPosition(position, 'A\r\nB'), undefined, JSON.stringify(position));
});

test('定位使用本次请求的位置，不搜索可能重复出现的属性值', () => {
  const ui = setupView();
  const dsl = '<Text color="BAD">BAD</Text><Text color="BAD"/>';
  const offset = dsl.lastIndexOf('BAD');
  ui.view.show(parseRenderError(attributeError({ position: { offset } })), { source: dsl, version: 1 });
  assert.deepEqual(ui.marker().position, { lineNumber: 1, column: offset + 1 });
  assert.equal(ui.element('locate').hidden, false);
  ui.element('locate').dispatchEvent(new Event('click'));
  assert.deepEqual(ui.locations, [{ lineNumber: 1, column: offset + 1 }]);
});

test('响应到达前修改代码：保留诊断文本但不添加标记或允许旧位置跳转', () => {
  const ui = setupView();
  ui.edit();
  ui.view.show(parseRenderError(attributeError()), snapshot);
  assert.equal(ui.element().hidden, false);
  assert.equal(ui.marker(), undefined);
  assert.equal(ui.element('locate').hidden, true);
  assert.match(ui.element('location-note').textContent, /代码已修改/);
  ui.element('locate').dispatchEvent(new Event('click'));
  assert.deepEqual(ui.locations, []);
});

test('响应到达后修改代码立即清除标记，下一次运行及销毁清理旧状态', () => {
  const ui = setupView();
  const payload = parseRenderError(attributeError());
  ui.view.show(payload, snapshot);
  assert.ok(ui.marker());
  ui.edit();
  assert.equal(ui.marker(), undefined);
  assert.equal(ui.element('locate').hidden, true);
  ui.view.show(payload, { ...snapshot, version: 2 });
  assert.ok(ui.marker());
  assert.equal(ui.element('location-note').hidden, true);
  ui.view.clear();
  assert.equal(ui.marker(), undefined);
  assert.equal(ui.element().hidden, true);
  ui.view.show(payload, { ...snapshot, version: 2 });
  ui.view.dispose();
  ui.element('locate').dispatchEvent(new Event('click'));
  assert.equal(ui.marker(), undefined);
  assert.deepEqual(ui.locations, []);
});

test('点击定位时再次校验版本，无诊断响应移除上一次的属性提示', () => {
  const ui = setupView();
  ui.view.show(parseRenderError(attributeError()), snapshot);
  ui.changeVersionOnly();
  ui.element('locate').dispatchEvent(new Event('click'));
  assert.equal(ui.marker(), undefined);
  assert.deepEqual(ui.locations, []);
  ui.view.show(parseRenderError({ code: 'RENDER_ERROR', message: '组件约束错误' }), snapshot);
  assert.equal(ui.element().hidden, true);
  assert.equal(ui.element('location-note').textContent, '');
});

test('复合属性的候选和示例分开展示，不自动替换用户输入', () => {
  const ui = setupView();
  ui.view.show(parseRenderError(attributeError({
    attributeName: 'border', format: '宽度 样式 颜色',
    allowedValues: ['SOLID', 'DASHED'], examples: ['1 SOLID #334155'], truncated: true,
  })), snapshot);
  assert.equal(ui.element('format').textContent, '宽度 样式 颜色');
  assert.equal(ui.element('values').textContent, 'SOLID · DASHED');
  assert.equal(ui.element('examples').textContent, '1 SOLID #334155');
  assert.equal(ui.element('truncated').hidden, false);
  assert.deepEqual(ui.locations, []);
  ui.view.show(parseRenderError(attributeError()), snapshot);
  assert.equal(ui.element('truncated').hidden, true);
});

test('恶意标签、引号和多行内容只进入文本槽位，不当作 HTML', () => {
  const ui = setupView();
  const malicious = '<img src=x onerror="alert(1)">\n<script>alert(2)</script> & "';
  ui.view.show(parseRenderError(attributeError({
    attributeName: malicious, elementName: malicious, format: malicious,
    allowedValues: [malicious], examples: [malicious],
  })), snapshot);
  for (const name of ['attribute', 'format', 'values', 'examples']) assert.equal(ui.element(name).textContent, malicious);
  assert.equal(ui.element('element').textContent, `<${malicious}>`);
});
