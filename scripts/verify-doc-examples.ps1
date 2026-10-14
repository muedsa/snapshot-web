param(
    [string]$SnapshotRoot = (Join-Path $PSScriptRoot '../../snapshot'),
    [string]$GradleCache = $(if ($env:GRADLE_USER_HOME) { $env:GRADLE_USER_HOME } else { Join-Path $env:USERPROFILE '.gradle' }),
    [string]$SnapshotVersion = '0.0.0-SNAPSHOT',
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
$taskVersions = Get-Content -LiteralPath (Join-Path $taskSnapshot 'gradle/libs.versions.toml') -Raw
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
    (Find-TaskSnapshotJar 'core'),
    (Find-TaskSnapshotJar 'parser'),
    (Find-TaskJar 'org.jetbrains.skiko' 'skiko-awt' $taskSkikoVersion),
    (Find-TaskJar 'org.jetbrains.skiko' 'skiko-awt-runtime-windows-x64' $taskSkikoVersion),
    $taskStdlib, $taskAnnotations, $taskCoroutines
)
node (Join-Path $PSScriptRoot 'prepare-doc-examples.mjs')
if ($LASTEXITCODE -ne 0) { throw '抽取文档示例失败' }
java -cp ($taskCompiler -join ';') org.jetbrains.kotlin.cli.jvm.K2JVMCompiler `
    -no-stdlib -no-reflect -jvm-target 17 -classpath ($taskRuntime -join ';') `
    -d (Join-Path $taskOutput 'classes') (Join-Path $taskOutput 'DocExamples.kt')
if ($LASTEXITCODE -ne 0) { throw 'Kotlin 示例编译失败' }
java "-Duser.home=$taskOutput" -cp ((@((Join-Path $taskOutput 'classes')) + $taskRuntime) -join ';') `
    DocExamplesKt $taskOutput (Join-Path $taskRepo 'public/examples') ($UpdateImages.IsPresent.ToString().ToLowerInvariant())
if ($LASTEXITCODE -ne 0) { throw '文档示例渲染失败' }
Write-Output '通过编译/渲染不等于视觉验收，请检查输出图中的文字、对齐、裁剪与示例说明。'
