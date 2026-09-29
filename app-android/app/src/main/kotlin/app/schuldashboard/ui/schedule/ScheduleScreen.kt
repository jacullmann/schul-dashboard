package app.schuldashboard.ui.schedule

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.schuldashboard.R
import app.schuldashboard.domain.ScheduleConfig
import app.schuldashboard.domain.schedule.DisplayLesson
import app.schuldashboard.domain.schedule.LessonGroup
import app.schuldashboard.domain.schedule.SCHOOL_DAYS
import app.schuldashboard.domain.schedule.formatTimeOfDay
import app.schuldashboard.domain.schedule.slotRange
import app.schuldashboard.domain.schedule.slotStartMinutes
import app.schuldashboard.ui.common.ErrorBox
import app.schuldashboard.ui.common.Load
import app.schuldashboard.ui.common.LocalBottomInset
import app.schuldashboard.ui.common.LocalTopInset
import app.schuldashboard.ui.common.subjectLabel
import app.schuldashboard.ui.design.Divider
import app.schuldashboard.ui.design.PageHeader
import app.schuldashboard.ui.design.SegmentedControl
import app.schuldashboard.ui.design.Skeleton
import app.schuldashboard.ui.design.TabItem
import app.schuldashboard.ui.design.pagePadding
import app.schuldashboard.ui.theme.animateEnter
import app.schuldashboard.ui.design.inputShadow
import app.schuldashboard.ui.icons.Icon
import app.schuldashboard.ui.icons.Lucide
import app.schuldashboard.ui.theme.AppText
import app.schuldashboard.ui.theme.AppTheme
import app.schuldashboard.ui.theme.Radius
import kotlinx.coroutines.launch
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.format.TextStyle
import java.time.temporal.TemporalAdjusters
import java.util.Locale

/** The time column's width (3.25rem) and the grid gap. */
private val TimeColumn = 52.dp
private val Gap = 8.dp
private val LessonRow = 58.dp
private val LabelRow = 16.dp

/** The schedule's diagonal entrance wave: 40ms per column, 25ms per row. */
private fun waveDelay(column: Int, row: Int) = column * 40 + row * 25

