package com.fab.wab.merchant.core.data.upload

import com.fab.wab.merchant.core.data.contract.generated.PostUploadsLicensePresignData
import com.fab.wab.merchant.core.data.contract.generated.PostUploadsLicensePresignDataUpload
import com.fab.wab.merchant.core.data.contract.generated.PostUploadsPresignData
import com.fab.wab.merchant.core.data.contract.generated.PostUploadsPresignDataUpload
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonPrimitive
import kotlin.test.Test
import kotlin.test.assertEquals

class UploadsMapperTest {
    private val headers = mapOf(
        "Content-Type" to JsonPrimitive("image/jpeg"),
        "x-amz-acl" to JsonPrimitive("public-read"),
        "ignored" to JsonArray(emptyList()),
    )

    @Test
    fun presignKeepsKeyTargetAndStringHeaders() {
        val data = PostUploadsPresignData("g/1.jpg", MAX_BYTES, PostUploadsPresignDataUpload("u", "PUT", headers, "later"))
        val target = data.toDomain()
        assertEquals("g/1.jpg", target.key)
        assertEquals("PUT", target.method)
        assertEquals(mapOf("Content-Type" to "image/jpeg", "x-amz-acl" to "public-read"), target.headers)
        assertEquals(MAX_BYTES.toLong(), target.maxBytes)
    }

    @Test
    fun licensePresignMapsTheSameWay() {
        val data = PostUploadsLicensePresignData("l/1.pdf", MAX_BYTES, PostUploadsLicensePresignDataUpload("u", "PUT", headers, "later"))
        assertEquals("l/1.pdf", data.toDomain().key)
        assertEquals(2, data.toDomain().headers.size)
    }

    private companion object {
        const val MAX_BYTES = 10_485_760.0
    }
}
