package com.fab.wab.merchant.core.data.upload

import com.fab.wab.merchant.core.data.mock.MockFixture
import com.fab.wab.merchant.core.domain.upload.UploadFileUseCase
import com.fab.wab.merchant.core.domain.upload.UploadsRepository
import com.fab.wab.merchant.core.network.client.HttpEngineProvider
import io.ktor.client.HttpClient
import org.koin.core.qualifier.named
import org.koin.dsl.module

/** Koin name of the bare storage client (presigned PUTs carry their own signature, never the bearer). */
const val STORAGE_CLIENT = "storageClient"

/** Mock mode: the generated presign fixture points at a one-segment storage URL; answer its PUT with an empty 200. */
private const val MOCK_STORAGE_FIXTURE = "mockStoragePut"
private const val MOCK_STORAGE_METHOD = "PUT"
private const val MOCK_STORAGE_PATH = "/{object}"
private const val MOCK_STORAGE_BODY = "{}"

/** Shared upload pipeline for registration documents, salon images, gallery and service media (MER-016). */
val uploadModule = module {
    single(named(STORAGE_CLIENT)) { HttpClient(get<HttpEngineProvider>().create()) }
    single { UploadsApi(get(), get(named(STORAGE_CLIENT))) }
    single<UploadsRepository> { UploadsRepositoryImpl(get()) }
    factory { UploadFileUseCase(get()) }
    single(named(MOCK_STORAGE_FIXTURE)) { MockFixture(MOCK_STORAGE_METHOD, MOCK_STORAGE_PATH, MOCK_STORAGE_BODY) }
}
