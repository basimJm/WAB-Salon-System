# ── DTOs (data layer) ──
-keep class com.fab.wab.customer.feature.**.data.remote.dto.** { *; }
-keep class com.fab.wab.customer.core.data.** { *; }
-keep class com.fab.wab.customer.core.network.** { *; }

# ── Domain entities ──
-keep class com.fab.wab.customer.feature.**.domain.model.** { *; }
-keep class com.fab.wab.customer.core.domain.** { *; }

# ── kotlinx.serialization ──
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.AnnotationsKt
-keepclassmembers class kotlinx.serialization.json.** { *** Companion; }
-keepclasseswithmembers class kotlinx.serialization.json.** {
    kotlinx.serialization.KSerializer serializer(...);
}
-keep,includedescriptorclasses class com.fab.wab.customer.**$$serializer { *; }
-keepclassmembers class com.fab.wab.customer.** {
    *** Companion;
}
-keepclasseswithmembers class com.fab.wab.customer.** {
    kotlinx.serialization.KSerializer serializer(...);
}

# ── Ktor ──
-keep class io.ktor.** { *; }
-dontwarn io.ktor.**
-keep class kotlin.coroutines.Continuation
