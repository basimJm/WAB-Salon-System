package com.fab.wab.merchant.designsystem.components.external

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import com.fab.wab.merchant.core.notification.composable.rememberNotificationManager
import com.fab.wab.merchant.core.notification.model.NotificationStyle
import com.fab.wab.merchant.core.ui.external.ExternalActions
import com.fab.wab.merchant.core.ui.external.ExternalLinks
import com.fab.wab.merchant.designsystem.components.format.ltrIsolate
import com.fab.wab.merchant.designsystem.resources.Res
import com.fab.wab.merchant.designsystem.resources.handoff_call_unavailable
import com.fab.wab.merchant.designsystem.resources.handoff_email_unavailable
import com.fab.wab.merchant.designsystem.resources.handoff_link_unavailable
import com.fab.wab.merchant.designsystem.resources.handoff_maps_unavailable
import com.fab.wab.merchant.designsystem.resources.handoff_whatsapp_greeting
import com.fab.wab.merchant.designsystem.resources.handoff_whatsapp_unavailable
import org.jetbrains.compose.resources.getString

/** The texts [ExternalHandoff] shows; resource-backed in the app, plain in tests. */
interface HandoffTexts {
    suspend fun callUnavailable(phone: String): String
    suspend fun whatsAppUnavailable(): String
    suspend fun emailUnavailable(address: String): String
    suspend fun linkUnavailable(): String
    suspend fun mapsUnavailable(): String

    /** Prefilled first line of a "Contact WAB" WhatsApp chat. */
    suspend fun contactWabGreeting(): String
}

/**
 * Calls, WhatsApp chats, mails, links and maps with a visible answer when nothing could open: the dialer is missing
 * on tablets and the iOS simulator (the number is copied instead), WhatsApp and the browser may be missing.
 */
class ExternalHandoff(
    private val actions: ExternalActions,
    private val texts: HandoffTexts,
    private val notify: (String) -> Unit,
) {
    suspend fun call(phone: String) {
        if (actions.dial(phone)) return
        actions.copyText(phone)
        notify(texts.callUnavailable(phone))
    }

    suspend fun whatsApp(phone: String, text: String? = null) {
        if (!actions.openWhatsApp(phone, text)) notify(texts.whatsAppUnavailable())
    }

    /** "Contact WAB" over WhatsApp, with a greeting already typed so support knows where the chat comes from. */
    suspend fun contactWabWhatsApp(phone: String) = whatsApp(phone, texts.contactWabGreeting())

    suspend fun email(address: String) {
        if (actions.email(address)) return
        actions.copyText(address)
        notify(texts.emailUnavailable(address))
    }

    /** Mail composer with [subject] and [body] filled in (review report). */
    suspend fun emailMessage(address: String, subject: String, body: String) {
        if (actions.openUrl(ExternalLinks.mailtoMessage(address, subject, body))) return
        actions.copyText(address)
        notify(texts.emailUnavailable(address))
    }

    suspend fun url(url: String) {
        if (!actions.openUrl(url)) notify(texts.linkUnavailable())
    }

    suspend fun maps(latitude: Double, longitude: Double, label: String) {
        if (!actions.openMaps(latitude, longitude, label)) notify(texts.mapsUnavailable())
    }
}

/** App texts from the design-system resources (AR + EN). */
object ResourceHandoffTexts : HandoffTexts {
    override suspend fun callUnavailable(phone: String) = getString(Res.string.handoff_call_unavailable, ltrIsolate(phone))
    override suspend fun whatsAppUnavailable() = getString(Res.string.handoff_whatsapp_unavailable)
    override suspend fun emailUnavailable(address: String) = getString(Res.string.handoff_email_unavailable, ltrIsolate(address))
    override suspend fun linkUnavailable() = getString(Res.string.handoff_link_unavailable)
    override suspend fun mapsUnavailable() = getString(Res.string.handoff_maps_unavailable)
    override suspend fun contactWabGreeting() = getString(Res.string.handoff_whatsapp_greeting)
}

/** The screen's hand-off helper over [actions] (the host injects them); failures show as an info banner. */
@Composable
fun rememberExternalHandoff(actions: ExternalActions): ExternalHandoff {
    val notifications = rememberNotificationManager()
    return remember(actions, notifications) {
        ExternalHandoff(actions, ResourceHandoffTexts) { message -> notifications.show(message, style = NotificationStyle.Info) }
    }
}
