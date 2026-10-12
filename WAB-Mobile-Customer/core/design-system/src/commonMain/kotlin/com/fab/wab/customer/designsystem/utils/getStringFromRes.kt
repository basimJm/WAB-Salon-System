package com.fab.wab.customer.designsystem.utils

import org.jetbrains.compose.resources.StringResource
import org.jetbrains.compose.resources.getString

suspend fun getStringFromRes(res: StringResource): String {
    return getString(res)
}