import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// 从实际页面抽取代码，避免手写另一套示例导致验证与文档脱节。
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(repo, '.astro/docs-verification/reference');
mkdirSync(output, { recursive: true });
function blocks(page, language, expected) {
  const text = readFileSync(resolve(repo, `src/content/docs/${page}.mdoc`), 'utf8');
  const result = [...text.matchAll(new RegExp('```' + language + '\\r?\\n([\\s\\S]*?)```', 'g'))].map(m => m[1]);
  if (result.length !== expected) throw new Error(`${page}: 期望 ${expected} 段 ${language}，实际 ${result.length}，请同步验证清单`);
  return result;
}
const references = ['text-style', 'text-layout', 'box-decoration', 'borders', 'box-shadow', 'decoration-image', 'gradients'];
const examples = references.map(name => {
  const code = blocks(`reference/${name}`, 'kotlin', 1)[0];
  return { name, code: name === 'decoration-image' ? code : `val png = SnapshotPNG {\n${code}\n}`, publish: false };
});
const visualNames = ['box-fit-comparison', 'gradient-comparison', 'inline-alignment-comparison', 'clip-comparison'];
blocks('guides/visual-reference', 'kotlin', visualNames.length).forEach((code, i) => {
  examples.push({ name: visualNames[i], code, publish: true });
});
const xml = blocks('reference/parser-text', 'xml', 2);
xml.forEach((code, i) => writeFileSync(resolve(output, `parser-text-${i + 1}.xml`), code));

const visualImports = blocks('guides/visual-reference', 'text', 1)[0];
const functions = examples.map((example, i) => `fun example${i}(): ByteArray {\n${example.code}\nreturn png\n}`);
const calls = examples.map((example, i) =>
  `save("${example.name}", example${i}(), output, if (${example.publish} && updateImages) publicImages else null)`);
const source = `${visualImports}
import org.jetbrains.skia.paragraph.DecorationStyle
import org.jetbrains.skia.paragraph.StrutStyle
import com.muedsa.snapshot.parser.Parser
import java.io.File
import java.io.ByteArrayInputStream
import java.io.StringReader
import javax.imageio.ImageIO

${functions.join('\n\n')}

fun save(name: String, png: ByteArray, output: File, publish: File? = null, width: Int? = null, height: Int? = null) {
    val image = checkNotNull(ImageIO.read(ByteArrayInputStream(png))) { "$name: 不是可解码图片" }
    check(image.width > 0 && image.height > 0) { "$name: 空图片" }
    check(width == null || width == image.width) { "$name: 宽度与文档不一致" }
    check(height == null || height == image.height) { "$name: 高度与文档不一致" }
    File(output, "$name.png").writeBytes(png)
    if (publish != null) {
        publish.mkdirs()
        File(publish, "$name.png").writeBytes(png)
    }
    println("PASS: $name -> " + image.width + "x" + image.height + ", " + png.size + " bytes")
}

fun main(args: Array<String>) {
    val output = File(args[0])
    val publicImages = File(args[1])
    val updateImages = args[2] == "true"
    ${calls.join('\n    ')}
    val parser = Parser()
    for (index in 1..${xml.length}) {
        val name = "parser-text-$index"
        val png = parser.parse(StringReader(File(output, "$name.xml").readText())).snapshot()
        save(name, png, output, width = 480, height = 200)
    }
}
`;
writeFileSync(resolve(output, 'DocExamples.kt'), source);
console.log(`已抽取 ${examples.length} 段 Kotlin 与 ${xml.length} 段 XML 到 ${output}`);
