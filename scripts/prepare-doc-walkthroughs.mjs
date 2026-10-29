import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// 直接抽取正文，不维护第二套示例。只运行明确列入清单的代码，排除网络与故意错误的片段。
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(repo, '.astro/docs-verification/walkthroughs');
mkdirSync(output, { recursive: true });
function blocks(page, language = 'kotlin') {
  const content = readFileSync(resolve(repo, `src/content/docs/${page}.mdoc`), 'utf8');
  return [...content.matchAll(new RegExp('```' + language + '\\r?\\n([\\s\\S]*?)```', 'g'))].map(m => m[1]);
}
const snippets = [];
for (const file of readdirSync(resolve(repo, 'src/content/docs/widgets'), { recursive: true }).sort()) {
  if (!file.endsWith('.mdoc') || file.includes('cached-network-image')) continue;
  const page = 'widgets/' + file.replaceAll('\\', '/').replace(/\.mdoc$/, '');
  const selected = blocks(page).filter(code => !/^(fun |content:|interface |EdgeInsets\.)/.test(code) && !code.includes('/*'));
  if (!selected.length) throw new Error(`${page}: 没有可运行组件片段`);
  selected.forEach((code, i) => snippets.push({ name: page.replaceAll('/', '-') + '-' + (i + 1), code }));
}
snippets.push({ name: 'concepts-card', code: blocks('guides/concepts')[0] });
snippets.push({ name: 'layout-flex', code: blocks('guides/layout')[1] });
snippets.push({ name: 'painting-card', code: blocks('guides/painting')[0] });

