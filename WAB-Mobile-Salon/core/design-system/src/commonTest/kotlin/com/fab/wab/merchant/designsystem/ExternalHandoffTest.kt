package com.fab.wab.merchant.designsystem

import com.fab.wab.merchant.core.ui.external.FakeExternalActions
import com.fab.wab.merchant.designsystem.components.external.ExternalHandoff
import com.fab.wab.merchant.designsystem.components.external.HandoffTexts
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class ExternalHandoffTest {
    private object Texts : HandoffTexts {
        override suspend fun callUnavailable(phone: String) = "no-call:$phone"
        override suspend fun whatsAppUnavailable() = "no-whatsapp"
        override suspend fun emailUnavailable(address: String) = "no-mail:$address"
        override suspend fun linkUnavailable() = "no-link"
        override suspend fun mapsUnavailable() = "no-maps"
        override suspend fun contactWabGreeting() = "Hello WAB"
    }

    private val messages = mutableListOf<String>()

    private fun handoff(actions: FakeExternalActions) = ExternalHandoff(actions, Texts) { messages += it }

    @Test
    fun callThatOpensSaysNothing() = runTest {
        val actions = FakeExternalActions()
        handoff(actions).call("+962790000001")
        assertEquals(listOf("tel:+962790000001"), actions.calls)
        assertTrue(messages.isEmpty())
    }

    @Test
    fun deviceWithoutDialerCopiesTheNumberAndExplains() = runTest {
        val actions = FakeExternalActions(available = false)
        handoff(actions).call("+962790000001")
        assertEquals(listOf("tel:+962790000001", "copy:+962790000001"), actions.calls)
        assertEquals(listOf("no-call:+962790000001"), messages)
    }

    @Test
    fun contactWabWhatsAppIsPrefilledAndMissingWhatsAppExplains() = runTest {
        val actions = FakeExternalActions(available = false)
        handoff(actions).contactWabWhatsApp("+962 79 000 0001")
        assertEquals(listOf("https://wa.me/962790000001?text=Hello%20WAB"), actions.calls)
        assertEquals(listOf("no-whatsapp"), messages)
    }

    @Test
    fun mailWithoutMailAppCopiesTheAddressAndOtherFailuresExplain() = runTest {
        val actions = FakeExternalActions(available = false)
        val handoff = handoff(actions)
        handoff.email("help@wab.jo")
        handoff.emailMessage("help@wab.jo", "Report", "Ref r1")
        handoff.url("https://wab.jo/terms")
        handoff.maps(31.95, 35.91, "Lamar")
        assertEquals(
            listOf("no-mail:help@wab.jo", "no-mail:help@wab.jo", "no-link", "no-maps"),
            messages,
        )
        assertEquals(2, actions.calls.count { it == "copy:help@wab.jo" })
    }
}