@Composable
fun ScheduleScreen(modifier: Modifier = Modifier, viewModel: ScheduleViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val load = state.load
    if (load is Load.Failed) {
        ErrorBox(load.message, viewModel::reload, modifier)
        return
    }
    val schedule = (load as? Load.Ready)?.value
    val week = remember { schoolWeek() }
    val pager = rememberPagerState(initialPage = schedule?.initialDayIndex ?: week.todayIndex.coerceAtLeast(0)) { SCHOOL_DAYS.size }
    val scope = rememberCoroutineScope()
    var noticeDismissed by rememberSaveable { mutableStateOf(false) }
    // Only the first day arrives with the entrance wave; paging slides the others in.
    var hasPaged by remember { mutableStateOf(false) }
    if (pager.currentPage != (schedule?.initialDayIndex ?: pager.currentPage)) hasPaged = true

    Column(
        modifier.fillMaxSize().verticalScroll(rememberScrollState())
            .padding(pagePadding(LocalTopInset.current, LocalBottomInset.current)),
    ) {
        PageHeader(stringResource(R.string.nav_schedule), Modifier.animateEnter(0))
        if (schedule != null && schedule.hiddenLessons > 0 && !noticeDismissed) {
            Row(
                Modifier.fillMaxWidth().padding(bottom = 16.dp).animateEnter(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Icon(Lucide.ListFilter, null, size = 16.dp, tint = AppTheme.colors.onGhostMuted)
                Text(stringResource(R.string.personalized_notice), Modifier.weight(1f), style = AppText.sm, color = AppTheme.colors.onGhostMuted)
                app.schuldashboard.ui.design.IconButton(
                    Lucide.X, stringResource(R.string.a11y_dismiss), { noticeDismissed = true },
                    size = app.schuldashboard.ui.design.ButtonSize.Xs,
                )
            }
        }
        SegmentedControl(
            SCHOOL_DAYS.indices.map { TabItem(it, week.dates[it].dayOfMonth.toString()) },
            pager.currentPage,
            { scope.launch { pager.animateScrollToPage(it) } },
            Modifier.animateEnter(delayMs = 0),
            stretch = true,
        )
        HorizontalPager(pager, Modifier.fillMaxWidth().padding(top = 16.dp), verticalAlignment = Alignment.Top) { page ->
            val day = SCHOOL_DAYS[page]
            DayPanel(
                day = day,
                isToday = page == week.todayIndex,
                schedule = schedule,
                animated = !hasPaged,
            )
        }
    }
}

private class SchoolWeek(val dates: List<LocalDate>, val todayIndex: Int)

/** Monday to Friday of this week, or of the next one at the weekend. */
private fun schoolWeek(): SchoolWeek {
    val today = LocalDate.now()
    var monday = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
    if (today.dayOfWeek.value >= 6) monday = monday.plusWeeks(1)
    return SchoolWeek(List(5) { monday.plusDays(it.toLong()) }, if (today.dayOfWeek.value <= 5) today.dayOfWeek.value - 1 else -1)
}

private sealed interface ScheduleRow {
    val label: String

    data class Lesson(val slot: Int, override val label: String) : ScheduleRow
    data class Break(val afterSlot: Int, override val label: String, val minutes: Int) : ScheduleRow
    data class DayEnd(val afterSlot: Int, override val label: String) : ScheduleRow
}

/** Lesson rows up to the day's last lesson, the breaks between them, and the day's end. */
private fun dayRows(config: ScheduleConfig, lastSlot: Int): List<ScheduleRow> = buildList {
    for (slot in 1..lastSlot) {
        add(ScheduleRow.Lesson(slot, formatTimeOfDay(config.slotStartMinutes(slot))))
        val end = formatTimeOfDay(config.slotRange(slot).end)
        val breakMins = config.breaks[slot] ?: 0
        if (slot < lastSlot && breakMins > 0) add(ScheduleRow.Break(slot, end, breakMins))
        if (slot == lastSlot) add(ScheduleRow.DayEnd(slot, end))
    }
}

/**
 * One day as a phone shows it: the time column beside the lessons, which span the rows of their
 * slots, with breaks and the end of the day as labelled rules between them.
 */
@Composable
private fun DayPanel(day: Int, isToday: Boolean, schedule: ScheduleData?, animated: Boolean) {
    val colors = AppTheme.colors
    Column(Modifier.fillMaxWidth()) {
        Row(Modifier.fillMaxWidth().padding(bottom = Gap)) {
            Box(Modifier.width(TimeColumn + Gap))
            Text(
                DayOfWeek.of(day).getDisplayName(TextStyle.FULL, Locale.getDefault()),
                Modifier.weight(1f).padding(horizontal = 8.dp).animateEnter(enabled = animated, delayMs = waveDelay(2, 1)),
                style = AppText.base,
                fontWeight = FontWeight.Bold,
                color = if (isToday) colors.action else colors.onGhostMuted,
                textAlign = TextAlign.Center,
            )
        }
        if (schedule == null) {
            DaySkeleton()
            return@Column
        }
        val groups = schedule.groups.filter { it.day == day }.sortedBy { it.slot }
        if (groups.isEmpty()) {
            Text(
                stringResource(R.string.schedule_no_lessons),
                Modifier.fillMaxWidth().padding(vertical = 48.dp).animateEnter(enabled = animated),
                style = AppText.base, color = colors.onGhostMuted, textAlign = TextAlign.Center,
            )
            return@Column
        }
        val lastSlot = groups.maxOf { it.slot + it.span - 1 }
        val rows = dayRows(schedule.config, lastSlot)
        val heights = rowHeights(rows, groups)
        val tops = heights.runningFold(0.dp) { acc, h -> acc + h + Gap }
        val total = tops.last() - Gap

        Box(Modifier.fillMaxWidth().height(total)) {
            rows.forEachIndexed { i, row ->
                val gridRow = i + 2
                Box(Modifier.offset(y = tops[i]).height(heights[i]).fillMaxWidth()) {
                    when (row) {
                        is ScheduleRow.Lesson -> Column(
                            Modifier.width(TimeColumn).fillMaxSize().animateEnter(enabled = animated, delayMs = waveDelay(1, gridRow)),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.Center,
                        ) {
                            Text(row.slot.toString(), style = AppText.lg, fontWeight = FontWeight.Bold, color = colors.onGhost)
                            Text(row.label, style = AppText.xs, color = colors.onGhostMuted)
                        }
                        is ScheduleRow.Break, is ScheduleRow.DayEnd -> Row(
                            Modifier.fillMaxSize().animateEnter(enabled = animated, delayMs = waveDelay(1, gridRow)),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(Gap),
                        ) {
                            Text(row.label, Modifier.width(TimeColumn), style = AppText.xs, color = colors.onGhostMuted, textAlign = TextAlign.Center)
                            RuleLabel(
                                if (row is ScheduleRow.Break) stringResource(R.string.schedule_break_label, row.minutes)
                                else stringResource(R.string.schedule_day_end),
                            )
                        }
                    }
                }
            }
            groups.forEach { group ->
                val first = rows.indexOfFirst { it is ScheduleRow.Lesson && it.slot == group.slot }
                val last = rows.indexOfFirst { it is ScheduleRow.Lesson && it.slot == group.slot + group.span - 1 }
                    .takeIf { it >= 0 } ?: first
                if (first < 0) return@forEach
                LessonGroupCard(
                    group,
                    active = group.key == schedule.activeGroupKey,
                    modifier = Modifier
                        .padding(start = TimeColumn + Gap)
                        .offset(y = tops[first])
                        .height(tops[last] + heights[last] - tops[first])
                        .fillMaxWidth()
                        .animateEnter(enabled = animated, delayMs = waveDelay(2, first + 2)),
                )
            }
        }
    }
}

/** Rows are 58dp, grown where a cell stacks more lessons than fit; labels take one text line. */
private fun rowHeights(rows: List<ScheduleRow>, groups: List<LessonGroup>): List<Dp> {
    val heights = rows.map { if (it is ScheduleRow.Lesson) LessonRow else LabelRow }.toMutableList()
    groups.forEach { group ->
        val first = rows.indexOfFirst { it is ScheduleRow.Lesson && it.slot == group.slot }
        val last = rows.indexOfFirst { it is ScheduleRow.Lesson && it.slot == group.slot + group.span - 1 }.takeIf { it >= 0 } ?: first
        if (first < 0) return@forEach
        val available = (first..last).fold(0.dp) { acc, i -> acc + heights[i] } + Gap * (last - first)
        val needed = maxOf(LessonRow, 54.dp * group.lessons.size)
        if (needed > available) heights[last] = heights[last] + (needed - available)
    }
    return heights
}

/** ScheduleBreakDivider: a hairline either side of a small muted label. */
@Composable
private fun RuleLabel(text: String) {
    val colors = AppTheme.colors
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Box(Modifier.weight(1f).height(1.dp).background(colors.ghostBorder))
        Text(text, style = AppText.xs, color = colors.onGhostMuted, maxLines = 1)
        Box(Modifier.weight(1f).height(1.dp).background(colors.ghostBorder))
    }
}

