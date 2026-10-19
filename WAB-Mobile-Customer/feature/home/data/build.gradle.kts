plugins {
    alias(libs.plugins.com.fab.wab.customer.feature.data)
}

kotlin {
    android {
        namespace = "com.fab.wab.customer.feature.home.data"
        compileSdk = 36
        minSdk = 26
        androidResources { enable = true }
    }
    sourceSets.commonMain.dependencies {
        implementation(projects.feature.home.domain)
    }
}
