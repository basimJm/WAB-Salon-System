package com.fab.wab.merchant.designsystem

import com.fab.wab.merchant.core.ui.media.FakeFilePicker
import com.fab.wab.merchant.core.ui.media.MediaSource
import com.fab.wab.merchant.core.ui.media.PickResult
import com.fab.wab.merchant.core.ui.media.PickedFile
import com.fab.wab.merchant.designsystem.components.upload.DOCUMENT_SOURCES
import com.fab.wab.merchant.designsystem.components.upload.MediaNotice
import com.fab.wab.merchant.designsystem.components.upload.MediaPickAction
import com.fab.wab.merchant.designsystem.components.upload.MediaPickHandler
import com.fab.wab.merchant.designsystem.components.upload.MediaPickUi
import com.fab.wab.merchant.designsystem.components.upload.PHOTO_SOURCES
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

@OptIn(ExperimentalCoroutinesApi::class)
class MediaPickHandlerTest {
    private val photo = PickedFile("a.jpg", byteArrayOf(1), "image/jpeg")
    private val clip = PickedFile("b.mp4", byteArrayOf(2), "video/mp4", durationMs = 1_000)
    private val pdf = PickedFile("c.pdf", byteArrayOf(3), "application/pdf")

    private class Harness(val picker: FakeFilePicker, scope: CoroutineScope) {
        var ui = MediaPickUi()
        val picked = mutableListOf<List<PickedFile>>()
        val handler = MediaPickHandler(picker, scope, { ui }) { ui = it }

        fun open(sources: List<MediaSource>, max: Int, video: Boolean = false) = handler.open(sources, max, video) { picked += it }
    }

    @Test
    fun openShowsTheSourcesAndWhetherTheCameraExists() = runTest(UnconfinedTestDispatcher()) {
        val harness = Harness(FakeFilePicker(isCameraAvailable = false), this)
        harness.open(DOCUMENT_SOURCES, max = 5)
        assertEquals(DOCUMENT_SOURCES, harness.ui.sources)
        assertFalse(harness.ui.cameraAvailable)
        assertTrue(harness.ui.isChoosing)
    }

    @Test
    fun noRoomLeftOpensNothing() = runTest(UnconfinedTestDispatcher()) {
        val harness = Harness(FakeFilePicker(), this)
        harness.open(PHOTO_SOURCES, max = 0)
        assertFalse(harness.ui.isChoosing)
    }

    @Test
    fun libraryPicksUpToTheRoomLeftWithVideosAndClosesTheSheet() = runTest(UnconfinedTestDispatcher()) {
        val harness = Harness(FakeFilePicker(media = listOf(photo, clip, photo)), this)
        harness.open(PHOTO_SOURCES, max = 2, video = true)
        harness.handler.handle(MediaPickAction.SourceChosen(MediaSource.LIBRARY))
        assertEquals(listOf("library:2:true"), harness.picker.requests)
        assertEquals(listOf(listOf(photo, clip)), harness.picked)
        assertFalse(harness.ui.isChoosing)
    }

    @Test
    fun cameraTakesOnePhotoWithoutVideoAndFilesPickDocuments() = runTest(UnconfinedTestDispatcher()) {
        val harness = Harness(FakeFilePicker(documents = listOf(pdf), camera = photo), this)
        harness.open(DOCUMENT_SOURCES, max = 4, video = true)
        harness.handler.handle(MediaPickAction.SourceChosen(MediaSource.CAMERA))
        harness.open(DOCUMENT_SOURCES, max = 4)
        harness.handler.handle(MediaPickAction.SourceChosen(MediaSource.FILES))
        assertEquals(listOf("camera:1:false", "files:4:false"), harness.picker.requests)
        assertEquals(listOf(listOf(photo), listOf(pdf)), harness.picked)
    }

    @Test
    fun unavailableCameraRowIsIgnored() = runTest(UnconfinedTestDispatcher()) {
        val harness = Harness(FakeFilePicker(isCameraAvailable = false, camera = photo), this)
        harness.open(PHOTO_SOURCES, max = 1)
        harness.handler.handle(MediaPickAction.SourceChosen(MediaSource.CAMERA))
        assertTrue(harness.picker.requests.isEmpty())
        assertTrue(harness.ui.isChoosing)
    }

    @Test
    fun refusedCameraOffersTheSettingsAndUnavailableCameraExplains() = runTest(UnconfinedTestDispatcher()) {
        val harness = Harness(FakeFilePicker(result = PickResult.CameraBlocked), this)
        harness.open(PHOTO_SOURCES, max = 1)
        harness.handler.handle(MediaPickAction.SourceChosen(MediaSource.CAMERA))
        assertEquals(MediaNotice.CAMERA_BLOCKED, harness.ui.notice)
        harness.handler.handle(MediaPickAction.OpenSettings)
        assertEquals(1, harness.picker.settingsOpened)
        assertNull(harness.ui.notice)

        harness.picker.result = PickResult.CameraUnavailable
        harness.open(PHOTO_SOURCES, max = 1)
        harness.handler.handle(MediaPickAction.SourceChosen(MediaSource.CAMERA))
        assertEquals(MediaNotice.CAMERA_UNAVAILABLE, harness.ui.notice)
        harness.handler.handle(MediaPickAction.DismissNotice)
        assertNull(harness.ui.notice)
        assertTrue(harness.picked.isEmpty())
    }

    @Test
    fun cancelledOrDismissedPicksNothing() = runTest(UnconfinedTestDispatcher()) {
        val harness = Harness(FakeFilePicker(), this)
        harness.open(PHOTO_SOURCES, max = 1)
        harness.handler.handle(MediaPickAction.SourceChosen(MediaSource.LIBRARY))
        harness.open(PHOTO_SOURCES, max = 1)
        harness.handler.handle(MediaPickAction.Dismiss)
        harness.handler.handle(MediaPickAction.SourceChosen(MediaSource.LIBRARY))
        assertEquals(listOf("library:1:false"), harness.picker.requests)
        assertTrue(harness.picked.isEmpty())
        assertFalse(harness.ui.isChoosing)
    }
}
