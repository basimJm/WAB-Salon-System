plugins {
    alias(libs.plugins.com.fab.wab.merchant.kotlin.multiplatform.library)
    alias(libs.plugins.composeMultiplatform)
    alias(libs.plugins.composeCompiler)
}

// Pinned so the generated resource package follows the app package rather than
// rootProject.name, which would otherwise change when the project is renamed.
compose.resources {
    publicResClass = true
    packageOfResClass = "com.fab.wab.merchant.designsystem.resources"
}

kotlin {
    android {
        namespace = "com.fab.wab.merchant.core.designsystem"
        compileSdk = 36
        minSdk = 26
        androidResources { enable = true }
    }
    sourceSets.commonMain.dependencies {
        implementation(libs.bundles.compose)
        implementation(libs.coil.svg)
        api(libs.compose.uiToolingPreview)
        implementation(projects.core.ui)
        implementation(projects.core.domain)
        implementation(projects.core.common)
        implementation(libs.kotlinx.datetime)
        api(libs.material.icons.extended)
    }
    sourceSets.commonTest.dependencies {
        // MER-076: the media / hand-off / map reducers launch coroutines.
        implementation(libs.kotlinx.coroutines.test)
    }
    sourceSets.androidMain.dependencies {
        implementation(libs.compose.uiTooling)
        implementation(libs.androidx.core.ktx)
    }
}
