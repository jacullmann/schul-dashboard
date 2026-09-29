package app.schuldashboard.ui.design

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import app.schuldashboard.R
import app.schuldashboard.ui.icons.Lucide
import app.schuldashboard.ui.theme.AppText
import app.schuldashboard.ui.theme.AppTheme
import app.schuldashboard.ui.theme.Motion
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.util.Locale

/**
 * BaseDatePicker: an input-shaped button showing the chosen day, opening a month calendar with
 * "tomorrow" and "next week" shortcuts. Today is picked out in the accent colour.
 */
@Composable
fun DateField(
    value: LocalDate?,
    onChange: (LocalDate) -> Unit,
    modifier: Modifier = Modifier,
    min: LocalDate? = null,
) {
    var open by remember { mutableStateOf(false) }
    val today = remember { LocalDate.now() }
    val locale = Locale.getDefault()
    val label = value?.let {
        val skeleton = if (it.year == today.year) "EEEdMMM" else "EEEdMMMyyyy"
        it.format(DateTimeFormatter.ofPattern(android.text.format.DateFormat.getBestDateTimePattern(locale, skeleton), locale))
    }
    val shortcuts = listOf(
        stringResource(R.string.date_tomorrow) to today.plusDays(1),
        stringResource(R.string.date_next_week) to today.plusWeeks(1),
    ).filter { min == null || !it.second.isBefore(min) }
    val shortcutLabel = shortcuts.firstOrNull { it.second == value }?.first

    AppButton(
        { open = true },
        modifier,
        variant = ButtonVariant.Input,
        icon = Lucide.Calendar,
        iconTrailing = true,
        contentColor = if (value == null) AppTheme.colors.onGhostSubtle else null,
        text = listOfNotNull(label ?: stringResource(R.string.select_placeholder), shortcutLabel).joinToString(" · "),
    )
    Menu(open, { open = false }) {
        Calendar(value, today, min, shortcuts) { onChange(it); open = false }
    }
}

@Composable
private fun Calendar(
    value: LocalDate?,
    today: LocalDate,
    min: LocalDate?,
    shortcuts: List<Pair<String, LocalDate>>,
    onSelect: (LocalDate) -> Unit,
) {
    val colors = AppTheme.colors
    val locale = Locale.getDefault()
    var month by remember { mutableStateOf(YearMonth.from(value ?: today)) }
    Column(Modifier.padding(horizontal = 12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            shortcuts.forEach { (text, date) ->
                val active = date == value
                Text(
                    text,
                    Modifier.clip(CircleShape)
                        .background(if (active) colors.action else Color.Transparent)
                        .border(1.dp, if (active) Color.Transparent else colors.ghostBorder, CircleShape)
                        .clickable { onSelect(date) }
                        .padding(horizontal = 12.dp, vertical = 4.dp),
                    style = AppText.sm,
                    fontWeight = FontWeight.Medium,
                    color = if (active) colors.onAction else colors.onGhostMuted,
                )
            }
        }
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(Lucide.ChevronLeft, stringResource(R.string.date_prev_month), { month = month.minusMonths(1) })
            Text(
                month.format(DateTimeFormatter.ofPattern("LLLL yyyy", locale)).replaceFirstChar { it.titlecase(locale) },
                Modifier.weight(1f),
                style = AppText.sm,
                fontWeight = FontWeight.SemiBold,
                color = colors.onGhost,
                textAlign = TextAlign.Center,
            )
            IconButton(Lucide.ChevronRight, stringResource(R.string.date_next_month), { month = month.plusMonths(1) })
        }
        Row {
            DayOfWeek.entries.forEach { day ->
                Text(
                    day.getDisplayName(TextStyle.SHORT, locale),
                    Modifier.weight(1f).padding(bottom = 4.dp),
                    style = AppText.xs, fontWeight = FontWeight.Medium, color = colors.onGhostMuted, textAlign = TextAlign.Center,
                )
            }
        }
        AnimatedContent(
            month,
            transitionSpec = {
                val forward = targetState > initialState
                (slideInHorizontally(tween(300, easing = Motion.Drawer)) { if (forward) it else -it } + fadeIn(tween(300))) togetherWith
                    (slideOutHorizontally(tween(300, easing = Motion.Drawer)) { if (forward) -it else it } + fadeOut(tween(300)))
            },
            label = "month",
        ) { shown ->
            val first = shown.atDay(1)
            val lead = first.dayOfWeek.value - 1
            val cells = List(42) { index -> (index - lead).takeIf { it in 0 until shown.lengthOfMonth() }?.let { first.plusDays(it.toLong()) } }
            // Six rows' height keeps the sheet steady from month to month.
            Column(Modifier.height(240.dp)) {
                cells.chunked(7).filter { week -> week.any { it != null } }.forEach { week ->
                    Row(Modifier.weight(1f)) {
                        week.forEach { date ->
                            Box(Modifier.weight(1f), contentAlignment = Alignment.Center) {
                                if (date != null) DayCell(date, date == value, date == today, min != null && date.isBefore(min)) { onSelect(date) }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun DayCell(date: LocalDate, selected: Boolean, today: Boolean, disabled: Boolean, onClick: () -> Unit) {
    val colors = AppTheme.colors
    val background = when {
        selected && today -> colors.accent
        selected -> colors.action
        else -> Color.Transparent
    }
    val content = when {
        selected && today -> colors.onGhost
        selected -> colors.onAction
        disabled -> colors.onGhostSubtle
        today -> colors.accent
        else -> colors.onGhostMuted
    }
    Box(
        Modifier.size(40.dp).clip(CircleShape).background(background).clickable(enabled = !disabled, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            date.dayOfMonth.toString(),
            style = AppText.sm,
            fontWeight = if (selected) FontWeight.SemiBold else if (today) FontWeight.Bold else FontWeight.Normal,
            color = content,
        )
    }
}
