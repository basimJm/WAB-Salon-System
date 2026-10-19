plugins {
    alias(libs.plugins.com.fab.wab.customer.feature.di)
}

kotlin {
    android {
        namespace = "com.fab.wab.customer.feature.salons.di"
        compileSdk = 36
        minSdk = 26
        androidResources { enable = true }
    }
    sourceSets.commonMain.dependencies {
        implementation(projects.feature.salons.domain)
        implementation(projects.feature.salons.data)
        implementation(projects.core.domain)
    }
}
