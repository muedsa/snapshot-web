package com.muedsa.snapshot.web.config

import com.muedsa.snapshot.web.FontService
import io.ktor.server.application.*
import io.ktor.server.config.*

fun Application.configureFonts() {
    val fontFamilyNames = environment.config.tryGetStringList("snapshot.font-family-names")
    if (!fontFamilyNames.isNullOrEmpty()) {
        FontService.setDefaultFamilyNames(fontFamilyNames.toTypedArray())
    }
}