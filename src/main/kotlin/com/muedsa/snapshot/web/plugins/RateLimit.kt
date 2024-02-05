package com.muedsa.snapshot.web.plugins

import io.ktor.server.application.*
import io.ktor.server.plugins.ratelimit.*
import kotlin.time.Duration.Companion.seconds

fun Application.configureRateLimit() {
    install(RateLimit) {
        register(RateLimitName("snapshot")) {
            rateLimiter(limit = 30, refillPeriod = 60.seconds)
        }
    }
}