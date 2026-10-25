package com.fab.wab.merchant.app.request

import android.content.Context
import android.graphics.PixelFormat
import android.view.Gravity
import android.view.WindowManager
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.ComposeView
import androidx.lifecycle.setViewTreeLifecycleOwner
import androidx.savedstate.setViewTreeSavedStateRegistryOwner
import com.fab.wab.merchant.core.domain.AppearanceSettings
import com.fab.wab.merchant.core.ui.alert.RequestAlert
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.feature.bookings.presentation.di.overlayRequestsViewModel
import com.fab.wab.merchant.feature.bookings.presentation.screen.BookingRequestOverlayCard
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.MutableSharedFlow
import org.koin.core.Koin

/**
 * The booking-request card over any app (PRD M10, "display over other apps" granted): one window at a time; a new
 * request while it is open joins its queue ("1 of 2"). The window closes when the queue is empty.
 */
internal class RequestOverlayWindow(
    private val context: Context,
    private val koin: Koin,
    private val openBooking: (String) -> Unit,
) {
    private val windowManager = context.getSystemService(WindowManager::class.java)
    private var view: ComposeView? = null
    private var owner: OverlayLifecycleOwner? = null
    private var scope: CoroutineScope? = null
    /** Requests of the open window; a new flow per window so a closed queue never replays. */
    private var requests = MutableSharedFlow<String>(replay = REQUEST_REPLAY)

    val isShowing: Boolean get() = view != null

    fun show(bookingId: String) {
        requests.tryEmit(bookingId)
        if (view != null) return
        val windowScope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
        val viewModel = overlayRequestsViewModel(koin, requests, windowScope)
        val lifecycle = OverlayLifecycleOwner().also { it.start() }
        val compose = ComposeView(context).apply {
            setViewTreeLifecycleOwner(lifecycle)
            setViewTreeSavedStateRegistryOwner(lifecycle)
            setContent {
                OverlayTheme(koin.get<AppearanceSettings>()) {
                    BookingRequestOverlayCard(
                        viewModel = viewModel,
                        onOpenBooking = { id ->
                            openBooking(id)
                            close()
                        },
                        onClose = ::close,
                        modifier = Modifier.fillMaxWidth().navigationBarsPadding().padding(AppTheme.spacing.space12),
                    )
                }
            }
        }
        windowManager.addView(compose, layoutParams())
        view = compose
        owner = lifecycle
        scope = windowScope
    }

    fun close() {
        val current = view ?: return
        koin.get<RequestAlert>().stop()
        windowManager.removeView(current)
        owner?.stop()
        scope?.cancel()
        view = null
        owner = null
        scope = null
        requests = MutableSharedFlow(replay = REQUEST_REPLAY)
    }

    /** Bottom card over other apps; touches outside it go to the app underneath, the back key too. */
    private fun layoutParams() = WindowManager.LayoutParams(
        WindowManager.LayoutParams.MATCH_PARENT,
        WindowManager.LayoutParams.WRAP_CONTENT,
        WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
        WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
        PixelFormat.TRANSLUCENT,
    ).apply { gravity = Gravity.BOTTOM }

    private companion object {
        const val REQUEST_REPLAY = 8
    }
}
