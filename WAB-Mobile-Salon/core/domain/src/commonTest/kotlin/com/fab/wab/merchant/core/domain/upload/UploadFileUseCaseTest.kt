package com.fab.wab.merchant.core.domain.upload

import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class UploadFileUseCaseTest {
    private val target = PresignedUpload("salons/1/g/a.jpg", "https://storage.test/put", "PUT", mapOf("x-amz-acl" to "private"), 10L)
    private val file = LocalFile("1", "a.jpg", ByteArray(4), "image/jpeg")

    private class FakeUploads(
        var presign: AppResult<PresignedUpload>,
        var put: AppResult<Unit> = AppResult.Success(Unit),
        var confirm: AppResult<ConfirmedUpload> = AppResult.Success(ConfirmedUpload("k", "https://cdn.test/k")),
    ) : UploadsRepository {
        val calls = mutableListOf<String>()

        override suspend fun presign(purpose: UploadPurpose, contentType: String, size: Long): AppResult<PresignedUpload> {
            calls += "presign:$purpose:$contentType:$size"
            return presign
        }

        override suspend fun upload(
            target: PresignedUpload,
            bytes: ByteArray,
            contentType: String,
            onProgress: (Float) -> Unit,
        ): AppResult<Unit> {
            calls += "put:${target.key}"
            onProgress(HALF)
            onProgress(1f)
            return put
        }

        override suspend fun confirm(purpose: UploadPurpose, key: String): AppResult<ConfirmedUpload> {
            calls += "confirm:$purpose:$key"
            return confirm
        }
    }

    @Test
    fun presignUploadConfirmInOrderWithProgress() = runTest {
        val repo = FakeUploads(AppResult.Success(target))
        val steps = UploadFileUseCase(repo)(file, UploadPurpose.GALLERY_IMAGE).toList()
        assertEquals(listOf("presign:GALLERY_IMAGE:image/jpeg:4", "put:${target.key}", "confirm:GALLERY_IMAGE:${target.key}"), repo.calls)
        assertEquals(
            listOf(
                UploadProgress.Uploading(0f),
                UploadProgress.Uploading(HALF),
                UploadProgress.Uploading(1f),
                UploadProgress.Done(ConfirmedUpload("k", "https://cdn.test/k")),
            ),
            steps,
        )
    }

    @Test
    fun aFailedPresignNeverUploads() = runTest {
        val error = AppError.NetworkError("offline")
        val repo = FakeUploads(AppResult.Error(error))
        val steps = UploadFileUseCase(repo)(file, UploadPurpose.LICENSE_DOCUMENT).toList()
        assertEquals(UploadProgress.Failed(error), steps.last())
        assertEquals(1, repo.calls.size)
    }

    @Test
    fun aRejectedPutOrConfirmFails() = runTest {
        val storageError = AppError.HttpError(403, null)
        val putFails = FakeUploads(AppResult.Success(target), put = AppResult.Error(storageError))
        assertEquals(UploadProgress.Failed(storageError), UploadFileUseCase(putFails)(file, UploadPurpose.SALON_COVER).toList().last())
        assertTrue(putFails.calls.none { it.startsWith("confirm") })

        val confirmError = AppError.HttpError(422, "type")
        val confirmFails = FakeUploads(AppResult.Success(target), confirm = AppResult.Error(confirmError))
        assertEquals(UploadProgress.Failed(confirmError), UploadFileUseCase(confirmFails)(file, UploadPurpose.SALON_COVER).toList().last())
    }

    private companion object {
        const val HALF = 0.5f
    }
}
