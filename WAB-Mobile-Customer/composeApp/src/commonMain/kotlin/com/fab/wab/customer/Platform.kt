package com.fab.wab.customer

interface Platform {
    val name: String
}

expect fun getPlatform(): Platform

expect fun openStoreLink()

expect fun exitApp()