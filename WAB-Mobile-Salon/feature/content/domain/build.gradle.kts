plugins {
    alias(libs.plugins.com.fab.wab.merchant.feature.domain)
}

kotlin {
    android {
        namespace = "com.fab.wab.merchant.feature.content.domain"
        compileSdk = 36
        minSdk = 26
        androidResources { enable = true }
    }
    sourceSets.commonMain.dependencies {
        implementation(libs.kotlinx.datetime)
    }
    sourceSets.commonTest.dependencies {
        implementation(libs.kotlin.test)
    }
}
