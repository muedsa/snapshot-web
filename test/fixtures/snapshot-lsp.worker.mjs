// Node Worker 提供浏览器入口需要的计时器上下文；消息仍经真实 MessagePort 传输。
import { parentPort } from 'node:worker_threads';

globalThis.self = globalThis;
const { startBrowserWorkerServer } = await import('@muedsa/snapshot-lsp/browser');
startBrowserWorkerServer(parentPort);
