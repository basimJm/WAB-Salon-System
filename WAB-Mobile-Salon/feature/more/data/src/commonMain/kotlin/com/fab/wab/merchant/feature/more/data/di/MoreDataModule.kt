package com.fab.wab.merchant.feature.more.data.di

import com.fab.wab.merchant.core.data.mock.MockFixture
import com.fab.wab.merchant.feature.more.data.AccountApi
import com.fab.wab.merchant.feature.more.data.AccountRepositoryImpl
import com.fab.wab.merchant.feature.more.data.MOCK_CHANGE_PHONE_FIXTURE
import com.fab.wab.merchant.feature.more.data.MOCK_ME_FIXTURE
import com.fab.wab.merchant.feature.more.data.MOCK_ME_UPDATE_FIXTURE
import com.fab.wab.merchant.feature.more.data.mockChangePhoneFixture
import com.fab.wab.merchant.feature.more.data.mockMeFixture
import com.fab.wab.merchant.feature.more.data.mockMeUpdateFixture
import com.fab.wab.merchant.feature.more.domain.AccountRepository
import org.koin.core.qualifier.named
import org.koin.dsl.module

/** M25 reads shared sources (session, settings, config) and the account calls (MER-049). */
val moreDataModule = module {
    single { AccountApi(get()) }
    single<AccountRepository> { AccountRepositoryImpl(get()) }
    single<MockFixture>(named(MOCK_ME_FIXTURE)) { mockMeFixture }
    single<MockFixture>(named(MOCK_ME_UPDATE_FIXTURE)) { mockMeUpdateFixture }
    single<MockFixture>(named(MOCK_CHANGE_PHONE_FIXTURE)) { mockChangePhoneFixture }
}
