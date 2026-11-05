import test from 'node:test';
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { SnapshotLanguageService } from '@muedsa/snapshot-lsp';
import { withSnapshotLspCapabilities } from '../src/playground/snapshot-lsp-capabilities.ts';

// 使用 LSP 包自己的依赖，测试不依赖 pnpm 将间接依赖提升到项目根目录。
const requireLsp = createRequire(import.meta.resolve('@muedsa/snapshot-lsp'));
const { TextDocument } = requireLsp('vscode-languageserver-textdocument');
const installedVersion = JSON.parse(readFileSync(new URL('../package.json', import.meta.resolve('@muedsa/snapshot-lsp')), 'utf8')).version;

test('Playground 内置模板仍通过已安装 LSP 的静态检查', () => {
  const source = readFileSync(new URL('../src/components/SnapshotPlayground.astro', import.meta.url), 'utf8');
  const examples = [...source.matchAll(/source: `([\s\S]*?)`,/g)];
  assert.equal(examples.length, 4);
  const service = new SnapshotLanguageService();
  for (const [, text] of examples) assert.deepEqual(service.diagnostics(text), []);
});

function connect(t, prepareMessage = message => message) {
  const worker = new Worker(new URL('./fixtures/snapshot-lsp.worker.mjs', import.meta.url));
  const messages = [], waiters = new Set();
  let nextId = 0, failure;
  worker.on('message', message => {
    messages.push(message);
    for (const waiter of waiters) if (waiter.matches(message)) waiter.resolve(message);
  });
  worker.on('error', error => {
    failure = error;
    for (const waiter of waiters) waiter.reject(error);
  });
  t.after(async () => {
    for (const waiter of waiters) waiter.reject(new Error('测试连接已关闭'));
    await worker.terminate();
  });
  const waitFor = matches => new Promise((resolve, reject) => {
    if (failure) return reject(failure);
    const found = messages.find(matches);
    if (found) return resolve(found);
    const finish = (callback, value) => {
      clearTimeout(timer);
      waiters.delete(waiter);
      callback(value);
    };
    const waiter = { matches, resolve: value => finish(resolve, value), reject: error => finish(reject, error) };
    const timer = setTimeout(() => waiter.reject(new Error('浏览器 LSP 入口响应超时')), 5000);
    waiters.add(waiter);
  });
  const notify = (method, params) => worker.postMessage(prepareMessage({ jsonrpc: '2.0', method, params }));
  const request = async (method, params) => {
    const id = ++nextId;
    const response = waitFor(message => message.id === id);
    worker.postMessage(prepareMessage({ jsonrpc: '2.0', id, method, params }));
    const message = await response;
    assert.equal(message.error, undefined, JSON.stringify(message.error));
    return message.result;
  };
  const open = (text, uri = 'inmemory://snapshot/test.snapshot') => {
    notify('textDocument/didOpen', { textDocument: { uri, languageId: 'snapshot', version: 1, text } });
    return uri;
  };
  return { request, notify, waitFor, open };
}

async function initialize(connection, snippetSupport) {
  const capabilities = snippetSupport === undefined ? {} : {
    textDocument: { completion: { completionItem: { snippetSupport } } },
  };
  const result = await connection.request('initialize', { processId: null, rootUri: null, capabilities });
  assert.equal(result.serverInfo.version, installedVersion);
  connection.notify('initialized', {});
}

for (const snippetSupport of [true, false, undefined]) {
  test(`浏览器入口能力协商：snippetSupport=${snippetSupport ?? '未声明'}`, async t => {
    const client = connect(t);
    await initialize(client, snippetSupport);
    const text = '<Snapshot><Container wi';
    const uri = client.open(text);
    const items = await client.request('textDocument/completion', { textDocument: { uri }, position: { line: 0, character: text.length } });
    const width = items.find(item => item.label === 'width');
    assert.ok(width);
    assert.equal(width.insertTextFormat, snippetSupport === true ? 2 : 1);
    assert.equal(width.textEdit.newText, snippetSupport === true ? 'width="${1}"' : 'width=""');
    const booleanText = '<Snapshot deb';
    const booleanUri = client.open(booleanText, 'inmemory://snapshot/boolean-completion.snapshot');
    const booleans = await client.request('textDocument/completion', { textDocument: { uri: booleanUri }, position: { line: 0, character: booleanText.length } });
    const debug = booleans.find(item => item.label === 'debug');
    assert.ok(debug);
    assert.equal(debug.insertTextFormat, snippetSupport === true ? 2 : 1);
    assert.equal(debug.textEdit.newText, snippetSupport === true ? 'debug="${1:true}"' : 'debug="true"');
  });
}

test('Playground 能力适配让真实 Worker 返回 snippet', async t => {
  const client = connect(t, withSnapshotLspCapabilities);
  await initialize(client);
  const text = '<Snapshot><Container wi';
  const uri = client.open(text);
  const items = await client.request('textDocument/completion', { textDocument: { uri }, position: { line: 0, character: text.length } });
  const item = items.find(item => item.label === 'width');
  assert.equal(item.insertTextFormat, 2);
  assert.equal(item.textEdit.newText, 'width="${1}"');
});

