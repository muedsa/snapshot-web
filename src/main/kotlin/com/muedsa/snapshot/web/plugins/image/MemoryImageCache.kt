package com.muedsa.snapshot.web.plugins.image

import org.jetbrains.skia.Image
import java.util.LinkedHashMap

class MemoryImageCache(val limit: Int = 10): LinkedHashMap<String, Image>(16, 0.75f, true) {
    override fun removeEldestEntry(eldest: MutableMap.MutableEntry<String, Image>?): Boolean {
        return size > limit
    }
}