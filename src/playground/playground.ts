// Playground 主逻辑：Monaco 编辑器 + snapshot-lsp 语言服务 + 调用 Open Snapshot 服务出图。
import * as monaco from 'monaco-editor';
import EditorWorker from 'monaco-editor/editor/editor.worker?worker';
import { SNAPSHOT_LANGUAGE_ID, registerSnapshotLanguage, snapshotThemeFor } from './snapshot-language';
import { connectSnapshotLsp } from './snapshot-lsp-client';

type Example = { id: string; label: string; source: string };

const STORAGE_KEY = 'snapshot-playground-source';
const MODEL_URI = 'inmemory://snapshot/playground.snapshot';

const PROBLEM_LEVELS = {
  ok: { label: '无问题' },
  warning: { label: '警告' },
  error: { label: '错误' },
} as const;

export function startPlayground(root: HTMLElement): void {
  const editorHost = root.querySelector('[data-editor]');
  const exampleSelect = root.querySelector('[data-example-select]');
  const renderButton = root.querySelector('[data-render]');
  const renderLabel = root.querySelector('[data-render-label]');
  const resetButton = root.querySelector('[data-reset]');
  const copyButton = root.querySelector('[data-copy]');
  const downloadButton = root.querySelector('[data-download]');
  const lineCount = root.querySelector('[data-line-count]');
  const problems = root.querySelector('[data-problems]');
  const lspStatus = root.querySelector('[data-lsp-status]');
  const status = root.querySelector('[data-status]');
  const emptyState = root.querySelector('[data-empty-state]');
  const loadingState = root.querySelector('[data-loading-state]');
  const previewImage = root.querySelector('[data-preview-image]');
  const errorState = root.querySelector('[data-error-state]');
  const errorCode = root.querySelector('[data-error-code]');
  const errorTitle = root.querySelector('[data-error-title]');
  const errorMessage = root.querySelector('[data-error-message]');
  const requestId = root.querySelector('[data-request-id]');
  const resultMeta = root.querySelector('[data-result-meta]');
  const imageSize = root.querySelector('[data-image-size]');
  const fileSize = root.querySelector('[data-file-size]');
  const renderDuration = root.querySelector('[data-render-duration]');
  const serverDuration = root.querySelector('[data-server-duration]');
  const queueDuration = root.querySelector('[data-queue-duration]');
  const imageDuration = root.querySelector('[data-image-duration]');
  const requestDuration = root.querySelector('[data-request-duration]');
  const imageCount = root.querySelector('[data-image-count]');
  const cache = root.querySelector('[data-cache]');

  if (!(editorHost instanceof HTMLElement)) return;

  const apiUrl = root.dataset.apiUrl;
  const examples = readExamples(root);
  const storage = readStorage();
  const initialSource = storage ?? examples[0]?.source ?? '';

  // Vite 负责把 Monaco 的编辑器 worker 单独打包（词法分析等仍在 worker 中执行）。
  self.MonacoEnvironment = { getWorker: () => new EditorWorker() };
  registerSnapshotLanguage(monaco);

  const themeObserver = new MutationObserver(() => applyTheme());
  const storedTheme = () => snapshotThemeFor(document.documentElement.dataset.theme);

  const model = monaco.editor.createModel(initialSource, SNAPSHOT_LANGUAGE_ID, monaco.Uri.parse(MODEL_URI));
  const editor = monaco.editor.create(editorHost, {
    model,
    theme: storedTheme(),
    automaticLayout: true,
    ariaLabel: 'Snapshot DSL 编辑器',
    minimap: { enabled: false },
    fontFamily: monoFontFamily(),
    fontSize: 13,
    lineHeight: 22,
    tabSize: 2,
    insertSpaces: true,
    wordWrap: 'off',
    scrollBeyondLastLine: false,
    renderLineHighlight: 'line',
    renderWhitespace: 'selection',
    smoothScrolling: true,
    // 让补全/悬停浮层脱离面板的 overflow: hidden。
    fixedOverflowWidgets: true,
    padding: { top: 14, bottom: 16 },
    scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10, useShadows: false },
    bracketPairColorization: { enabled: true },
    suggest: { showWords: false },
    quickSuggestions: { other: true, comments: false, strings: true },
    // 语言服务补全覆盖标签/属性/枚举值，避免 Monaco 的单词建议混入。
    wordBasedSuggestions: 'off',
    contextmenu: true,
    guides: { indentation: true },
  });

  root.dataset.editorReady = '';

  let imageUrl = '';
  let imageBlob: Blob | undefined;
  let controller: AbortController | undefined;
  let saveTimer: number | undefined;

  const setHidden = (element: Element | null, hidden: boolean) => {
    if (element instanceof HTMLElement) element.hidden = hidden;
  };

  const setStatus = (label: string, kind: string) => {
    if (!(status instanceof HTMLElement)) return;
    status.textContent = label;
    status.className = `status status-${kind}`;
  };

  const setLspStatus = (label: string, state: string) => {
    if (!(lspStatus instanceof HTMLElement)) return;
    lspStatus.textContent = label;
    lspStatus.dataset.state = state;
  };

  const setProblems = (label: string, level: keyof typeof PROBLEM_LEVELS) => {
    if (!(problems instanceof HTMLElement)) return;
    problems.textContent = label;
    problems.dataset.level = level;
    problems.hidden = false;
  };

  const updateProblems = () => {
    const markers = monaco.editor.getModelMarkers({ resource: model.uri });
    const errors = markers.filter((marker) => marker.severity === monaco.MarkerSeverity.Error).length;
    const warnings = markers.filter((marker) => marker.severity === monaco.MarkerSeverity.Warning).length;
    if (errors > 0 && warnings > 0) setProblems(`${errors} 个错误 · ${warnings} 个警告`, 'error');
    else if (errors > 0) setProblems(`${errors} 个${PROBLEM_LEVELS.error.label}`, 'error');
    else if (warnings > 0) setProblems(`${warnings} 个${PROBLEM_LEVELS.warning.label}`, 'warning');
    else setProblems(PROBLEM_LEVELS.ok.label, 'ok');
  };

  const updateLineCount = () => {
    if (lineCount instanceof HTMLElement) lineCount.textContent = `${model.getLineCount()} 行`;
  };

  const persist = () => {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, model.getValue());
      } catch {
        // 隐私模式下忽略存储失败。
      }
    }, 200);
  };

  const applyTheme = () => monaco.editor.setTheme(storedTheme());

  model.onDidChangeContent(() => {
    updateLineCount();
    persist();
  });
  updateLineCount();
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  // 语言服务：诊断 → 编辑器标记，补全/悬停由 monaco.lsp 自动接管。
  monaco.editor.onDidChangeMarkers(() => updateProblems());
  try {
    const connection = connectSnapshotLsp();
    connection.ready.then(
      () => {
        setLspStatus('语言服务就绪', 'connected');
        updateProblems();
      },
      () => setLspStatus('语言服务不可用', 'error'),
    );
  } catch {
    setLspStatus('语言服务不可用', 'error');
  }

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(bytes < 10240 ? 1 : 0)} KB`;
  };

  const parseServerTiming = (header: string | null) => {
    const timings: Record<string, number> = {};
    for (const entry of (header || '').split(',')) {
      const [name, ...parameters] = entry.trim().split(';');
      if (!['queue', 'render', 'image', 'total'].includes(name)) continue;
      const duration = parameters.find((parameter) => /^\s*dur\s*=/.test(parameter));
      const match = duration?.match(/^\s*dur\s*=\s*(\d+(?:\.\d+)?)\s*$/);
      if (match && Number.isFinite(Number(match[1]))) timings[name] = Number(match[1]);
    }
    return timings;
  };

  const setMetaText = (element: Element | null, value: string) => {
    if (!(element instanceof HTMLElement)) return;
    element.textContent = value;
    element.hidden = !value;
  };

  const showResponseTiming = (response: Response, requestMs: number) => {
    const timings = parseServerTiming(response.headers.get('server-timing'));
    const formatMs = (value: number) => `${value.toFixed(1)} ms`;
    setMetaText(renderDuration, timings.render === undefined ? '' : `渲染 ${formatMs(timings.render)}`);
    setMetaText(serverDuration, timings.total === undefined ? '' : `服务端 ${formatMs(timings.total)}`);
    setMetaText(queueDuration, timings.queue === undefined ? '' : `排队 ${formatMs(timings.queue)}`);
    setMetaText(imageDuration, timings.image === undefined ? '' : `图片获取 ${formatMs(timings.image)}`);
    setMetaText(requestDuration, `请求 ${Math.round(requestMs)} ms`);

    const downloads = response.headers.get('x-snapshot-image-count');
    setMetaText(imageCount, downloads && /^\d+$/.test(downloads) && Number(downloads) > 0
      ? `下载图片 ${downloads} 张` : '');

    const cacheValue = response.headers.get('x-snapshot-cache');
    setMetaText(cache, cacheValue === 'hit' ? '缓存命中' : cacheValue === 'miss' ? '实时渲染' : '');
  };

  const clearImage = () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    imageUrl = '';
    imageBlob = undefined;
    setMetaText(imageSize, '');
    setMetaText(fileSize, '');
    if (previewImage instanceof HTMLImageElement) {
      previewImage.removeAttribute('src');
      previewImage.hidden = true;
    }
    if (downloadButton instanceof HTMLButtonElement) downloadButton.disabled = true;
  };

  type ErrorPayload = { code?: string; message?: string; requestId?: string } | undefined;

  const showError = (payload: ErrorPayload, fallbackMessage: string) => {
    clearImage();
    setHidden(emptyState, true);
    setHidden(loadingState, true);
    setHidden(errorState, false);
    setHidden(resultMeta, true);
    if (errorCode instanceof HTMLElement) errorCode.textContent = payload?.code || 'REQUEST_FAILED';
    if (errorTitle instanceof HTMLElement) errorTitle.textContent = '渲染失败';
    if (errorMessage instanceof HTMLElement) errorMessage.textContent = payload?.message || fallbackMessage;
    if (requestId instanceof HTMLElement) {
      requestId.textContent = payload?.requestId ? `Request ID: ${payload.requestId}` : '';
    }
    setStatus('运行失败', 'error');
  };

  const render = async () => {
    const source = model.getValue();
    if (!apiUrl || !source.trim()) return;
    controller?.abort();
    const requestController = new AbortController();
    controller = requestController;

    if (renderButton instanceof HTMLButtonElement) renderButton.disabled = true;
    if (renderLabel instanceof HTMLElement) renderLabel.textContent = '运行中';
    setStatus('正在渲染', 'loading');
    setHidden(emptyState, true);
    setHidden(errorState, true);
    setHidden(previewImage, true);
    setHidden(resultMeta, true);
    setHidden(loadingState, false);

    try {
      const startedAt = performance.now();
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain; charset=utf-8', Accept: 'image/*, application/json' },
        body: source,
        mode: 'cors',
        credentials: 'omit',
        signal: requestController.signal,
      });
      if (requestController.signal.aborted) return;
      const contentType = response.headers.get('content-type') || '';

      if (!response.ok || !contentType.startsWith('image/')) {
        let payload: ErrorPayload;
        try {
          payload = await response.json();
        } catch {
          payload = undefined;
        }
        if (requestController.signal.aborted) return;
        showError(payload, `服务返回 ${response.status} ${response.statusText || ''}`.trim());
        showResponseTiming(response, performance.now() - startedAt);
        setHidden(resultMeta, false);
        return;
      }

      const blob = await response.blob();
      if (requestController.signal.aborted) return;
      const requestMs = performance.now() - startedAt;
      clearImage();
      imageBlob = blob;
      imageUrl = URL.createObjectURL(blob);

      if (previewImage instanceof HTMLImageElement) {
        previewImage.src = imageUrl;
        await previewImage.decode();
        if (requestController.signal.aborted) return;
        previewImage.hidden = false;
        setMetaText(imageSize, `${previewImage.naturalWidth} × ${previewImage.naturalHeight}`);
      }

      setMetaText(fileSize, formatBytes(blob.size));
      showResponseTiming(response, requestMs);

      setHidden(loadingState, true);
      setHidden(errorState, true);
      setHidden(resultMeta, false);
      if (downloadButton instanceof HTMLButtonElement) downloadButton.disabled = false;
      setStatus('渲染完成', 'success');
    } catch (error) {
      if (requestController.signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) return;
      const message = error instanceof Error && error.message !== 'Failed to fetch'
        ? error.message
        : '无法连接 Open Snapshot 服务，请稍后重试。';
      showError(undefined, message);
    } finally {
      if (controller === requestController) {
        if (renderButton instanceof HTMLButtonElement) renderButton.disabled = false;
        if (renderLabel instanceof HTMLElement) renderLabel.textContent = '运行';
      }
    }
  };

  const loadExample = (source: string) => {
    model.setValue(source);
    editor.setPosition({ lineNumber: 1, column: 1 });
    editor.revealLine(1);
    setStatus('等待运行', 'idle');
    clearImage();
    setHidden(loadingState, true);
    setHidden(errorState, true);
    setHidden(resultMeta, true);
    setHidden(emptyState, false);
  };

  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
    void render();
  });

  // 焦点在页面其它位置时，Ctrl/Cmd + Enter 同样触发运行。
  const onWindowKeyDown = (event: KeyboardEvent) => {
    if (!(event.ctrlKey || event.metaKey) || event.key !== 'Enter') return;
    if (editor.hasTextFocus()) return;
    event.preventDefault();
    void render();
  };
  window.addEventListener('keydown', onWindowKeyDown);

  exampleSelect?.addEventListener('change', () => {
    if (!(exampleSelect instanceof HTMLSelectElement)) return;
    const example = examples.find((item) => item.id === exampleSelect.value);
    if (!example) return;
    loadExample(example.source);
    try {
      localStorage.setItem(STORAGE_KEY, example.source);
    } catch {
      // 忽略存储失败。
    }
  });

  renderButton?.addEventListener('click', () => {
    void render();
  });

  resetButton?.addEventListener('click', () => {
    const selected = exampleSelect instanceof HTMLSelectElement
      ? examples.find((item) => item.id === exampleSelect.value) ?? examples[0]
      : examples[0];
    loadExample(selected?.source ?? '');
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // 忽略存储失败。
    }
    setStatus('已重置', 'idle');
  });

  copyButton?.addEventListener('click', async () => {
    if (!(copyButton instanceof HTMLButtonElement)) return;
    const selection = editor.getSelection();
    const text = selection && !selection.isEmpty() ? model.getValueInRange(selection) : model.getValue();
    await navigator.clipboard.writeText(text);
    const original = copyButton.textContent;
    copyButton.textContent = '已复制';
    window.setTimeout(() => { copyButton.textContent = original; }, 1200);
  });

  downloadButton?.addEventListener('click', () => {
    if (!imageBlob || !imageUrl) return;
    const extension = imageBlob.type === 'image/jpeg' ? 'jpg' : imageBlob.type.split('/')[1] || 'png';
    const anchor = document.createElement('a');
    anchor.href = imageUrl;
    anchor.download = `snapshot-${Date.now()}.${extension}`;
    anchor.click();
  });

  window.addEventListener('pagehide', () => {
    themeObserver.disconnect();
    window.removeEventListener('keydown', onWindowKeyDown);
    clearImage();
    editor.dispose();
    model.dispose();
  }, { once: true });
}

/** 示例源码通过 JSON script 标签传入，避免把整段 DSL 塞进 data-* 属性。 */
function readExamples(root: HTMLElement): Example[] {
  const holder = root.querySelector('[data-examples]');
  if (!(holder instanceof HTMLScriptElement)) return [];
  try {
    const parsed: unknown = JSON.parse(holder.textContent ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is Example =>
      typeof item === 'object' && item !== null &&
      typeof (item as Example).id === 'string' &&
      typeof (item as Example).source === 'string');
  } catch {
    return [];
  }
}

function readStorage(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** 复用 Starlight 的等宽字体栈，保持与文档代码块一致。 */
function monoFontFamily(): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue('--__sl-font-mono').trim();
  return value || 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
}
