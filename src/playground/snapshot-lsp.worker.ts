// snapshot-lsp 的 Web Worker 入口：Monaco 通过 LSP（JSON-RPC over postMessage）连接这里。
import { startBrowserWorkerServer } from '@muedsa/snapshot-lsp/browser';

// Worker 全局作用域与 vscode-languageserver 的 BrowserMessageReader/Writer 期望的
// MessagePort 形状一致（addEventListener + onmessage + postMessage），这里仅做类型转换。
startBrowserWorkerServer(self as unknown as MessagePort);
