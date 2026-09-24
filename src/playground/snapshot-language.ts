// Snapshot DSL 在 Monaco 中的语言定义：语法高亮、括号/注释规则与主题。
// 语义能力（补全、悬停、诊断）由 snapshot-lsp 通过 LSP 提供，这里只负责词法层面。
import type * as Monaco from 'monaco-editor';

export const SNAPSHOT_LANGUAGE_ID = 'snapshot';
export const SNAPSHOT_DARK_THEME = 'snapshot-dark';
export const SNAPSHOT_LIGHT_THEME = 'snapshot-light';

/** 标签、属性名区分大小写，与 Snapshot 解析器一致。 */
const monarchLanguage: Monaco.languages.IMonarchLanguage = {
  defaultToken: '',
  ignoreCase: false,
  brackets: [{ open: '<', close: '>', token: 'tag.delimiter' }],
  tokenizer: {
    root: [
      [/<!--/, 'comment', '@comment'],
      [/<!\[CDATA\[/, 'string.quote', '@cdata'],
      // 分组动作数组按捕获组一一对应（不含整体匹配），且分组需连续覆盖整段匹配。
      [/(<\/)([A-Za-z][\w:.-]*)(\s*>)/, ['tag.delimiter', 'tag', 'tag.delimiter']],
      [/(<\/?)([A-Za-z][\w:.-]*)/, ['tag.delimiter', 'tag'], '@tag'],
      [/</, 'tag.delimiter'],
      [/[^<]+/, ''],
    ],
    // 开始标签内部：属性名、等号与取值。
    tag: [
      [/\s+/, ''],
      [/\/>/, 'tag.delimiter', '@pop'],
      [/>/, 'tag.delimiter', '@pop'],
      [/[A-Za-z_][\w:.-]*/, 'attribute.name'],
      [/=/, 'delimiter'],
      [/"/, 'string.quote', '@valueDouble'],
      [/'/, 'string.quote', '@valueSingle'],
      [/[^\s"'>/]+/, 'string'],
    ],
    // 属性取值：颜色、数值单独着色，其余按字符串处理。
    valueDouble: [
      [/#[0-9a-fA-F]{3,8}(?![\w])/, 'number.hex'],
      [/\d+(?:\.\d+)?/, 'number'],
      [/[^"\d]+/, 'string'],
      [/"/, 'string.quote', '@pop'],
    ],
    valueSingle: [
      [/#[0-9a-fA-F]{3,8}(?![\w])/, 'number.hex'],
      [/\d+(?:\.\d+)?/, 'number'],
      [/[^'\d]+/, 'string'],
      [/'/, 'string.quote', '@pop'],
    ],
    comment: [
      [/-->/, 'comment', '@pop'],
      [/./, 'comment'],
    ],
    cdata: [
      [/\]\]>/, 'string.quote', '@pop'],
      [/./, 'string'],
    ],
  },
};

const languageConfiguration: Monaco.languages.LanguageConfiguration = {
  // Snapshot 只支持块注释，Ctrl+/ 会插入 <!-- -->。
  comments: { blockComment: ['<!-- ', ' -->'] },
  autoClosingPairs: [
    { open: '"', close: '"' },
    { open: "'", close: "'" },
    { open: '<!--', close: '-->' },
  ],
  surroundingPairs: [
    { open: '"', close: '"' },
    { open: "'", close: "'" },
  ],
  folding: {
    markers: {
      start: /^\s*<!--\s*#?region\b/,
      end: /^\s*<!--\s*#?endregion\b/,
    },
  },
};

type ThemeRule = Monaco.editor.ITokenThemeRule;

const darkRules: ThemeRule[] = [
  { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
  { token: 'tag', foreground: '38bdf8' },
  { token: 'tag.delimiter', foreground: '64748b' },
  { token: 'attribute.name', foreground: 'bae6fd' },
  { token: 'delimiter', foreground: '64748b' },
  { token: 'string', foreground: '86efac' },
  { token: 'string.quote', foreground: '4ade80' },
  { token: 'number', foreground: 'fcd34d' },
  { token: 'number.hex', foreground: 'f472b6' },
];

const lightRules: ThemeRule[] = [
  { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
  { token: 'tag', foreground: '0369a1' },
  { token: 'tag.delimiter', foreground: '64748b' },
  { token: 'attribute.name', foreground: '0c4a6e' },
  { token: 'delimiter', foreground: '64748b' },
  { token: 'string', foreground: '15803d' },
  { token: 'string.quote', foreground: '16a34a' },
  { token: 'number', foreground: 'b45309' },
  { token: 'number.hex', foreground: 'be185d' },
];

/** 深色主题沿用站点调色板（sl-color-black / slate 系列）。 */
const darkTheme: Monaco.editor.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  rules: darkRules,
  colors: {
    'editor.background': '#020617',
    'editor.foreground': '#e2e8f0',
    'editorGutter.background': '#020617',
    'editorLineNumber.foreground': '#334155',
    'editorLineNumber.activeForeground': '#94a3b8',
    'editor.lineHighlightBackground': '#0f172a99',
    'editor.selectionBackground': '#0ea5e959',
    'editor.inactiveSelectionBackground': '#0ea5e933',
    'editorIndentGuide.background1': '#1e293b',
    'editorIndentGuide.activeBackground1': '#334155',
    'editorCursor.foreground': '#38bdf8',
    'editorWidget.background': '#0f172a',
    'editorWidget.border': '#1e293b',
    'editorSuggestWidget.background': '#0f172a',
    'editorSuggestWidget.border': '#1e293b',
    'editorSuggestWidget.selectedBackground': '#1e293b',
    'editorSuggestWidget.highlightForeground': '#38bdf8',
    'editorHoverWidget.background': '#0f172a',
    'editorHoverWidget.border': '#1e293b',
    'editorError.foreground': '#f43f5e',
    'editorWarning.foreground': '#f59e0b',
    'editorOverviewRuler.border': '#00000000',
    'scrollbarSlider.background': '#33415566',
    'scrollbarSlider.hoverBackground': '#47556999',
    'scrollbarSlider.activeBackground': '#64748bcc',
  },
};

const lightTheme: Monaco.editor.IStandaloneThemeData = {
  base: 'vs',
  inherit: true,
  rules: lightRules,
  colors: {
    'editor.background': '#ffffff',
    'editor.foreground': '#0f172a',
    'editorGutter.background': '#ffffff',
    'editorLineNumber.foreground': '#94a3b8',
    'editorLineNumber.activeForeground': '#475569',
    'editor.lineHighlightBackground': '#f1f5f999',
    'editor.selectionBackground': '#0ea5e933',
    'editorIndentGuide.background1': '#e2e8f0',
    'editorIndentGuide.activeBackground1': '#cbd5e1',
    'editorCursor.foreground': '#0284c7',
    'editorSuggestWidget.highlightForeground': '#0284c7',
    'editorWidget.border': '#d8e0e9',
    'editorOverviewRuler.border': '#00000000',
    'scrollbarSlider.background': '#94a3b833',
    'scrollbarSlider.hoverBackground': '#94a3b866',
    'scrollbarSlider.activeBackground': '#64748b99',
  },
};

let registered = false;

/** 注册语言、语言配置与两套主题，重复调用无效。 */
export function registerSnapshotLanguage(monaco: typeof Monaco): void {
  if (registered) return;
  registered = true;

  monaco.languages.register({
    id: SNAPSHOT_LANGUAGE_ID,
    extensions: ['.snapshot'],
    aliases: ['Snapshot', 'snapshot'],
  });
  monaco.languages.setMonarchTokensProvider(SNAPSHOT_LANGUAGE_ID, monarchLanguage);
  monaco.languages.setLanguageConfiguration(SNAPSHOT_LANGUAGE_ID, languageConfiguration);
  monaco.editor.defineTheme(SNAPSHOT_DARK_THEME, darkTheme);
  monaco.editor.defineTheme(SNAPSHOT_LIGHT_THEME, lightTheme);
}

/** 按站点当前主题（<html data-theme>）返回对应的 Monaco 主题名。 */
export function snapshotThemeFor(theme: string | undefined): string {
  return theme === 'light' ? SNAPSHOT_LIGHT_THEME : SNAPSHOT_DARK_THEME;
}
