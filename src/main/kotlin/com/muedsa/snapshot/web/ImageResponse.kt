package com.muedsa.snapshot.web

import io.ktor.http.*

data class ImageResponse(
    val success: Boolean,
    val throwable: Throwable? = null,
    val data: ByteArray,
    val contentType: ContentType
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other !is ImageResponse) return false

        if (success != other.success) return false
        if (throwable != other.throwable) return false
        if (!data.contentEquals(other.data)) return false
        if (contentType != other.contentType) return false

        return true
    }

    override fun hashCode(): Int {
        var result = success.hashCode()
        result = 31 * result + (throwable?.hashCode() ?: 0)
        result = 31 * result + data.contentHashCode()
        result = 31 * result + contentType.hashCode()
        return result
    }
}
