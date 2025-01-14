package com.muedsa.snapshot.web.plugins

import io.ktor.server.application.*
import io.ktor.server.plugins.callid.*
import io.ktor.server.plugins.calllogging.CallLogging
import org.slf4j.event.Level

fun Application.configureCallLogging() {
    install(CallLogging) {
        level = Level.DEBUG
        callIdMdc("traceId")
    }
}