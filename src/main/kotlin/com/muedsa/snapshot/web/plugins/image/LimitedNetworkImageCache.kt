package com.muedsa.snapshot.web.plugins.image

import com.muedsa.snapshot.tools.LimitedImageInputStream
import com.muedsa.snapshot.tools.NetworkImageCache
import com.muedsa.snapshot.tools.SimpleNoLimitedNetworkImageCache
import org.jetbrains.skia.Image
import java.io.FileNotFoundException
import java.net.URL


class LimitedNetworkImageCache(
    val memoryImageCache: MemoryImageCache,
    var maxImageNum: Int = Int.MAX_VALUE,
    var maxSingleImageSize: Int = Int.MAX_VALUE,
    var debug: Boolean = false,
) : NetworkImageCache {
    override val name: String get() = NAME

    private var num: Int = 0

    @Synchronized
    override fun getImage(url: String, noCache: Boolean): Image {
        if (noCache) {
            val image = Image.makeFromEncoded(getImageOverHttp(url))
            num++
            return image
        }
        synchronized(memoryImageCache) {
            if (debug) println("Thread[${Thread.currentThread().name}] try get image from cache: $url")
            var image = memoryImageCache[url]
            if (image == null) {
                if (debug) println("Thread[${Thread.currentThread().name}] not found in cache: $url")
                image = Image.makeFromEncoded(getImageOverHttp(url))
                memoryImageCache.put(url, image)
                num++
            }
            return image
        }
    }

    @Synchronized
    override fun clearAll() {
        memoryImageCache.clear()
    }

    @Synchronized
    override fun clearImage(url: String) {
        memoryImageCache.remove(url)
    }

    override fun count(): Int = memoryImageCache.size

    override fun size(): Int = memoryImageCache.values.fold(0) { acc: Int, image: Image ->
        acc + image.imageInfo.computeMinByteSize()
    }

    private fun getImageOverHttp(url: String): ByteArray {
        if (SimpleNoLimitedNetworkImageCache.debug) println("Thread[${Thread.currentThread().name}] request http image: $url")
        check(num + 1 <= maxImageNum) { "Exceeded maximum number [$maxImageNum] of image http requests" }
        try {
            return URL(url).openStream().use { LimitedImageInputStream(it, maxSingleImageSize).readAllBytes() }
        } catch (_: FileNotFoundException) {
            throw IllegalStateException("Get http 404 from $url")
        }
    }

    companion object {
        const val NAME: String = "LimitedNetworkImageCache"
    }
}