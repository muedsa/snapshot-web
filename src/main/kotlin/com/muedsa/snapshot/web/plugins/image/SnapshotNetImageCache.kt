package com.muedsa.snapshot.web.plugins.image

import com.muedsa.snapshot.parser.SnapshotElement
import io.ktor.http.ContentType
import io.ktor.server.application.*
import io.ktor.server.config.tryGetString
import io.ktor.server.response.respondText
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.routing

private var MEMORY_IMAGE_CACHE: MemoryImageCache? = null

fun Application.configureNetImageCache() {
    val imageConfig = environment.config.config("snapshot.image")
    val maxImageNumOnce = imageConfig.tryGetString("max-image-num-once")?.toInt() ?: 10
    val maxSingleImageSize = imageConfig.tryGetString("max-single-image-size")?.toInt() ?: (1024 * 1024)
    val memoryCacheNumLimit = imageConfig.tryGetString("memory-cache-num-limit")?.toInt() ?: 20
    MEMORY_IMAGE_CACHE = MemoryImageCache(memoryCacheNumLimit)
    SnapshotElement.NETWORK_IMAGE_CACHE_BUILDER = {
        val memoryImageCache = MEMORY_IMAGE_CACHE
        checkNotNull(MEMORY_IMAGE_CACHE)
        LimitedNetworkImageCache(
            memoryImageCache = memoryImageCache!!,
            maxImageNum = maxImageNumOnce,
            maxSingleImageSize = maxSingleImageSize,
            debug = developmentMode
        )
    }

    routing {
        get("/cacheInfo") {
            val temp = getMemoryImageCache()
            if (temp == null) {
                call.respondText("cache is null", contentType = ContentType.Text.Plain)
            }
            val cache = temp!!
            var html = "<div> cacheNum=${cache.size}, cacheLimit=${cache.limit}</div>"
            html += "<ul>"
            var totalSize = 0
            cache.forEach {
                val size = it.value.imageInfo.computeMinByteSize()
                html += """
                    <li>
                        <a href="${it.key}">${it.key}</a> $size bytes.
                        <br>
                        <img src="${it.key}">
                    </li>
                """.trimIndent()
                totalSize += size
            }
            html += "</ul>"
            html += "<div>totalSize=${totalSize}</div>"
            call.respondText(html, contentType = ContentType.Text.Html)
        }

        post("/cacheClear") {
            getMemoryImageCache()?.clear()
            call.respondText("OK", contentType = ContentType.Text.Plain)
        }
    }
}

fun getMemoryImageCache(): MemoryImageCache? = MEMORY_IMAGE_CACHE