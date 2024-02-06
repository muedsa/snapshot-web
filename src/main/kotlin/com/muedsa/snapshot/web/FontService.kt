package com.muedsa.snapshot.web

import com.muedsa.geometry.EdgeInsets
import com.muedsa.snapshot.SnapshotPNG
import com.muedsa.snapshot.paint.text.SimpleTextPainter
import com.muedsa.snapshot.rendering.flex.CrossAxisAlignment
import com.muedsa.snapshot.widget.*
import org.jetbrains.skia.Color
import org.jetbrains.skia.FontMgr
import org.jetbrains.skia.FontStyle

@OptIn(ExperimentalStdlibApi::class)
object FontService {

    // TODO should be cached
    fun drawFonts(): ByteArray {
        val familiesCount = FontMgr.default.familiesCount
        return SnapshotPNG {
            Padding(padding = EdgeInsets.all(20f)) {
                Column(crossAxisAlignment = CrossAxisAlignment.START) {
                    for (i in 0 until familiesCount) {
                        val familyName = FontMgr.default.getFamilyName(i)
                        val familyNameArr = arrayOf(familyName)
                        SimpleText(
                            text = familyName,
                            color = Color.RED,
                            fontSize = 40f,
                            fontStyle = FontStyle.BOLD
                        )
                        SimpleText(
                            text = "原神, 启动！\uD83E\uDD23\uD83E\uDD23\n原神, 啓動！\uD83E\uDD23\uD83E\uDD23\nGenshin Impact, Launch！\uD83E\uDD23\uD83E\uDD23",
                            color = Color.BLACK,
                            fontSize = 35f,
                            fontFamilyName = familyNameArr
                        )
                        SizedBox(height = 20f)
                    }
                }
            }
        }
    }

    fun setDefaultFamilyNames(familyNames: Array<String>?) {
        SimpleTextPainter.DEFAULT_FONT_FAMILY_NAME = familyNames
        familyNames?.let {
            SimpleTextPainter.FONT_COLLECTION.setDefaultFontManager(FontMgr.default, familyNames[0])
        }
    }
}