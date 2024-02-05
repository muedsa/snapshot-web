package com.muedsa.snapshot.web

import com.muedsa.geometry.EdgeInsets
import com.muedsa.snapshot.SnapshotPNG
import com.muedsa.snapshot.parser.ParseException
import com.muedsa.snapshot.parser.Parser
import com.muedsa.snapshot.rendering.box.BoxConstraints
import com.muedsa.snapshot.rendering.flex.CrossAxisAlignment
import com.muedsa.snapshot.widget.*
import io.ktor.http.*
import org.jetbrains.skia.Color
import org.jetbrains.skia.EncodedImageFormat
import org.jetbrains.skia.FontStyle
import java.io.StringReader

val CONTENT_TYPE_WEBP = ContentType.parse("image/webp")

object ParseService {

    fun parse(text: String): ImageResponse {
        var success = false
        var throwable: Throwable? = null
        var contentType: ContentType
        val imageData: ByteArray = try {
            val snapshotElement = Parser().parse(StringReader(text))
            contentType = when(snapshotElement.format) {
                EncodedImageFormat.JPEG -> ContentType.Image.JPEG
                EncodedImageFormat.PNG -> ContentType.Image.PNG
                EncodedImageFormat.WEBP -> CONTENT_TYPE_WEBP
                else -> ContentType.Image.PNG
            }
            snapshotElement.snapshot().also {
                success = true
            }
        } catch (t: Throwable) {
            throwable = t
            contentType = ContentType.Image.PNG
            buildErrorImage(t, text)
        }
        return ImageResponse(
            success = success,
            throwable = throwable,
            data = imageData,
            contentType = contentType
        )
    }

    @OptIn(ExperimentalStdlibApi::class)
    private fun buildErrorImage(throwable: Throwable, text: String): ByteArray {
        val errorText: String? = if (throwable is ParseException) {
            val start = if (throwable.pos.pos > 30) {
                throwable.pos.pos - 30
            } else 0
            val end = if (throwable.pos.pos + 30 > text.length) {
                text.length
            } else throwable.pos.pos + 30
            text.substring(start, end)
        } else null
        return SnapshotPNG(background = Color.WHITE) {
            ConstrainedBox(
                constraints = BoxConstraints(
                    maxWidth = 800f,
                    maxHeight = 1000f,
                )
            ) {
                Padding(
                    padding = EdgeInsets.all(20f)
                ) {
                    Column(crossAxisAlignment = CrossAxisAlignment.START) {
                        SimpleText("Error", color = Color.RED, fontSize = 40f, fontStyle = FontStyle.BOLD)
                        if (!errorText.isNullOrEmpty()) {
                            Padding(
                                padding = EdgeInsets.only(top = 20f)
                            ) {
                                SimpleText(text = errorText, color = Color.RED)
                            }
                        }
                        Padding(
                            padding = EdgeInsets.only(top = 20f)
                        ) {
                            SimpleText(text = throwable.stackTraceToString().replace("\t", ""))
                        }
                    }
                }
            }
        }
    }
}