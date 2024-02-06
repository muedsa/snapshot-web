package com.muedsa.snapshot.web.plugins

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.plugins.callid.*
import java.util.UUID

fun Application.configureCallId() {
    install(CallId) {
        header(HttpHeaders.XRequestId)
        generate {
            UUID.randomUUID().toString()
        }
    }
}