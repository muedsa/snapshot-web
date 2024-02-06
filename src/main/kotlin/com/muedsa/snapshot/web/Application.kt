package com.muedsa.snapshot.web

import com.muedsa.snapshot.web.config.configureFonts
import com.muedsa.snapshot.web.plugins.*
import io.ktor.server.application.*
import io.ktor.server.netty.*

fun main(args: Array<String>) {
    EngineMain.main(args)
}

fun Application.module() {
    configureFonts()
    configureCallLogging()
    configureCallId()
    configureRateLimit()
    configureHTTP()
    configureRouting()
}
