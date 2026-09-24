// 通过 Web Worker + LSP 连接 snapshot-lsp。
// Monaco 0.55+ 自带类型化的 LSP 客户端（monaco.lsp），会自动完成：
// 文档同步（didOpen/didChange/didClose）、补全、悬停与 publishDiagnostics → 编辑器标记。
import * as monaco from 'monaco-editor';
import SnapshotLspWorker from './snapshot-lsp.worker?worker';

type SnapshotLspTransport = ReturnType<typeof monaco.lsp.createTransportToWorker>;
type SnapshotLspMessage = Parameters<SnapshotLspTransport['send']>[0];
type SnapshotLspListener = NonNullable<Parameters<SnapshotLspTransport['setListener']>[0]>;

export interface SnapshotLspConnection {
  /** 语言服务完成 initialize 并处理首个文档后 resolve；失败时 reject。 */
  ready: Promise<void>;
}

/** 启动 snapshot-lsp worker 并把 Monaco 的 LSP 客户端接上去。 */
export function connectSnapshotLsp(): SnapshotLspConnection {
  const worker = new SnapshotLspWorker();
  const transport = monaco.lsp.createTransportToWorker(worker);

  let markReady = () => {};
  let markFailed = (_error: unknown) => {};
  const ready = new Promise<void>((resolve, reject) => {
    markReady = resolve;
    markFailed = reject;
  });

  // 握手过程只有传输层能看到：initialize 的响应与首个 publishDiagnostics 都说明语言服务已就绪。
  let initializeId: number | string | undefined;
  let settled = false;
  const settle = () => {
    if (settled) return;
    settled = true;
    markReady();
  };

  // 结构上等价于 IMessageTransport，只是包一层以便观察握手报文。
  const watchedTransport = {
    get state() {
      return transport.state;
    },
    toString: () => transport.toString(),
    send: (message: SnapshotLspMessage) => {
      if (message.method === 'initialize' && message.id !== undefined && message.id !== null) initializeId = message.id;
      return transport.send(message);
    },
    setListener: (listener: SnapshotLspListener | undefined) => {
      transport.setListener((message) => {
        listener?.(message);
        const handshakeFinished = initializeId !== undefined && String(message.id) === String(initializeId);
        if (handshakeFinished || message.method === 'textDocument/publishDiagnostics') settle();
      });
    },
  };

  new monaco.lsp.MonacoLspClient(watchedTransport);

  worker.addEventListener('error', (event) => {
    if (settled) return;
    settled = true;
    markFailed(event instanceof ErrorEvent ? event.message : new Error('snapshot-lsp worker 启动失败'));
  });

  return { ready };
}
