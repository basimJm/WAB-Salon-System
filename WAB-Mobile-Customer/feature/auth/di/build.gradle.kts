plugins {
    alias(libs.plugins.com.fab.wab.customer.feature.di)
}

kotlin {
    android {
        namespace = "com.fab.wab.customer.feature.auth.di"
        compileSdk = 36
        minSdk = 26
        androidResources { enable = true }
    }
    sourceSets.commonMain.dependencies {
        implementation(projects.feature.auth.domain)
        implementation(projects.feature.auth.data)
        implementation(projects.core.domain)
    }
}
