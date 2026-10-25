plugins {
    alias(libs.plugins.com.fab.wab.merchant.feature.data)
}

kotlin {
    android {
        namespace = "com.fab.wab.merchant.feature.team.data"
        compileSdk = 36
        minSdk = 26
        androidResources { enable = true }
    }
    sourceSets.commonMain.dependencies {
        implementation(projects.feature.team.domain)
        implementation(libs.kotlinx.datetime)
    }
    sourceSets.commonTest.dependencies {
        implementation(libs.kotlinx.coroutines.test)
    }
}
