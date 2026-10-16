import test from 'node:test';
import assert from 'node:assert/strict';
import { compile } from 'monaco-editor/editor/standalone/common/monarch/monarchCompile.js';
import { MonarchTokenizer } from 'monaco-editor/editor/standalone/common/monarch/monarchLexer.js';
import { registerSnapshotLanguage } from '../src/playground/snapshot-language.ts';

let definition;
registerSnapshotLanguage({
  languages: {
    register() {},
    setMonarchTokensProvider(_id, value) { definition = value; },
    setLanguageConfiguration() {},
  },
  editor: { defineTheme() {} },
});

function tokenize(t, source) {
  // 使用安装的 Monaco Monarch 引擎；仅替换与词法无关的主题/配置服务。
  const tokenizer = new MonarchTokenizer({}, {}, 'snapshot', compile('snapshot', definition), {
    getValue: () => 20000,
    onDidChangeConfiguration: () => ({ dispose() {} }),
  });
  t.after(() => tokenizer.dispose());
  let state = tokenizer.getInitialState();
  return source.split('\n').map(line => {
    const result = tokenizer.tokenize(line, true, state);
    state = result.endState;
    return result.tokens.map((token, index) => ({
      text: line.slice(token.offset, result.tokens[index + 1]?.offset ?? line.length),
      type: token.type,
    }));
  });
}

test('真实 Monarch 将无引号 URL 作为完整值，之后仍可识别属性与自闭合', t => {
  const [tokens] = tokenize(t, '<Image url=https://example.com/a.png fit="COVER" />');
  assert.ok(tokens.some(token => token.text === 'https://example.com/a.png' && token.type === 'string.snapshot'), JSON.stringify(tokens));
  assert.ok(tokens.some(token => token.text === 'fit' && token.type === 'attribute.name.snapshot'));
  assert.deepEqual(tokens.at(-1), { text: '/>', type: 'tag.delimiter.snapshot' });
});

test('无引号路径尾部斜杠属于值，不能误识别为自闭合', t => {
  const [tokens] = tokenize(t, '<Image url=assets/a.png/>');
  assert.ok(tokens.some(token => token.text === 'assets/a.png/' && token.type === 'string.snapshot'), JSON.stringify(tokens));
  assert.deepEqual(tokens.at(-1), { text: '>', type: 'tag.delimiter.snapshot' });
});

test('跨行引号值、单引号值与注释之后恢复属性和标签高亮', t => {
  const lines = tokenize(t, '<Text text="中文😀\n内容" color=\'red\' />\n<!-- comment -->\n<Container width=100 />');
  assert.ok(lines[1].some(token => token.text === 'color' && token.type === 'attribute.name.snapshot'), JSON.stringify(lines));
  assert.ok(lines[1].some(token => token.text === 'red' && token.type === 'string.snapshot'));
  assert.ok(lines[2].every(token => token.type === 'comment.snapshot'));
  assert.ok(lines[3].some(token => token.text === 'Container' && token.type === 'tag.snapshot'));
  assert.ok(lines[3].some(token => token.text === 'width' && token.type === 'attribute.name.snapshot'));
});
