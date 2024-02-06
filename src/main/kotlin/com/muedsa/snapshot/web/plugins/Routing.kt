package com.muedsa.snapshot.web.plugins

import com.muedsa.snapshot.web.FontService
import com.muedsa.snapshot.web.ParseService
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.plugins.ratelimit.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import org.jetbrains.skia.FontMgr
import java.util.StringJoiner

fun Application.configureRouting() {
    routing {
        get("/") {
            call.respondText("OK!")
        }

        rateLimit(RateLimitName("snapshot")) {
            post("/snapshot") {
                val req: String = call.receiveText()
                val resp = ParseService.parse(req, call = this.call)
                call.respondBytes(bytes = resp.data, contentType = resp.contentType)
                if (!resp.success) {
                    call.application.environment.log.error("req: \n$req")
                    call.application.environment.log.error("parse error", resp.throwable)
                }
            }

            get("/fonts") {
                val joiner = StringJoiner("\n")
                val count: Int = FontMgr.default.familiesCount
                for (i in 0 until count) {
                    joiner.add(FontMgr.default.getFamilyName(i))
                }
                call.respondText(joiner.toString())
            }

            get("/fonts.png") {
                call.respondBytes(bytes = FontService.drawFonts(), contentType = ContentType.Image.PNG)
            }
        }
    }
}
