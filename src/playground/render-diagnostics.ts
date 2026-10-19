/** Open Snapshot 的可选属性诊断；不依赖 message 的文案或原始属性值。 */
type ErrorPosition = { offset?: number; line?: number; column?: number };
type ValueState = 'missing' | 'unassigned' | 'empty' | 'present';

export type AttributeDiagnostic = {
  attributeName: string;
  valueState: ValueState;
  elementName?: string;
  position?: ErrorPosition;
  format?: string;
  allowedValues: string[];
  examples: string[];
  truncated: boolean;
};

export type RenderError = {
  code?: string;
  message?: string;
  requestId?: string;
  diagnostic?: AttributeDiagnostic;
};

type EditorPosition = { lineNumber: number; column: number };
export type RenderSource = { source: string; version: number };
type RenderMarker = { position: EditorPosition; message: string; code?: string };

const VALUE_STATES: Record<ValueState, string> = {
  missing: '缺少属性',
  unassigned: '仅写属性名，未赋值',
  empty: '空字符串',
  present: '已赋值（包括纯空白）',
};

const record = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown> : undefined;
const string = (value: unknown) => typeof value === 'string' ? value : undefined;
const strings = (value: unknown): string[] => Array.isArray(value)
  ? value.filter((item): item is string => typeof item === 'string') : [];
const integer = (value: unknown, minimum: number) =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum ? value : undefined;

/** 旧服务、代理错误页或不完整的 JSON 都可回退到普通错误展示。 */
export function parseRenderError(value: unknown): RenderError | undefined {
  const payload = record(value);
  if (!payload) return undefined;
  const result: RenderError = {
    code: string(payload.code), message: string(payload.message), requestId: string(payload.requestId),
  };
  const diagnostic = record(payload.diagnostic);
  if (!diagnostic || typeof diagnostic.attributeName !== 'string' || !diagnostic.attributeName ||
      typeof diagnostic.valueState !== 'string' || !Object.hasOwn(VALUE_STATES, diagnostic.valueState)) return result;
  const position = record(diagnostic.position);
  result.diagnostic = {
    attributeName: diagnostic.attributeName,
    valueState: diagnostic.valueState as ValueState,
    elementName: string(diagnostic.elementName),
    position: position ? {
      offset: integer(position.offset, 0), line: integer(position.line, 1), column: integer(position.column, 1),
    } : undefined,
    format: string(diagnostic.format),
    allowedValues: strings(diagnostic.allowedValues),
    examples: strings(diagnostic.examples),
    truncated: diagnostic.truncated === true,
  };
  return result;
}

/** 图片错误即使附带属性诊断，也按 IMAGE_LOAD_ERROR 分类。 */
export function renderErrorTitle(code?: string): string {
  switch (code) {
    case 'PARSE_ERROR': return 'DSL 解析失败';
    case 'IMAGE_LOAD_ERROR': return '图片加载失败';
    case 'EMPTY_REQUEST': return '请输入 DSL';
    case 'REQUEST_TOO_LARGE': return '请求内容过大';
    case 'RENDER_TIMEOUT': return '渲染超时';
    case 'FONT_NOT_FOUND': return '未找到字体';
    case 'INVALID_QUERY': return '请求参数无效';
    case 'RATE_LIMITED': return '请求过于频繁';
    case 'QUEUE_FULL': return '服务队列已满';
    case 'QUEUE_TIMEOUT': return '排队超时';
    case 'SERVICE_UNAVAILABLE':
    case 'NOT_READY': return '服务暂不可用';
    case 'UNAUTHORIZED': return '请求未认证';
    case 'FORBIDDEN': return '无权访问服务';
    default: return '渲染失败';
  }
}

