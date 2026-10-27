package com.fab.wab.merchant.core.ui.external

import kotlinx.cinterop.ExperimentalForeignApi
import org.koin.core.module.Module
import org.koin.dsl.module
import platform.UIKit.UIActivityViewController
import platform.UIKit.UIPasteboard
import platform.UIKit.popoverPresentationController

actual val platformExternalActionsModule: Module = module {
    single<ExternalActions> { IosExternalActions() }
}

/**
 * Apple Maps via the universal maps link, the dialer (`tel:`, false on the simulator and on iPads without calling),
 * WhatsApp (its own scheme when installed, else the `wa.me` universal link) and `UIActivityViewController`.
 */
class IosExternalActions : ExternalActions {

    override suspend fun openMaps(latitude: Double, longitude: Double, label: String): Boolean {
        val encoded = ExternalLinks.queryEncode(label)
        return IosUiKit.open("$MAPS_SCHEME$SCHEME_SEPARATOR$MAPS_HOST/?$MAPS_COORDS=$latitude,$longitude&$MAPS_QUERY=$encoded")
    }

    override suspend fun dial(phoneE164: String): Boolean =
        ExternalLinks.dialable(phoneE164).isNotEmpty() && IosUiKit.open(ExternalLinks.tel(phoneE164))

    override suspend fun openWhatsApp(phoneE164: String, text: String?): Boolean {
        if (ExternalLinks.dialable(phoneE164).isEmpty()) return false
        val app = ExternalLinks.whatsAppApp(phoneE164, text)
        if (IosUiKit.canOpen(app) && IosUiKit.open(app)) return true
        return IosUiKit.open(ExternalLinks.whatsAppMessage(phoneE164, text))
    }

    @OptIn(ExperimentalForeignApi::class)
    override fun share(text: String) {
        val presenter = IosUiKit.topViewController() ?: return
        val controller = UIActivityViewController(activityItems = listOf(text), applicationActivities = null)
        // iPad shows the sheet as a popover, which needs an anchor or UIKit raises an exception.
        controller.popoverPresentationController?.sourceView = presenter.view
        controller.popoverPresentationController?.sourceRect = presenter.view.bounds
        presenter.presentViewController(controller, animated = true, completion = null)
    }

    override suspend fun openUrl(url: String): Boolean = IosUiKit.open(url)

    override suspend fun email(address: String): Boolean = IosUiKit.open(ExternalLinks.mailto(address))

    override fun copyText(text: String) {
        UIPasteboard.generalPasteboard.string = text
    }

    /** [appId] is the partner app's URL scheme (declared in `LSApplicationQueriesSchemes`). */
    override suspend fun openApp(appUrl: String, appId: String, fallbackUrl: String): Boolean {
        val installed = appId.isNotBlank() && IosUiKit.canOpen("$appId$SCHEME_SEPARATOR")
        return if (installed && IosUiKit.open(appUrl)) true else IosUiKit.open(fallbackUrl)
    }

    private companion object {
        const val SCHEME_SEPARATOR = "://"
        const val MAPS_SCHEME = "https"
        const val MAPS_HOST = "maps.apple.com"
        const val MAPS_COORDS = "ll"
        const val MAPS_QUERY = "q"
    }
}
