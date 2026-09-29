-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.**
-keepclassmembers class app.schuldashboard.data.api.** {
    *** Companion;
}
-keepclasseswithmembers class app.schuldashboard.data.api.** {
    kotlinx.serialization.KSerializer serializer(...);
}
