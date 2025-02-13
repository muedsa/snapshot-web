import org.jetbrains.kotlin.gradle.tasks.KotlinCompile

val osName: String = System.getProperty("os.name")
val targetOs = when {
    osName == "Mac OS X" -> "macos"
    osName.startsWith("Win") -> "windows"
    osName.startsWith("Linux") -> "linux"
    else -> error("Unsupported OS: $osName")
}
var targetArch = when (val osArch: String = System.getProperty("os.arch")) {
    "x86_64", "amd64" -> "x64"
    "aarch64" -> "arm64"
    else -> error("Unsupported arch: $osArch")
}

val ktor_version: String by project
val kotlin_css_version: String by project
val kotlin_version: String by project
val logback_version: String by project
val prometheus_version: String by project
val loki4j_version: String by project
val httpclient_version: String by project

plugins {
    kotlin("jvm") version "2.1.10"
    id("io.ktor.plugin") version "3.1.0"
}

group = "com.muedsa.snapshot-web"
version = "0.0.0"

application {
    mainClass.set("com.muedsa.snapshot.web.ApplicationKt")

    val isDevelopment: Boolean = project.ext.has("development")
    applicationDefaultJvmArgs = listOf("-Dio.ktor.development=$isDevelopment")
}

repositories {
    mavenCentral()
    maven { url = uri("https://maven.pkg.jetbrains.space/public/p/compose/dev") }
    flatDir {
        dir("libs")
    }
}

dependencies {
    implementation("io.ktor:ktor-server-cors-jvm")
    implementation("io.ktor:ktor-server-core-jvm")
    implementation("io.ktor:ktor-server-netty-jvm")
    implementation("ch.qos.logback:logback-classic:$logback_version")

    implementation("com.github.loki4j:loki-logback-appender:$loki4j_version")
    implementation("org.apache.httpcomponents:httpclient:$httpclient_version")

    // ktor plugin
    implementation("io.ktor:ktor-server-rate-limit:$ktor_version")
    implementation("io.ktor:ktor-server-call-logging:$ktor_version")
    implementation("io.ktor:ktor-server-call-id:$ktor_version")
    implementation("io.ktor:ktor-server-metrics-micrometer:$ktor_version")
    implementation("io.micrometer:micrometer-registry-prometheus:$prometheus_version")

    implementation("com.muedsa.snapshot:snapshot-core:0.0.0-SNAPSHOT")
    implementation("com.muedsa.snapshot:snapshot-parser:0.0.0-SNAPSHOT")
    implementation("org.jetbrains.skiko:skiko-awt-runtime-$targetOs-$targetArch:0.0.0-SNAPSHOT")

    testImplementation("io.ktor:ktor-server-tests-jvm")
    testImplementation("org.jetbrains.kotlin:kotlin-test-junit:$kotlin_version")
}

java {
    toolchain.languageVersion.set(JavaLanguageVersion.of(11))
}

tasks.withType<KotlinCompile> {
    kotlinOptions.jvmTarget = "11"
}

ktor {
    docker {
        jreVersion.set(JavaVersion.VERSION_11)
        localImageName.set("snapshot-web")
        imageTag.set("0.0.0")
        portMappings.set(listOf(
            io.ktor.plugin.features.DockerPortMapping(
                80,
                8080,
                io.ktor.plugin.features.DockerPortMappingProtocol.TCP
            )
        ))
    }
}