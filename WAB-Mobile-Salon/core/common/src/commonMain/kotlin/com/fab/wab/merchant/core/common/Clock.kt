package com.fab.wab.merchant.core.common

import kotlin.time.Clock.System
import kotlin.time.Instant

interface Clock {
    fun now(): Instant
}

object SystemClock : Clock {
    override fun now(): Instant = System.now()
}
