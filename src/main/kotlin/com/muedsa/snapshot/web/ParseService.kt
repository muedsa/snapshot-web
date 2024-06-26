package com.muedsa.snapshot.web

import com.muedsa.geometry.EdgeInsets
import com.muedsa.snapshot.SnapshotPNG
import com.muedsa.snapshot.paint.text.TextStyle
import com.muedsa.snapshot.parser.ParseException
import com.muedsa.snapshot.parser.Parser
import com.muedsa.snapshot.rendering.box.BoxConstraints
import com.muedsa.snapshot.rendering.flex.CrossAxisAlignment
import com.muedsa.snapshot.widget.*
import com.muedsa.snapshot.widget.text.Text
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.plugins.callid.*
import org.jetbrains.skia.Color
import org.jetbrains.skia.EncodedImageFormat
import org.jetbrains.skia.FontStyle
import java.io.StringReader

val CONTENT_TYPE_WEBP = ContentType.parse("image/webp")

object ParseService {

    fun parse(text: String, call: ApplicationCall? = null): ImageResponse {
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
            buildErrorImage(t, text, call)
        }
        return ImageResponse(
            success = success,
            throwable = throwable,
            data = imageData,
            contentType = contentType
        )
    }

    private fun buildErrorImage(throwable: Throwable, text: String, call: ApplicationCall? = null): ByteArray {
        val traceId: String? = call?.callId
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
                        if (!traceId.isNullOrEmpty()) {
                            Padding(
                                padding = EdgeInsets.only(bottom = 20f)
                            ) {
                                Text(text = "TraceId: $traceId")
                            }
                        }
                        Text(
                            text = "Error",
                            style = TextStyle(
                                color = Color.RED,
                                fontSize = 40f,
                                fontStyle = FontStyle.BOLD
                            )
                        )
                        if (!errorText.isNullOrEmpty()) {
                            Padding(
                                padding = EdgeInsets.only(top = 20f)
                            ) {
                                Text(
                                    text = errorText,
                                    style = TextStyle(
                                        color = Color.RED
                                    )
                                )
                            }
                        }
                        Padding(
                            padding = EdgeInsets.only(top = 20f)
                        ) {
                            Text(text = throwable.stackTraceToString().replace("\t", ""))
                        }
                    }
                }
            }
        }
    }
}