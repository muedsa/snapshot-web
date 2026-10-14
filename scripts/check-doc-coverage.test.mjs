import test from 'node:test';
import assert from 'node:assert/strict';
import { constructorParameters, missingParameters } from './check-doc-coverage.mjs';

test('提取可空、继承与函数类型参数', () => {
  assert.deepEqual(constructorParameters('class Example(\n override val color: Int? = null,\n val factory: (() -> Int)? = null,\n)', 'Example'), ['color', 'factory']);
});
test('默认字符串中的括号不截断签名', () => {
  assert.deepEqual(constructorParameters('class Example(\n val name: String = ")",\n val size: Float = f(1f),\n)', 'Example'), ['name', 'size']);
});
test('正文或签名出现不算表格覆盖', () => {
  assert.deepEqual(missingParameters(['color', 'size'], '`size`\n| `color` | Int |\n'), ['size']);
});
test('允许第一列分组合并属性，但不把默认值当作属性', () => {
  assert.deepEqual(missingParameters(['width', 'height', 'null'], '| `width` / `height` | `null` |'), ['null']);
});
test('源码新增字段会暴露为缺失项', () => {
  const names = constructorParameters('class Example(\n val old: Int,\n val added: Int,\n)', 'Example');
  assert.deepEqual(missingParameters(names, '| `old` | 必填 |'), ['added']);
});
test('映射表可显式检查第二列，不接受其他列或正文', () => {
  assert.deepEqual(missingParameters(['gradientColors', 'colors', 'gradientStops'],
    '`gradientStops`\n| `colors` | `gradientColors` |\n', 1), ['colors', 'gradientStops']);
});
test('无法识别的声明必须失败，不能静默通过', () => {
  assert.throws(() => constructorParameters('class Other()', 'Example'));
  assert.throws(() => constructorParameters('class Example(\n val field: Int', 'Example'));
});
