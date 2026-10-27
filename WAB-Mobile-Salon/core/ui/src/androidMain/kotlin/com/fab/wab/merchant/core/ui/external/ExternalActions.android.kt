package com.fab.wab.merchant.core.ui.external

import android.content.ActivityNotFoundException
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import org.koin.core.module.Module
import org.koin.dsl.module

actual val platformExternalActionsModule: Module = module {
    single<ExternalActions> { AndroidExternalActions(get<Context>()) }
}

/**
 * Intents with a chooser where the PRD asks for one (share); a missing handler answers false instead of crashing.
 * Package visibility (`<queries>` in the app manifest) lets [isInstalled] and `resolveActivity` see WhatsApp and maps apps.
 */
class AndroidExternalActions(private val context: Context) : ExternalActions {

    override suspend fun openMaps(latitude: Double, longitude: Double, label: String): Boolean {
        val point = "$latitude,$longitude"
        val geo = Intent(Intent.ACTION_VIEW, Uri.parse("$GEO_SCHEME:$point?$GEO_QUERY=$point(${Uri.encode(label)})"))
        // No maps app: false, and the screen says so (no web fallback host is configured).
        return start(geo)
    }

    override suspend fun dial(phoneE164: String): Boolean =
        ExternalLinks.dialable(phoneE164).isNotEmpty() && start(Intent(Intent.ACTION_DIAL, Uri.parse(ExternalLinks.tel(phoneE164))))

    /** One WhatsApp flavour installed → straight into it; both or none → the system resolves `wa.me` (chooser or browser). */
    override suspend fun openWhatsApp(phoneE164: String, text: String?): Boolean {
        if (ExternalLinks.dialable(phoneE164).isEmpty()) return false
        val view = Intent(Intent.ACTION_VIEW, Uri.parse(ExternalLinks.whatsAppMessage(phoneE164, text)))
        val installed = WHATSAPP_PACKAGES.filter(::isInstalled)
        if (installed.size == 1 && start(Intent(view).setPackage(installed.first()))) return true
        return start(view)
    }

    override fun share(text: String) {
        val send = Intent(Intent.ACTION_SEND).setType(TEXT_MIME).putExtra(Intent.EXTRA_TEXT, text)
        start(Intent.createChooser(send, null))
    }

    override suspend fun openUrl(url: String): Boolean = start(Intent(Intent.ACTION_VIEW, Uri.parse(url)))

    override fun copyText(text: String) {
        val clipboard = context.getSystemService(ClipboardManager::class.java) ?: return
        clipboard.setPrimaryClip(ClipData.newPlainText(null, text))
    }

    override suspend fun email(address: String): Boolean = start(Intent(Intent.ACTION_SENDTO, Uri.parse(ExternalLinks.mailto(address))))

    override suspend fun openApp(appUrl: String, appId: String, fallbackUrl: String): Boolean {
        val installed = appId.isNotBlank() && context.packageManager.getLaunchIntentForPackage(appId) != null
        return if (installed && start(Intent(Intent.ACTION_VIEW, Uri.parse(appUrl)).setPackage(appId))) true else openUrl(fallbackUrl)
    }

    private fun isInstalled(packageName: String): Boolean = try {
        context.packageManager.getPackageInfo(packageName, 0)
        true
    } catch (ignored: PackageManager.NameNotFoundException) {
        false
    }

    /** No handler on this device (no dialer on a tablet, no browser) is reported, never thrown. */
    private fun start(intent: Intent): Boolean = try {
        context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        true
    } catch (ignored: ActivityNotFoundException) {
        false
    } catch (ignored: SecurityException) {
        // A handler that is not exported to this app; the caller explains and offers the fallback.
        false
    }

    private companion object {
        const val GEO_SCHEME = "geo"
        const val GEO_QUERY = "q"
        const val TEXT_MIME = "text/plain"
        val WHATSAPP_PACKAGES = listOf("com.whatsapp", "com.whatsapp.w4b")
    }
}
