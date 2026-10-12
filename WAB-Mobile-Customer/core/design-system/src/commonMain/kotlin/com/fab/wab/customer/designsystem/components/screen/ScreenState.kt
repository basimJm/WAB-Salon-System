package com.fab.wab.customer.designsystem.components.screen

import androidx.compose.ui.graphics.vector.ImageVector

sealed class ScreenState<out T> {
    data object Loading : ScreenState<Nothing>()
    
    data class Content<T>(val data: T? = null) : ScreenState<T>()
    
    data class Error(
        val title: String? = null,
        val message: String? = null,
    ) : ScreenState<Nothing>()
    
    data class Empty(
        val title: String? = null,
        val message: String? = null,
        val icon: ImageVector? = null,
    ) : ScreenState<Nothing>()
    
    data object Offline : ScreenState<Nothing>()
}
