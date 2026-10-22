# ── DTOs (data layer) ──
-keep class com.fab.wab.merchant.feature.**.data.remote.dto.** { *; }
-keep class com.fab.wab.merchant.core.data.** { *; }
-keep class com.fab.wab.merchant.core.network.** { *; }

# ── Domain entities ──
-keep class com.fab.wab.merchant.feature.**.domain.model.** { *; }
-keep class com.fab.wab.merchant.core.domain.** { *; }

# ── kotlinx.serialization ──
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.AnnotationsKt
-keepclassmembers class kotlinx.serialization.json.** { *** Companion; }
-keepclasseswithmembers class kotlinx.serialization.json.** {
    kotlinx.serialization.KSerializer serializer(...);
}
-keep,includedescriptorclasses class com.fab.wab.merchant.**$$serializer { *; }
-keepclassmembers class com.fab.wab.merchant.** {
    *** Companion;
}
-keepclasseswithmembers class com.fab.wab.merchant.** {
    kotlinx.serialization.KSerializer serializer(...);
}

# ── Ktor ──
-keep class io.ktor.** { *; }
-dontwarn io.ktor.**
-keep class kotlin.coroutines.Continuation
