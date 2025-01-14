package com.muedsa.snapshot.web

import com.muedsa.geometry.EdgeInsets
import com.muedsa.snapshot.SnapshotPNG
import com.muedsa.snapshot.paint.text.TextPainter
import com.muedsa.snapshot.paint.text.TextSpan
import com.muedsa.snapshot.paint.text.TextStyle
import com.muedsa.snapshot.rendering.flex.CrossAxisAlignment
import com.muedsa.snapshot.widget.*
import com.muedsa.snapshot.widget.text.RichText
import com.muedsa.snapshot.widget.text.Text
import org.jetbrains.skia.Color
import org.jetbrains.skia.FontMgr
import org.jetbrains.skia.FontStyle

object FontService {

    // TODO should be cached
    fun drawFonts(): ByteArray {
        val familiesCount = FontMgr.default.familiesCount
        return SnapshotPNG {
            Padding(padding = EdgeInsets.all(20f)) {
                Column(crossAxisAlignment = CrossAxisAlignment.START) {
                    for (i in 0 until familiesCount) {
                        val familyName = FontMgr.default.getFamilyName(i)
                        val familyNameArr = listOf(familyName)
                        RichText {
                            TextSpan(
                                text = familyName,
                                style = TextStyle(
                                    color = Color.RED,
                                    fontSize = 40f,
                                    fontStyle = FontStyle.BOLD,
                                    fontFamilies = familyNameArr
                                )
                            )
                            TextSpan(
                                text = "  ($familyName)",
                                style = TextStyle(
                                    color = Color.BLACK,
                                    fontSize = 35f,
                                )
                            )
                        }
                        Text(
                            text = "原神, 启动！\uD83E\uDD23\uD83E\uDD23\n原神, 啓動！\uD83E\uDD23\uD83E\uDD23\nGenshin Impact, Launch！\uD83E\uDD23\uD83E\uDD23",
                            style = TextStyle(
                                color = Color.BLACK,
                                fontSize = 35f,
                                fontFamilies = familyNameArr
                            )
                        )
                        SizedBox(height = 20f)
                    }
                }
            }
        }
    }

    fun setDefaultFamilyNames(familyNames: List<String>?) {
        TextPainter.DEFAULT_TEXT_STYLE.fontFamilies = familyNames
        familyNames?.let {
            TextPainter.FONT_COLLECTION.setDefaultFontManager(FontMgr.default, familyNames[0])
        }
    }
}