/**
 * ScheduleLessonGroup: the lessons sharing a slot, stacked in one bordered cell. The lesson in
 * progress, or the next one, inverts to the action colours.
 */
@Composable
private fun LessonGroupCard(group: LessonGroup, active: Boolean, modifier: Modifier) {
    val colors = AppTheme.colors
    val shape = RoundedCornerShape(Radius.lg)
    Column(
        modifier
            .inputShadow(shape)
            .clip(shape)
            .background(if (active) colors.action else colors.surface)
            .border(1.dp, if (active) colors.action else colors.ghostBorder, shape),
    ) {
        group.lessons.forEachIndexed { index, lesson ->
            LessonItem(lesson, active, Modifier.weight(1f))
            if (index < group.lessons.lastIndex) Divider(color = if (active) colors.onGhostMuted else colors.ghostBorder)
        }
    }
}

@Composable
private fun LessonItem(lesson: DisplayLesson, active: Boolean, modifier: Modifier) {
    val colors = AppTheme.colors
    val strong = if (active) colors.onAction else colors.onGhost
    val muted = if (active) colors.onActionMuted else colors.onGhostMuted
    val roomChanged = !lesson.cancelled && lesson.originalRoom != null && lesson.originalRoom != lesson.room
    Column(modifier.fillMaxWidth().padding(horizontal = 10.dp, vertical = 6.dp)) {
        BoxWithConstraints {
        val courseMax = maxWidth * 0.55f
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                subjectLabel(lesson.subjectName),
                Modifier.weight(1f, fill = true),
                style = AppText.base,
                fontWeight = FontWeight.Bold,
                color = if (lesson.cancelled) muted else strong,
                textDecoration = if (lesson.cancelled) TextDecoration.LineThrough else null,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            lesson.courseName?.takeIf { it.isNotBlank() }?.let {
                Text(
                    "($it)", Modifier.padding(start = 4.dp).widthIn(max = courseMax), style = AppText.base, color = muted,
                    maxLines = 1, overflow = TextOverflow.Ellipsis,
                )
            }
        }
        }
        if (lesson.cancelled) {
            Text(stringResource(R.string.schedule_cancelled), style = AppText.base, fontWeight = FontWeight.Bold, color = colors.danger)
        }
        Text(
            buildAnnotatedString {
                if (roomChanged) {
                    withStyle(SpanStyle(textDecoration = TextDecoration.LineThrough)) { append(lesson.originalRoom.orEmpty()) }
                    append("  ")
                    withStyle(SpanStyle(fontWeight = FontWeight.Bold, color = strong)) { append(lesson.room.orEmpty()) }
                } else {
                    append(lesson.room?.takeIf { it.isNotBlank() } ?: "-")
                }
            },
            style = AppText.sm,
            color = muted,
            textDecoration = if (lesson.cancelled) TextDecoration.LineThrough else null,
        )
    }
}

/** ScheduleCellSkeleton: one pulsing cell per slot while the lessons load. */
@Composable
private fun DaySkeleton() {
    Column(verticalArrangement = Arrangement.spacedBy(Gap)) {
        repeat(6) { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(Gap), modifier = Modifier.animateEnter(delayMs = waveDelay(1, row + 2))) {
                Column(Modifier.width(TimeColumn).height(LessonRow), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                    Text((row + 1).toString(), style = AppText.lg, fontWeight = FontWeight.Bold, color = AppTheme.colors.onGhost)
                }
                Skeleton(Modifier.weight(1f).height(LessonRow), RoundedCornerShape(Radius.lg))
            }
        }
    }
}