const programs = [];
for (const page of ['quickstart', 'parser', 'rendering', 'fonts', 'data-templates', 'testing', 'reusable-components', 'reference/parser-errors']) {
  const sourcePage = page.startsWith('reference/') ? page : 'guides/' + page;
  // 错误参考还包含诊断 API 片段；这里只执行带 main 的完整自定义标签程序。
  const completePrograms = blocks(sourcePage).filter(code => code.startsWith('import ')
    && (page !== 'reference/parser-errors' || /fun main\(/.test(code)));
  for (const code of completePrograms) {
    const pkg = `docs.program${programs.length}`;
    const filename = `Program${programs.length}.kt`;
    writeFileSync(resolve(output, filename), `package ${pkg}\n${code}`);
    const entry = /fun main\(/.test(code) ? `${pkg}.main()`
      : /fun orderCard\(/.test(code) ? `save("data-kotlin", ${pkg}.orderCard("订单 <测试>", listOf("A", "B")), output)`
      : /fun templateCard\(/.test(code) ? `save("data-template", ${pkg}.templateCard("A < B & C ]]> D"), output)`
      : /class CardLayoutTest/.test(code) ? `${pkg}.CardLayoutTest().cardHasExpectedSize()`
      : /class CenteredBoxTest/.test(code) ? `${pkg}.CenteredBoxTest().redBoxIsCentered()`
      : /class CardGoldenTest/.test(code) ? `System.setProperty("snapshotTest.mode", "record")
        ${pkg}.CardGoldenTest().redCard()
        System.setProperty("snapshotTest.mode", "verify")
        ${pkg}.CardGoldenTest().redCard()
        System.setProperty("snapshotTest.mode", "update")
        ${pkg}.CardGoldenTest().redCard()` : null;
    if (!entry) throw new Error(`${page}: 请为完整程序提供验证入口`);
    programs.push({ filename, entry, page, pkg });
  }
}
const xmlFiles = [];
for (const page of ['guides/examples', 'guides/parser', 'guides/fonts', 'guides/layout', 'reference/parser-tags']) {
  const all = blocks(page, 'xml');
  for (const [i, code] of all.entries()) {
    if (!/<Snapshot(?:\s|>)/.test(code) || !code.includes('</Snapshot>') || /\burl=/.test(code)) continue;
    const name = page.replaceAll('/', '-') + '-' + (i + 1);
    writeFileSync(resolve(output, name + '.xml'), code);
    xmlFiles.push(name);
  }
}
const imports = blocks('guides/visual-reference', 'text')[0];
const pixelCode = blocks('guides/testing').find(code => code.startsWith('Snapshot {'));
if (!pixelCode) throw new Error('缺少像素断言示例');
const fonts = programs.find(p => p.page === 'fonts');
const reusable = programs.find(p => p.page === 'reusable-components');
const customParser = programs.find(p => p.page === 'reference/parser-errors');
const constraintTemplates = xmlFiles.filter(name => name.startsWith('guides-layout-'));
if (constraintTemplates.length !== 2) throw new Error('缺少紧约束与 Align 的两个对比模板');
writeFileSync(resolve(output, 'Walkthroughs.kt'), `${imports}
import com.muedsa.snapshot.material.ELEVATION_MAP
import com.muedsa.snapshot.rendering.ClipBehavior
import com.muedsa.snapshot.rendering.box.BoxConstraints
import com.muedsa.snapshot.rendering.box.RenderColoredBox
import com.muedsa.snapshot.paint.text.TextOverflow
import com.muedsa.snapshot.rendering.text.RenderParagraph
import com.muedsa.snapshot.parser.Parser
import com.muedsa.snapshot.parser.ParseException
import com.muedsa.snapshot.parser.widget.WidgetParserManager
import ${reusable.pkg}.OrderLine as documentationOrderLine
import org.jetbrains.skia.*
import org.jetbrains.skia.paragraph.BaselineMode
import java.io.File
import java.io.StringReader
import java.nio.file.Files
import java.nio.file.Path

lateinit var image: Image
val successIcon: Image get() = image

${snippets.map((s, i) => `fun widget${i}() = SnapshotPNG {\n${s.code}\n}`).join('\n\n')}

fun walkthroughs(output: File) {
    output.mkdirs()
    image = SnapshotImage { Container(width = 80f, height = 40f, color = Color.BLUE) }
    image.encodeToData(EncodedImageFormat.PNG)!!.use { data ->
        File("cover.png").writeBytes(data.bytes)
        File("photo.png").writeBytes(data.bytes)
    }
    ${snippets.map((s, i) => `save("${s.name}", widget${i}(), output)`).join('\n    ')}
    // 关键布局验证包含子节点几何，避免“成功编码但内容为零”也算通过。
    val expanded = rootLayout { ${snippets.find(s => s.name === 'widgets-layout-expanded-1').code} }
    expanded.findType<RenderColoredBox> { it.color == 0xFF38BDF8.toInt() }!!.assertSize(400f, 120f)
    val flexible = rootLayout { ${snippets.find(s => s.name === 'widgets-layout-flexible-1').code} }
    flexible.findType<RenderColoredBox> { it.color == 0xFFA78BFA.toInt() }!!.assertGlobalRect(80f, 0f, 400f, 120f)
    val padding = rootLayout { ${snippets.find(s => s.name === 'widgets-layout-padding-1').code} }
    padding.assertSize(168f, 92f)
    padding.findType<RenderColoredBox> { true }!!.assertGlobalRect(24f, 16f, 120f, 60f)
    val fraction = rootLayout { ${snippets.find(s => s.name === 'widgets-layout-fractionally-sized-box-1').code} }
    fraction.assertSize(240f, 160f)
    fraction.findType<RenderColoredBox> { true }!!.assertGlobalRect(60f, 40f, 120f, 80f)
    ${pixelCode}
    // 每次运行用独立基准目录；verify 同时从该目录对应的 classpath 读取。
    val baseline = File("golden/card/red.png")
    check(!baseline.exists() || baseline.delete())
    System.setProperty("snapshotTest.goldenRoot", File("golden").absolutePath)
    ${programs.map(p => p.entry + '\n    println("PASS: ' + p.page + ' / ' + p.pkg + '")').join('\n    ')}
    // 验证业务组件的实际布局约定：金额宽 96、标题宽 352，而不只检查 PNG 可编码。
    val orderLine = rootLayout {
        SizedBox(width = 484f, height = 48f) {
            documentationOrderLine(${reusable.pkg}.OrderLineData("A long order title", "128.00"))
        }
    }
    orderLine.assertSize(484f, 48f)
    orderLine.findType<RenderParagraph> {
        val plain = StringBuffer()
        it.text.computeToPlainText(plain)
        plain.toString() == "128.00"
    }!!.let { assertApproxEq(it.size.width, 96f) }
    orderLine.findType<RenderParagraph> {
        val plain = StringBuffer()
        it.text.computeToPlainText(plain)
        plain.toString() == "A long order title"
    }!!.let { assertApproxEq(it.size.width, 352f) }
    val cardParser = Parser(WidgetParserManager.withDefaults().also { it.register(${customParser.pkg}.MyCardParser()) })
    for ((variant, height) in listOf("small" to 96f, "large" to 144f)) {
        val card = cardParser.parse(StringReader("<Snapshot><MyCard variant='" + variant + "'/></Snapshot>"))
        rootLayout { attach(card.createWidget()) }.assertSize(320f, height)
    }
    for (attribute in listOf("variant='medium'", "")) {
        try {
            cardParser.parse(StringReader("<Snapshot><MyCard " + attribute + "/></Snapshot>")).createWidget()
            error("自定义属性应拒绝无效或缺失的 variant")
        } catch (error: ParseException) {
            check(error.attributeDiagnostic?.attributeName == "variant")
            check(error.attributeDiagnostic?.valueInfo?.allowedValues == listOf("small", "large"))
        }
    }
    // 直接使用文档中的 DSL，验证父紧约束与 Align 放松约束后的尺寸、位置。
    ${constraintTemplates.map((name, i) => `run {
        val element = Parser().parse(StringReader(File(output, "${name}.xml").readText()))
        val tree = rootLayout { attach(element.createWidget()) }
        tree.assertSize(200f, 100f)
        tree.findType<RenderColoredBox> { it.color == 0xFF38BDF8.toInt() }!!
            .assertGlobalRect(${i === 0 ? '0f, 0f, 200f, 100f' : '60f, 30f, 80f, 40f'})
    }`).join('\n    ')}
    // 验证文本插入保留危险分隔符，而不只检查输出可编码。
    val raw = " A < B & C ]]> D "
    val escaped = ${programs.find(p => p.page === 'data-templates' && p.entry.includes('templateCard')).pkg}.dslText(raw)
    val tree = Parser().parse(StringReader("<Snapshot><Text><Raw>" + escaped + "</Raw></Text></Snapshot>"))
    val plain = StringBuffer()
    (tree.createWidget().createRenderBox() as RenderParagraph).text.computeToPlainText(plain)
    check(plain.toString() == raw) { "CDATA 拼接没有原样保留输入文字" }
    ${fonts.pkg}.AppFonts.install()
    val parser = Parser()
    ${xmlFiles.map(name => `save("${name}", parser.parse(StringReader(File(output, "${name}.xml").readText())).snapshot(), output)`).join('\n    ')}
    image.close()
    println("PASS: 子节点几何、复用组件、Parser 扩展与属性诊断、像素采样、指南程序和 Golden record/verify/update")
}
`);
writeFileSync(resolve(output, 'manifest.json'), JSON.stringify({ snippets: snippets.map(s => s.name), programs, xmlFiles }, null, 2));
console.log(`已抽取 ${snippets.length} 个组件片段、${programs.length} 个完整程序、${xmlFiles.length} 个 DSL 模板到 ${output}`);
