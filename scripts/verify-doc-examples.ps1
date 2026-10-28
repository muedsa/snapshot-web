param(
    [string]$SnapshotRoot = (Join-Path $PSScriptRoot '../../snapshot'),
    [string]$GradleCache = $(if ($env:GRADLE_USER_HOME) { $env:GRADLE_USER_HOME } else { Join-Path $env:USERPROFILE '.gradle' }),
    [string]$SnapshotVersion = '0.0.0-SNAPSHOT',
    [switch]$FromSource,
    [string]$CompilerVersion,
    [string]$FontDirectory = (Join-Path $PSScriptRoot '../.astro/docs-verification/fonts'),
    [switch]$UpdateImages
)

# Windows x64 + Java 17；只读本地构建产物/Gradle 缓存，不下载或修改相邻仓库。
$ErrorActionPreference = 'Stop'
if ([Environment]::OSVersion.Platform -ne 'Win32NT' -or [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture -ne 'X64') {
    throw '此运行器仅配置了 Windows x64 的 Skiko 原生依赖。其他平台请使用对应 runtime。'
}
$taskRepo = Split-Path $PSScriptRoot -Parent
$taskSnapshot = (Resolve-Path -LiteralPath $SnapshotRoot).Path
$taskOutput = Join-Path $taskRepo '.astro/docs-verification/reference'
$taskWalkthroughs = Join-Path $taskRepo '.astro/docs-verification/walkthroughs'
$taskRun = Join-Path $taskRepo '.astro/docs-verification/run'
$taskVersions = Get-Content -LiteralPath (Join-Path $taskSnapshot 'gradle/libs.versions.toml') -Raw
$taskGuideFonts = @('NotoSansCJKsc-Regular.otf', 'NotoSansCJKsc-Bold.otf')
foreach ($taskName in $taskGuideFonts) {
    if (-not (Test-Path -LiteralPath (Join-Path $FontDirectory $taskName) -PathType Leaf)) {
        throw "缺少字体指南的资源 $taskName；按 guides/fonts 下载到 $FontDirectory，或用 -FontDirectory 指定目录。脚本不自动联网下载。"
    }
}
function Read-TaskVersion([string]$name) {
    $taskMatch = [regex]::Match($taskVersions, "(?m)^$name\s*=\s*`"([^`"]+)`"")
    if (-not $taskMatch.Success) { throw "找不到上游依赖版本：$name" }
    return $taskMatch.Groups[1].Value
}
function Find-TaskJar([string]$group, [string]$artifact, [string]$version) {
    $taskCachePath = Join-Path $GradleCache "caches/modules-2/files-2.1/$group/$artifact/$version"
    $taskJar = Get-ChildItem -LiteralPath $taskCachePath -Recurse -File -Filter "$artifact-$version.jar" |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $taskJar) { throw "缺少本地依赖 $group`:$artifact`:$version；先在 Snapshot 项目构建并缓存依赖。" }
    return $taskJar.FullName
}
function Find-TaskSnapshotJar([string]$module) {
    $taskJar = Get-Item -LiteralPath (Join-Path $taskSnapshot "$module/build/libs/snapshot-$module-$SnapshotVersion.jar")
    $taskNewer = Get-ChildItem -LiteralPath (Join-Path $taskSnapshot "$module/src/main") -Recurse -File |
        Where-Object { $_.LastWriteTime -gt $taskJar.LastWriteTime } | Select-Object -First 1
    if ($taskNewer) { throw "$module 的源码比 JAR 更新，请先在 Snapshot 项目执行 :core:jar :parser:jar。" }
    return $taskJar.FullName
}
$taskKotlinVersion = Read-TaskVersion 'kotlin'
if ($CompilerVersion) {
    if (-not $FromSource) { throw '-CompilerVersion 仅用于 -FromSource；不能用旧编译器验证新版预编译 JAR。' }
    Write-Warning "本次使用缓存编译器 $CompilerVersion 验证源码，不能视为上游声明的 $taskKotlinVersion 工具链验证。"
    $taskKotlinVersion = $CompilerVersion
}
$taskSkikoVersion = Read-TaskVersion 'skiko'
$taskStdlib = Find-TaskJar 'org.jetbrains.kotlin' 'kotlin-stdlib' $taskKotlinVersion
$taskAnnotations = Find-TaskJar 'org.jetbrains' 'annotations' '13.0'
$taskCoroutines = Find-TaskJar 'org.jetbrains.kotlinx' 'kotlinx-coroutines-core-jvm' '1.8.0'
$taskCompiler = @(
    (Find-TaskJar 'org.jetbrains.kotlin' 'kotlin-compiler-embeddable' $taskKotlinVersion),
    (Find-TaskJar 'org.jetbrains.kotlin' 'kotlin-build-tools-api' $taskKotlinVersion),
    (Find-TaskJar 'org.jetbrains.kotlin' 'kotlin-script-runtime' $taskKotlinVersion),
    (Find-TaskJar 'org.jetbrains.kotlin' 'kotlin-reflect' '1.6.10'),
    (Find-TaskJar 'org.jetbrains.kotlin' 'kotlin-daemon-embeddable' $taskKotlinVersion),
    $taskStdlib, $taskAnnotations, $taskCoroutines
)
$taskRuntime = @(
    (Find-TaskJar 'org.jetbrains.skiko' 'skiko-awt' $taskSkikoVersion),
    (Find-TaskJar 'org.jetbrains.skiko' 'skiko-awt-runtime-windows-x64' $taskSkikoVersion),
    $taskStdlib, $taskAnnotations, $taskCoroutines
    (Find-TaskJar 'org.jetbrains.kotlin' 'kotlin-test' $taskKotlinVersion),
    (Find-TaskJar 'org.jetbrains.kotlin' 'kotlin-test-junit5' $taskKotlinVersion),
    (Find-TaskJar 'org.junit.jupiter' 'junit-jupiter-api' '5.12.1'),
    (Find-TaskJar 'org.junit.platform' 'junit-platform-commons' '1.12.1'),
    (Find-TaskJar 'org.opentest4j' 'opentest4j' '1.3.0'),
    (Find-TaskJar 'org.apiguardian' 'apiguardian-api' '1.1.2')
)
if (-not $FromSource) { $taskRuntime += @((Find-TaskSnapshotJar 'core'), (Find-TaskSnapshotJar 'parser')) }
node (Join-Path $PSScriptRoot 'prepare-doc-examples.mjs')
if ($LASTEXITCODE -ne 0) { throw '抽取文档示例失败' }
node (Join-Path $PSScriptRoot 'prepare-doc-walkthroughs.mjs')
if ($LASTEXITCODE -ne 0) { throw '抽取组件与指南示例失败' }
$taskClasses = Join-Path $taskOutput 'classes'
New-Item -ItemType Directory -Force -Path $taskRun, "$taskClasses/fonts" | Out-Null
$taskFont = Join-Path $taskSnapshot 'testkit/src/main/resources/fonts/NotoSansSC.ttf'
Copy-Item -LiteralPath $taskFont -Destination "$taskClasses/fonts/NotoSansSC.ttf"
foreach ($taskName in $taskGuideFonts) {
    Copy-Item -LiteralPath (Join-Path $FontDirectory $taskName) -Destination (Join-Path "$taskClasses/fonts" $taskName)
}
$taskMain = @'
import com.muedsa.snapshot.paint.text.TextPainter
import org.jetbrains.skia.Data
import org.jetbrains.skia.FontMgr
import org.jetbrains.skia.paragraph.TypefaceFontProvider
import java.io.File

fun main(args: Array<String>) {
    val typeface = Data.makeFromBytes(File(args[3]).readBytes()).use { data ->
        checkNotNull(FontMgr.default.makeFromData(data))
    }
    val provider = TypefaceFontProvider().registerTypeface(typeface, "Noto Sans SC")
    TextPainter.FONT_COLLECTION.setAssetFontManager(provider)
    renderReferences(args.copyOfRange(0, 3))
    walkthroughs(File(args[4]))
    java.lang.ref.Reference.reachabilityFence(typeface)
    java.lang.ref.Reference.reachabilityFence(provider)
}
'@
Set-Content -LiteralPath "$taskOutput/VerifyDocs.kt" -Value $taskMain -Encoding utf8
$taskSources = @("$taskOutput/DocExamples.kt", "$taskOutput/VerifyDocs.kt")
$taskSources += @(Get-ChildItem -LiteralPath $taskWalkthroughs -Filter '*.kt' -File | ForEach-Object FullName)
# testkit 尚未发布；只读取它的源码来验证文档中的测试调用。
$taskSourceRoots = @((Join-Path $taskSnapshot 'testkit/src/main/kotlin'))
if ($FromSource) {
    $taskSourceRoots += @((Join-Path $taskSnapshot 'core/src/main/kotlin'), (Join-Path $taskSnapshot 'parser/src/main/kotlin'))
}
$taskSources += @(Get-ChildItem -LiteralPath $taskSourceRoots -Filter '*.kt' -File -Recurse | ForEach-Object FullName)
$taskArguments = @('-no-stdlib', '-no-reflect', '-jvm-target', '17', '-classpath', ($taskRuntime -join ';'), '-d', $taskClasses) + $taskSources
$taskQuoted = $taskArguments | ForEach-Object { '"' + $_.Replace('\', '/') + '"' }
[IO.File]::WriteAllLines("$taskOutput/compiler.args", $taskQuoted, [Text.UTF8Encoding]::new($false))
java -cp ($taskCompiler -join ';') org.jetbrains.kotlin.cli.jvm.K2JVMCompiler "@$taskOutput/compiler.args"
if ($LASTEXITCODE -ne 0) { throw 'Kotlin 示例编译失败' }
Push-Location -LiteralPath $taskRun
try {
    java "-Duser.home=$taskOutput" -cp ((@($taskClasses, $taskRun) + $taskRuntime) -join ';') `
        VerifyDocsKt $taskOutput (Join-Path $taskRepo 'public/examples') ($UpdateImages.IsPresent.ToString().ToLowerInvariant()) $taskFont $taskWalkthroughs
    if ($LASTEXITCODE -ne 0) { throw '文档示例渲染失败' }
} finally { Pop-Location }
Write-Output '通过编译/渲染不等于视觉验收，请检查输出图中的文字、对齐、裁剪与示例说明。'
