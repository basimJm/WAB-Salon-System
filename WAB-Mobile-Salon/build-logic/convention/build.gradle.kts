import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    `kotlin-dsl`
}

group = "com.fab.wab.merchant.buildlogic"

java {
    sourceCompatibility = JavaVersion.VERSION_21
    targetCompatibility = JavaVersion.VERSION_21
}

kotlin {
    compilerOptions {
        jvmTarget = JvmTarget.JVM_21
    }
}

dependencies {
    compileOnly(libs.android.gradlePlugin)
    compileOnly(libs.android.gradlePluginApi)
    compileOnly(libs.kotlin.gradlePlugin)
    compileOnly(libs.compose.gradlePlugin)
    compileOnly(libs.compose.compiler.gradlePlugin)
}

gradlePlugin {
    plugins {
        register("kotlinMultiplatformLibrary") {
            id = "com.fab.wab.merchant.kotlin.multiplatform.library"
            implementationClass = "com.fab.wab.merchant.buildlogic.KotlinMultiplatformLibraryPlugin"
        }
        register("composeApp") {
            id = "com.fab.wab.merchant.compose.app"
            implementationClass = "com.fab.wab.merchant.buildlogic.ComposeAppPlugin"
        }
        register("androidApp") {
            id = "com.fab.wab.merchant.android.app"
            implementationClass = "com.fab.wab.merchant.buildlogic.AndroidAppPlugin"
        }
        register("coreLibrary") {
            id = "com.fab.wab.merchant.core.library"
            implementationClass = "com.fab.wab.merchant.buildlogic.KmpCoreLibraryPlugin"
        }
        register("coreCompose") {
            id = "com.fab.wab.merchant.core.compose"
            implementationClass = "com.fab.wab.merchant.buildlogic.KmpCoreComposePlugin"
        }
        register("featureDomain") {
            id = "com.fab.wab.merchant.feature.domain"
            implementationClass = "com.fab.wab.merchant.buildlogic.KmpFeatureDomainPlugin"
        }
        register("featureData") {
            id = "com.fab.wab.merchant.feature.data"
            implementationClass = "com.fab.wab.merchant.buildlogic.KmpFeatureDataPlugin"
        }
        register("featurePresentation") {
            id = "com.fab.wab.merchant.feature.presentation"
            implementationClass = "com.fab.wab.merchant.buildlogic.KmpFeaturePresentationPlugin"
        }
        register("featureDi") {
            id = "com.fab.wab.merchant.feature.di"
            implementationClass = "com.fab.wab.merchant.buildlogic.KmpFeatureDiPlugin"
        }
    }
}
