plugins {
    alias(libs.plugins.com.fab.wab.merchant.feature.di)
}

kotlin {
    android {
        namespace = "com.fab.wab.merchant.feature.finance.di"
        compileSdk = 36
        minSdk = 26
        androidResources { enable = true }
    }
    sourceSets.commonMain.dependencies {
        implementation(projects.feature.finance.domain)
        implementation(projects.feature.finance.data)
        implementation(projects.core.domain)
        implementation(libs.kotlinx.datetime)
    }
    sourceSets.commonTest.dependencies {
        implementation(libs.kotlinx.coroutines.test)
    }
}
