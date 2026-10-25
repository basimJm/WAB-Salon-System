package com.fab.wab.merchant.designsystem.components.permission

import androidx.compose.runtime.Composable
import androidx.compose.runtime.staticCompositionLocalOf
import com.fab.wab.merchant.core.domain.permission.Permission
import com.fab.wab.merchant.core.domain.permission.PermissionSet

/** The signed-in member's permissions, provided once by the app shell from the session. */
val LocalPermissions = staticCompositionLocalOf { PermissionSet.NONE }

/** PRD §3 hidden-not-disabled: [content] is composed only when the member holds [permission]; otherwise nothing. */
@Composable
fun PermissionGated(permission: Permission, content: @Composable () -> Unit) {
    if (LocalPermissions.current.has(permission)) content()
}

/** Gate on any rule over the permission set (`anyOf`, owner-only capabilities, …); hidden when it does not hold. */
@Composable
fun PermissionGated(allowed: (PermissionSet) -> Boolean, content: @Composable () -> Unit) {
    if (allowed(LocalPermissions.current)) content()
}
