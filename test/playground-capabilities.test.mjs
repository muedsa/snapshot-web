import test from 'node:test';
import assert from 'node:assert/strict';
import { withSnapshotLspCapabilities } from '../src/playground/snapshot-lsp-capabilities.ts';

test('初始化声明 snippet 支持，并保留已有能力与原始报文', () => {
  const message = {
    jsonrpc: '2.0', id: 1, method: 'initialize',
    params: {
      processId: null, rootUri: null,
      capabilities: {
        workspace: { configuration: true },
        textDocument: {
          hover: { contentFormat: ['markdown'] },
          completion: { contextSupport: true, completionItem: { preselectSupport: true } },
        },
      },
    },
  };
  const original = structuredClone(message);
  const result = withSnapshotLspCapabilities(message);
  const expected = structuredClone(original);
  expected.params.capabilities.textDocument.completion.completionItem.snippetSupport = true;
  assert.deepEqual(result, expected);
  assert.deepEqual(message, original);
  assert.deepEqual(withSnapshotLspCapabilities(result), result);
});

test('能力字段缺省时仍可初始化，普通请求及响应不变', () => {
  const result = withSnapshotLspCapabilities({ jsonrpc: '2.0', id: 1, method: 'initialize' });
  assert.equal(result.params.capabilities.textDocument.completion.completionItem.snippetSupport, true);
  for (const message of [
    { jsonrpc: '2.0', id: 2, method: 'textDocument/completion', params: { position: { line: 0, character: 1 } } },
    { jsonrpc: '2.0', method: 'textDocument/didChange', params: { contentChanges: [{ text: '中文😀' }] } },
    { jsonrpc: '2.0', id: 1, result: { capabilities: {} } },
  ]) assert.equal(withSnapshotLspCapabilities(message), message);
});
