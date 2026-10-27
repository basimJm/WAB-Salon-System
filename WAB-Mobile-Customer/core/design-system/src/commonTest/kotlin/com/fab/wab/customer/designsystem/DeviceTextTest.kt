package com.fab.wab.customer.designsystem

import com.fab.wab.customer.core.ui.external.ExternalApp
import com.fab.wab.customer.core.ui.media.PickResult
import com.fab.wab.customer.core.ui.media.PickedImage
import com.fab.wab.customer.designsystem.components.feedback.externalUnavailableResource
import com.fab.wab.customer.designsystem.components.feedback.pickProblemResource
import com.fab.wab.customer.designsystem.resources.Res
import com.fab.wab.customer.designsystem.resources.photo_camera_unavailable
import com.fab.wab.customer.designsystem.resources.photo_read_failed
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class DeviceTextTest {
    @Test
    fun everyExternalAppHasItsOwnMessage() {
        val resources = ExternalApp.entries.map(::externalUnavailableResource)
        assertEquals(ExternalApp.entries.size, resources.toSet().size)
    }

    @Test
    fun onlyRealPickerProblemsProduceAMessage() {
        assertEquals(Res.string.photo_camera_unavailable, pickProblemResource(PickResult.CameraUnavailable))
        assertEquals(Res.string.photo_read_failed, pickProblemResource(PickResult.Failed))
        assertNull(pickProblemResource(PickResult.Cancelled))
        assertNull(pickProblemResource(PickResult.Picked(PickedImage(ByteArray(1), "image/jpeg"))))
    }
}
