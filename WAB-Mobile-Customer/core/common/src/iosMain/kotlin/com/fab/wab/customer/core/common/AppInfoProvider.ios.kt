package com.fab.wab.customer.core.common
import platform.Foundation.NSBundle; import kotlin.experimental.ExperimentalNativeApi
class IosAppInfoProvider : AppInfoProvider { override val appVersion: String get() = NSBundle.mainBundle.objectForInfoDictionaryKey("CFBundleShortVersionString") as? String ?: "Unknown"; override val appVersionCode: Int get() = NSBundle.mainBundle.objectForInfoDictionaryKey("CFBundleVersion") as? Int ?: 0; @OptIn(ExperimentalNativeApi::class) override val buildType: String get() = if (Platform.isDebugBinary) "debug" else "release" }
actual fun getAppInfoProvider(): AppInfoProvider = IosAppInfoProvider()