test('浏览器入口的多行补全同时保留主编辑与额外编辑', async t => {
  const client = connect(t);
  await initialize(client, true);
  for (const [index, newline] of ['\n', '\r\n'].entries()) {
    const text = `<Snapshot><Text text="中文😀" textDirection="${newline}R${newline}BAD"/></Snapshot>`;
    const uri = client.open(text, `inmemory://snapshot/multiline-${index}.snapshot`);
    const items = await client.request('textDocument/completion', { textDocument: { uri }, position: { line: 1, character: 1 } });
    const item = items.find(item => item.label === 'RTL');
    assert.ok(item);
    assert.equal(item.textEdit.range.start.line, 1);
    assert.equal(item.textEdit.range.end.line, 1);
    assert.ok(item.additionalTextEdits?.length > 0);
    const document = TextDocument.create(uri, 'snapshot', 1, text);
    assert.equal(TextDocument.applyEdits(document, [item.textEdit, ...item.additionalTextEdits]),
      '<Snapshot><Text text="中文😀" textDirection="RTL"/></Snapshot>');
  }
});

test('浏览器入口诊断可随编辑恢复，颜色别名同时支持悬停', async t => {
  const client = connect(t);
  await initialize(client, true);
  const text = '<Snapshot><Text foregroundColor="not-a-color"/></Snapshot>';
  const uri = client.open(text);
  const diagnostics = version => client.waitFor(message => message.method === 'textDocument/publishDiagnostics' && message.params.uri === uri && message.params.version === version);
  assert.ok((await diagnostics(1)).params.diagnostics.some(item => item.code === 'invalid-color'));
  const hover = await client.request('textDocument/hover', { textDocument: { uri }, position: { line: 0, character: text.indexOf('foregroundColor') + 1 } });
  assert.match(hover.contents.value, /类型：color/);
  client.notify('textDocument/didChange', {
    textDocument: { uri, version: 2 }, contentChanges: [{ text: '<Snapshot><Text foregroundColor="red"/></Snapshot>' }],
  });
  assert.deepEqual((await diagnostics(2)).params.diagnostics, []);
});

test('Playground Worker 接受十类新属性语法，并在悬停中解释迁移规则', async t => {
  const client = connect(t, withSnapshotLspCapabilities);
  await initialize(client);
  const text = `<Snapshot type=" PNG " debug=" FALSE ">
  <Container padding="8 16" margin="1 2 3 4" alignment="top-left"
    border="2 rgb(255 0 0 / 50%)" borderLeft="none" borderRadius="12 / 6"
    gradientType="linear" gradientBegin="-1 0" gradientEnd="1,0"
    gradientColors="rgb(255,0,0),green,blue" gradientStops="0 .5 1"
    boxShadow="0 2 red 4" transform="translate(12,8) rotate(30deg) scale(1.2)">
    <Column mainAxisAlignment="space-between">
      <Text fontFamily="Arial, Noto Sans" strutFontFamily="Arial, Noto Sans"
        fontStyle="bold-italic" decoration="underline line-through"
        textShadow="0 2 red 4" softWrap subpixel=" true ">中文 PDF 😀</Text>
      <Transform matrix="none" origin="4 -2" alignment="(0 0)">
        <ClipRRect borderRadiusBottomRight="(12,6)"><SizedBox width="20" height="10"/></ClipRRect>
      </Transform>
      <ClipPath path="M0 0 L20 0 L10 10 Z" fit="contain" fillRule="even-odd">
        <Padding padding="(1,2,3,4)"><SizedBox width="20" height="10"/></Padding>
      </ClipPath>
    </Column>
  </Container>
</Snapshot>`;
  const uri = client.open(text);
  const diagnostics = await client.waitFor(message => message.method === 'textDocument/publishDiagnostics' && message.params.uri === uri);
  assert.deepEqual(diagnostics.params.diagnostics, []);
  const document = TextDocument.create(uri, 'snapshot', 1, text);
  for (const [attribute, pattern] of [['padding', /旧.*左.*上.*右.*下/], ['transform', /右乘.*右侧.*先/], ['softWrap', /裸属性.*true/]]) {
    const hover = await client.request('textDocument/hover', { textDocument: { uri }, position: document.positionAt(text.indexOf(attribute) + 1) });
    assert.match(hover.contents.value, pattern);
  }
});