/** UTF-16 与 Monaco 一致。只接受完整、未越界且相互一致的位置，不猜测缺失分量。 */
export function resolveDiagnosticPosition(position: ErrorPosition | undefined, source: string): EditorPosition | undefined {
  if (!position) return undefined;
  const lines = source.split(/\r\n|\r|\n/);
  const starts = [0, ...Array.from(source.matchAll(/\r\n|\r|\n/g), (match) => match.index + match[0].length)];
  const offset = integer(position.offset, 0);
  let line = integer(position.line, 1);
  let column = integer(position.column, 1);
  if (offset !== undefined) {
    if (offset > source.length) return undefined;
    const index = starts.findLastIndex((start) => start <= offset);
    const resolvedColumn = offset - starts[index] + 1;
    if ((line !== undefined && line !== index + 1) || (column !== undefined && column !== resolvedColumn)) return undefined;
    line = index + 1;
    column = resolvedColumn;
  }
  if (line === undefined || column === undefined || line > lines.length || column > lines[line - 1].length + 1) return undefined;
  return { lineNumber: line, column };
}

/** DOM 只写 textContent；编辑器适配器只操作独立的服务端 marker，不覆盖 LSP。 */
export function createRenderDiagnostics(root: ParentNode, editor: {
  getVersionId: () => number;
  setMarker: (marker?: RenderMarker) => void;
  revealPosition: (position: EditorPosition) => void;
}) {
  const panel = root.querySelector<HTMLElement>('[data-diagnostic]');
  const locateButton = root.querySelector<HTMLButtonElement>('[data-diagnostic-locate]');
  const locationNote = root.querySelector<HTMLElement>('[data-diagnostic-location-note]');
  const truncatedNote = root.querySelector<HTMLElement>('[data-diagnostic-truncated]');
  let active: { payload: RenderError; snapshot: RenderSource; position?: EditorPosition } | undefined;

  const field = (name: string, value: string) => {
    const element = root.querySelector<HTMLElement>(`[data-diagnostic-${name}]`);
    if (!element) return;
    element.textContent = value;
    const row = element.closest<HTMLElement>('[data-diagnostic-row]');
    if (row) row.hidden = !value;
  };

  const refreshLocation = () => {
    const current = active && active.snapshot.version === editor.getVersionId();
    const position = current ? active?.position : undefined;
    if (locateButton) locateButton.hidden = !position;
    if (locationNote) {
      locationNote.textContent = !active ? '' : !current
        ? '代码已修改，此诊断对应上次提交；请重新运行。'
        : !position ? '服务端未提供可定位的完整位置，请结合本次提交的 DSL 检查。' : '';
      locationNote.hidden = !locationNote.textContent;
    }
    editor.setMarker(position && active ? {
      position, code: active.payload.code,
      message: active.payload.message || `${renderErrorTitle(active.payload.code)}：${active.payload.diagnostic?.attributeName}`,
    } : undefined);
  };

  const onLocate = () => {
    // 点击时再检查版本，不能把旧响应的位置套到新文档上。
    refreshLocation();
    if (active?.position && active.snapshot.version === editor.getVersionId()) editor.revealPosition(active.position);
  };
  locateButton?.addEventListener('click', onLocate);

  const clear = () => {
    active = undefined;
    if (panel) panel.hidden = true;
    refreshLocation();
  };

  return {
    clear,
    onContentChange: refreshLocation,
    show(payload: RenderError | undefined, snapshot?: RenderSource) {
      clear();
      const diagnostic = payload?.diagnostic;
      if (!diagnostic || !snapshot) return;
      const position = resolveDiagnosticPosition(diagnostic.position, snapshot.source);
      active = { payload, snapshot, position };
      field('attribute', diagnostic.attributeName);
      field('element', diagnostic.elementName ? `<${diagnostic.elementName}>` : '');
      field('state', VALUE_STATES[diagnostic.valueState]);
      field('format', diagnostic.format ?? '');
      field('values', diagnostic.allowedValues.join(' · '));
      field('examples', diagnostic.examples.join('\n'));
      const reported = diagnostic.position;
      const location = position ? `第 ${position.lineNumber} 行，第 ${position.column} 列` : [
        reported?.line === undefined ? '' : `第 ${reported.line} 行`,
        reported?.column === undefined ? '' : `第 ${reported.column} 列`,
        reported?.offset === undefined ? '' : `偏移 ${reported.offset}（从 0 开始）`,
      ].filter(Boolean).join('，');
      field('position', location);
      if (truncatedNote) truncatedNote.hidden = !diagnostic.truncated;
      if (panel) panel.hidden = false;
      refreshLocation();
    },
    dispose() {
      clear();
      locateButton?.removeEventListener('click', onLocate);
    },
  };
}
