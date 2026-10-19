package com.fab.wab.customer.core.ui.external

import android.content.Context
import android.content.Intent
import android.net.Uri
import org.koin.core.module.Module
import org.koin.dsl.module

actual val platformExternalActionsModule: Module = module {
    single<ExternalActions> { AndroidExternalActions(get<Context>()) }
}

/** Intents with a chooser where the PRD asks for one (maps, share); a missing handler is swallowed. */
class AndroidExternalActions(private val context: Context) : ExternalActions {

    override fun openMaps(latitude: Double, longitude: Double, label: String) {
        val uri = Uri.parse("$GEO_SCHEME:$latitude,$longitude?$GEO_QUERY=$latitude,$longitude(${Uri.encode(label)})")
        start(Intent.createChooser(Intent(Intent.ACTION_VIEW, uri), null))
    }

    override fun dial(phoneE164: String) {
        start(Intent(Intent.ACTION_DIAL, Uri.parse(ExternalLinks.tel(phoneE164))))
    }

    override fun openWhatsApp(phoneE164: String) {
        start(Intent(Intent.ACTION_VIEW, Uri.parse(ExternalLinks.whatsApp(phoneE164))))
    }

    override fun share(text: String) {
        val send = Intent(Intent.ACTION_SEND).setType(TEXT_MIME).putExtra(Intent.EXTRA_TEXT, text)
        start(Intent.createChooser(send, null))
    }

    override fun openUrl(url: String) {
        start(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
    }

    override fun email(address: String) {
        start(Intent(Intent.ACTION_SENDTO, Uri.parse(ExternalLinks.mailto(address))))
    }

    override fun openApp(appUrl: String, appId: String, fallbackUrl: String) {
        val installed = appId.isNotBlank() && context.packageManager.getLaunchIntentForPackage(appId) != null
        if (installed) start(Intent(Intent.ACTION_VIEW, Uri.parse(appUrl)).setPackage(appId)) else openUrl(fallbackUrl)
    }

    /** No handler on this device (e.g. no WhatsApp) is not an error for the user; the PRD shows buttons only when relevant. */
    private fun start(intent: Intent): Boolean = runCatching {
        context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }.isSuccess

    private companion object {
        const val GEO_SCHEME = "geo"
        const val GEO_QUERY = "q"
        const val TEXT_MIME = "text/plain"
    }
}