test('Playground Worker 的复合 snippet、自动引号和装饰列表补全保留周边内容', async t => {
  const client = connect(t, withSnapshotLspCapabilities);
  await initialize(client);
  const prefix = '<Snapshot><Container padd';
  const prefixUri = client.open(prefix);
  const templates = await client.request('textDocument/completion', { textDocument: { uri: prefixUri }, position: { line: 0, character: prefix.length } });
  const padding = templates.find(item => item.label === 'padding');
  assert.equal(padding.insertTextFormat, 2);
  assert.equal(padding.textEdit.newText, 'padding="${1:8}"');

  for (const [index, [marked, label, expected]] of [
    ['<Snapshot><Container padding=|8 width="20"/></Snapshot>', '8 16', '<Snapshot><Container padding="8 16" width="20"/></Snapshot>'],
    ['<Snapshot><Text decoration="underline li|" text="中文😀"/></Snapshot>', 'LINE_THROUGH', '<Snapshot><Text decoration="underline LINE_THROUGH" text="中文😀"/></Snapshot>'],
    ['<Snapshot><Text decoration="underline, li|"/></Snapshot>', 'LINE_THROUGH', '<Snapshot><Text decoration="underline, LINE_THROUGH"/></Snapshot>'],
    ['<Snapshot><Text textDirection="\r\n r|\r\nBAD"/></Snapshot>', 'RTL', '<Snapshot><Text textDirection="RTL"/></Snapshot>'],
  ].entries()) {
    const offset = marked.indexOf('|'), text = marked.replace('|', '');
    const uri = client.open(text, `inmemory://snapshot/new-completion-${index}.snapshot`);
    const document = TextDocument.create(uri, 'snapshot', 1, text);
    const items = await client.request('textDocument/completion', { textDocument: { uri }, position: document.positionAt(offset) });
    const item = items.find(candidate => candidate.label === label);
    assert.ok(item, marked);
    assert.equal(item.textEdit.range.start.line, item.textEdit.range.end.line);
    const edited = TextDocument.applyEdits(document, [item.textEdit, ...(item.additionalTextEdits ?? [])]);
    assert.equal(edited, expected);
    assert.deepEqual(new SnapshotLanguageService().diagnostics(edited), []);
    if (marked.includes('decoration')) {
      assert.ok(!items.some(candidate => ['UNDERLINE', 'NONE'].includes(candidate.label)));
    }
  }
});

test('Playground Worker 的严格布尔诊断随多行增量编辑清除，裸属性仍合法', async t => {
  const client = connect(t, withSnapshotLspCapabilities);
  await initialize(client);
  const text = '<Snapshot>\n  <Text text="中文😀" softWrap="yes"/>\n</Snapshot>';
  const uri = client.open(text);
  const diagnostics = version => client.waitFor(message => message.method === 'textDocument/publishDiagnostics' && message.params.uri === uri && message.params.version === version);
  const error = (await diagnostics(1)).params.diagnostics.find(item => item.code === 'invalid-boolean');
  assert.ok(error);
  const document = TextDocument.create(uri, 'snapshot', 1, text);
  assert.equal(document.getText(error.range), 'yes');
  client.notify('textDocument/didChange', {
    textDocument: { uri, version: 2 }, contentChanges: [{ range: error.range, text: ' FALSE ' }],
  });
  assert.deepEqual((await diagnostics(2)).params.diagnostics, []);
  for (const [index, value] of ['', ' ', '1', '0'].entries()) {
    const version = index + 3;
    client.notify('textDocument/didChange', {
      textDocument: { uri, version }, contentChanges: [{ text: `<Snapshot><Text softWrap="${value}"/></Snapshot>` }],
    });
    assert.ok((await diagnostics(version)).params.diagnostics.some(item => item.code === 'invalid-boolean'));
  }
  client.notify('textDocument/didChange', {
    textDocument: { uri, version: 7 }, contentChanges: [{ text: '<Snapshot debug><Text softWrap/></Snapshot>' }],
  });
  assert.deepEqual((await diagnostics(7)).params.diagnostics, []);
});

test('已安装包保留赋值、补齐闭合尖括号并识别无引号 URL', () => {
  const service = new SnapshotLanguageService();
  for (const [marked, label, expected] of [
    ['<Snapshot><Container wi|dht="100"/></Snapshot>', 'width', '<Snapshot><Container width="100"/></Snapshot>'],
    ['<Snapshot><Text></Te|\n</Snapshot>', 'Text', '<Snapshot><Text></Text>\n</Snapshot>'],
    ['<Snapshot><Image url=https://example.com/a.png fit="CO|" /></Snapshot>', 'COVER', '<Snapshot><Image url=https://example.com/a.png fit="COVER" /></Snapshot>'],
  ]) {
    const offset = marked.indexOf('|'), text = marked.replace('|', '');
    const document = TextDocument.create('inmemory://snapshot/edit.snapshot', 'snapshot', 1, text);
    const item = service.completions(text, document.positionAt(offset), document.uri, { snippetSupport: false }).find(item => item.label === label);
    assert.ok(item, marked);
    assert.equal(TextDocument.applyEdits(document, [item.textEdit, ...(item.additionalTextEdits ?? [])]), expected);
  }
  assert.deepEqual(service.diagnostics('<Snapshot><Text><Raw><WidgetSpan><Container/></WidgetSpan></Raw></Text></Snapshot>'), []);
  assert.ok(service.diagnostics('<Snapshot><constructor/></Snapshot>').some(item => item.code === 'unknown-tag'));
  assert.ok(service.diagnostics('<Snapshot><ColoredBox color/></Snapshot>').some(item => item.code === 'missing-value'));
});
