plugins {
    alias(libs.plugins.com.fab.wab.customer.feature.di)
}

kotlin {
    android {
        namespace = "com.fab.wab.customer.feature.notifications.di"
        compileSdk = 36
        minSdk = 26
        androidResources { enable = true }
    }
    sourceSets.commonMain.dependencies {
        implementation(projects.feature.notifications.domain)
        implementation(projects.feature.notifications.data)
        implementation(projects.core.domain)
    }
}
