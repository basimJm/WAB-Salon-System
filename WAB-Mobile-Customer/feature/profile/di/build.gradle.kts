plugins {
    alias(libs.plugins.com.fab.wab.customer.feature.di)
}

kotlin {
    android {
        namespace = "com.fab.wab.customer.feature.profile.di"
        compileSdk = 36
        minSdk = 26
        androidResources { enable = true }
    }
    sourceSets.commonMain.dependencies {
        implementation(projects.feature.profile.domain)
        implementation(projects.feature.profile.data)
        implementation(projects.core.domain)
        implementation(projects.core.network)
    }
}
