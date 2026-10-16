import type * as Monaco from 'monaco-editor';

type Message = Parameters<ReturnType<typeof Monaco.lsp.createTransportToWorker>['send']>[0];
type JsonObject = { [key: string]: JsonValue | undefined };
type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];

function asObject(value: JsonValue | undefined): JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

/** Monaco 0.56 可应用 snippet，但内置客户端未声明此能力；只补充 initialize，不改动其他报文。 */
export function withSnapshotLspCapabilities(message: Message): Message {
  if (message.method !== 'initialize') return message;
  const params = asObject(message.params);
  const capabilities = asObject(params.capabilities);
  const textDocument = asObject(capabilities.textDocument);
  const completion = asObject(textDocument.completion);
  return {
    ...message,
    params: {
      ...params,
      capabilities: {
        ...capabilities,
        textDocument: {
          ...textDocument,
          completion: {
            ...completion,
            completionItem: { ...asObject(completion.completionItem), snippetSupport: true },
          },
        },
      },
    },
  };
}
