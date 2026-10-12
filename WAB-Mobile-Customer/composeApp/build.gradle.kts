plugins {
    alias(libs.plugins.com.fab.wab.customer.compose.app)
}

// Pinned so the generated resource package follows the app package rather than
// rootProject.name, which would otherwise change when the project is renamed.
compose.resources {
    publicResClass = true
    packageOfResClass = "com.fab.wab.customer.app.resources"
}

kotlin {
    android {
        namespace = "com.fab.wab.customer.composeapp"
        compileSdk = 36
        minSdk = 26
        androidResources { enable = true }
    }
}
