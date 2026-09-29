package app.schuldashboard.ui.common

import android.text.format.DateUtils
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import app.schuldashboard.R
import app.schuldashboard.ui.design.EmptyState
import app.schuldashboard.ui.design.Spinner
import app.schuldashboard.ui.icons.Lucide
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle

/** What a screen shows while its data loads, fails or is ready. */
sealed interface Load<out T> {
    data object Loading : Load<Nothing>
    data class Failed(val message: String? = null) : Load<Nothing>
    data class Ready<T>(val value: T) : Load<T>
}

@Composable
fun LoadingBox(modifier: Modifier = Modifier) {
    Box(modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Spinner(24.dp) }
}

@Composable
fun ErrorBox(message: String?, onRetry: () -> Unit, modifier: Modifier = Modifier) {
    Box(modifier.fillMaxSize().padding(24.dp), contentAlignment = Alignment.Center) {
        EmptyState(
            title = message ?: stringResource(R.string.error_loading),
            icon = Lucide.AlertCircle,
            primaryLabel = stringResource(R.string.action_retry),
            onPrimary = onRetry,
        )
    }
}

private val subjectNames = mapOf(
    "art" to R.string.subject_art,
    "biology" to R.string.subject_biology,
    "chemistry" to R.string.subject_chemistry,
    "homeroom" to R.string.subject_homeroom,
    "cs" to R.string.subject_cs,
    "dalton" to R.string.subject_dalton,
    "english" to R.string.subject_english,
    "enrichment" to R.string.subject_enrichment,
    "ethics" to R.string.subject_ethics,
    "french" to R.string.subject_french,
    "geography" to R.string.subject_geography,
    "german" to R.string.subject_german,
    "history" to R.string.subject_history,
    "latin" to R.string.subject_latin,
    "math" to R.string.subject_math,
    "music" to R.string.subject_music,
    "pe" to R.string.subject_pe,
    "philosophy" to R.string.subject_philosophy,
    "physics" to R.string.subject_physics,
    "politics" to R.string.subject_politics,
    "religion" to R.string.subject_religion,
    "theater" to R.string.subject_theater,
    "wpu" to R.string.subject_wpu,
    "wpu1" to R.string.subject_wpu1,
    "wpu2" to R.string.subject_wpu2,
    "wpu3" to R.string.subject_wpu3,
)

/** Stored subject names double as translation keys where one exists; custom names show as typed. */
@Composable
fun subjectLabel(name: String): String {
    val res = subjectNames[name.lowercase()] ?: return name
    return stringResource(res)
}

fun relativeTime(iso: String): String {
    val millis = runCatching { Instant.parse(iso).toEpochMilli() }.getOrNull() ?: return ""
    return DateUtils.getRelativeTimeSpanString(millis, System.currentTimeMillis(), DateUtils.MINUTE_IN_MILLIS).toString()
}

fun formatDueDate(iso: String): String {
    val date = runCatching { Instant.parse(iso).atZone(ZoneId.systemDefault()).toLocalDate() }.getOrNull()
        ?: return iso
    return date.format(numericDate())
}

/** The numeric date `toLocaleDateString()` prints on the site, with the full year. */
private fun numericDate(): DateTimeFormatter {
    val locale = java.util.Locale.getDefault()
    val pattern = java.time.format.DateTimeFormatterBuilder.getLocalizedDateTimePattern(
        FormatStyle.SHORT, null, java.time.chrono.IsoChronology.INSTANCE, locale,
    ).replace(Regex("y+"), "yyyy")
    return DateTimeFormatter.ofPattern(pattern, locale)
}

fun LocalDate.toDueIso(): String = atTime(12, 0).atZone(ZoneId.systemDefault()).toInstant().toString()
