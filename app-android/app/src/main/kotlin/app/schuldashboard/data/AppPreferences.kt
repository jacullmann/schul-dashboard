package app.schuldashboard.data

import android.content.Context
import android.content.res.Configuration
import app.schuldashboard.data.api.UserPreferences
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.util.Locale
import javax.inject.Inject
import javax.inject.Singleton

enum class ThemeMode(val key: String) {
    System("system"), Light("light"), Dark("dark");

    companion object {
        fun from(key: String?) = entries.firstOrNull { it.key == key } ?: System
    }
}

/** Device-local theme and language, kept in step with the account's stored preferences. */
@Singleton
class AppPreferences @Inject constructor(@ApplicationContext context: Context) {
    private val prefs = context.getSharedPreferences("preferences", Context.MODE_PRIVATE)

    private val _theme = MutableStateFlow(ThemeMode.from(prefs.getString(THEME, null)))
    val theme: StateFlow<ThemeMode> = _theme.asStateFlow()

    /** `null` follows the device language. */
    val language: String? get() = prefs.getString(LANGUAGE, null)

    fun setTheme(mode: ThemeMode) {
        prefs.edit().putString(THEME, mode.key).apply()
        _theme.value = mode
    }

    fun setLanguage(language: String?) {
        prefs.edit().putString(LANGUAGE, language).apply()
    }

    /** Returns whether the language changed, which needs the activity to be recreated. */
    fun syncFromAccount(preferences: UserPreferences?): Boolean {
        preferences ?: return false
        preferences.theme?.let { setTheme(ThemeMode.from(it)) }
        val remoteLanguage = preferences.language?.takeIf { it in SUPPORTED_LANGUAGES }
        if (remoteLanguage != null && remoteLanguage != language) {
            setLanguage(remoteLanguage)
            return true
        }
        return false
    }

    fun localized(base: Context): Context {
        val tag = language ?: return base
        val locale = Locale.forLanguageTag(tag)
        // Date and weekday formatting reads the default locale, which should speak the app's language.
        Locale.setDefault(locale)
        val configuration = Configuration(base.resources.configuration)
        configuration.setLocale(locale)
        return base.createConfigurationContext(configuration)
    }

    private companion object {
        const val THEME = "theme"
        const val LANGUAGE = "language"
        val SUPPORTED_LANGUAGES = setOf("de", "en")
    }
}
