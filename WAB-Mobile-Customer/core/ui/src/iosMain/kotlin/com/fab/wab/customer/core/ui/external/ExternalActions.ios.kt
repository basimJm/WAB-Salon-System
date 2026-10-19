package com.fab.wab.customer.core.ui.external

import org.koin.core.module.Module
import org.koin.dsl.module
import platform.Foundation.NSURL
import platform.UIKit.UIActivityViewController
import platform.UIKit.UIApplication

actual val platformExternalActionsModule: Module = module {
    single<ExternalActions> { IosExternalActions() }
}

/** Apple Maps / Google Maps via the universal maps link, the dialer, WhatsApp and `UIActivityViewController`. */
class IosExternalActions : ExternalActions {

    override fun openMaps(latitude: Double, longitude: Double, label: String) {
        val encoded = ExternalLinks.queryEncode(label)
        open("$MAPS_SCHEME$SCHEME_SEPARATOR$MAPS_HOST/?$MAPS_COORDS=$latitude,$longitude&$MAPS_QUERY=$encoded")
    }

    override fun dial(phoneE164: String) = open(ExternalLinks.tel(phoneE164))

    override fun openWhatsApp(phoneE164: String) = open(ExternalLinks.whatsApp(phoneE164))

    override fun share(text: String) {
        val controller = UIActivityViewController(activityItems = listOf(text), applicationActivities = null)
        val root = UIApplication.sharedApplication.keyWindow?.rootViewController ?: return
        root.presentViewController(controller, animated = true, completion = null)
    }

    override fun openUrl(url: String) = open(url)

    override fun email(address: String) = open(ExternalLinks.mailto(address))

    /** [appId] is the merchant app's URL scheme (declared in `LSApplicationQueriesSchemes`). */
    override fun openApp(appUrl: String, appId: String, fallbackUrl: String) {
        val probe = appId.takeIf { it.isNotBlank() }?.let { NSURL.URLWithString("$it$SCHEME_SEPARATOR") }
        val installed = probe != null && UIApplication.sharedApplication.canOpenURL(probe)
        open(if (installed) appUrl else fallbackUrl)
    }

    private fun open(url: String) {
        val nsUrl = NSURL.URLWithString(url) ?: return
        UIApplication.sharedApplication.openURL(nsUrl)
    }

    private companion object {
        const val SCHEME_SEPARATOR = "://"
        const val MAPS_SCHEME = "https"
        const val MAPS_HOST = "maps.apple.com"
        const val MAPS_COORDS = "ll"
        const val MAPS_QUERY = "q"
    }
}
