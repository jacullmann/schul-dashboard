package app.schuldashboard.ui.dashboard

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.schuldashboard.R
import app.schuldashboard.data.api.AnnouncementDto
import app.schuldashboard.data.api.HwItem
import app.schuldashboard.domain.Group
import app.schuldashboard.domain.Permission
import app.schuldashboard.domain.schedule.DisplayLesson
import app.schuldashboard.domain.schedule.hasChange
import app.schuldashboard.domain.schedule.nextLessonGroup
import app.schuldashboard.ui.common.ErrorBox
import app.schuldashboard.ui.common.Load
import app.schuldashboard.ui.common.LocalBottomInset
import app.schuldashboard.ui.common.LocalTopInset
import app.schuldashboard.ui.common.formatDueDate
import app.schuldashboard.ui.common.subjectLabel
import app.schuldashboard.ui.design.BadgeLine
import app.schuldashboard.ui.design.ButtonSize
import app.schuldashboard.ui.design.ButtonOn
import app.schuldashboard.ui.design.Checkbox
import app.schuldashboard.ui.design.DashedPanel
import app.schuldashboard.ui.design.Divider
import app.schuldashboard.ui.design.EmptyState
import app.schuldashboard.ui.design.IconButton
import app.schuldashboard.ui.design.ItemCard
import app.schuldashboard.ui.design.Modal
import app.schuldashboard.ui.design.PageHeader
import app.schuldashboard.ui.design.SkeletonBlock
import app.schuldashboard.ui.theme.animateEnter
import app.schuldashboard.ui.design.pagePadding
import app.schuldashboard.ui.icons.Icon
import app.schuldashboard.ui.icons.Lucide
import app.schuldashboard.ui.schedule.ScheduleData
import app.schuldashboard.ui.schedule.ScheduleViewModel
import app.schuldashboard.ui.theme.AppText
import app.schuldashboard.ui.theme.AppTheme
import app.schuldashboard.ui.theme.Radius
import kotlinx.coroutines.delay
import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.util.Locale

private const val TASKS_HEADER_ORDER = 1
private const val TASKS_LIST_ORDER = 2
private const val TASK_SKELETON_COUNT = 3
private const val SCHEDULE_HEADER_ORDER = TASKS_LIST_ORDER + TASK_SKELETON_COUNT
private const val NEXT_LESSON_ORDER = SCHEDULE_HEADER_ORDER + 1
private const val SUBSTITUTIONS_ORDER = SCHEDULE_HEADER_ORDER + 2

/** A checked task stays in place this long, so the tick can be seen, before it slides away. */
private const val CHECK_LINGER_MS = 1200L

@Composable
fun DashboardScreen(
    group: Group,
    modifier: Modifier = Modifier,
    onOpenTasks: () -> Unit = {},
    onOpenSchedule: () -> Unit = {},
    onScheduleSetup: () -> Unit = {},
    viewModel: DashboardViewModel = hiltViewModel(),
    scheduleViewModel: ScheduleViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val schedule by scheduleViewModel.state.collectAsStateWithLifecycle()

    if (state is Load.Failed) {
        ErrorBox((state as Load.Failed).message, viewModel::load, modifier)
        return
    }
    val data = (state as? Load.Ready)?.value
    // Checked tasks linger until their timer runs out; the list then lets them go.
    var lingering by remember { mutableStateOf(emptySet<String>()) }
    val due = data?.let { dueSoon(it, lingering) }

    LazyColumn(
        modifier.fillMaxSize(),
        contentPadding = pagePadding(LocalTopInset.current, LocalBottomInset.current),
    ) {
        item(key = "date") { DateHeader() }

        item(key = "tasks-header") {
            PageHeader(
                stringResource(R.string.nav_tasks),
                Modifier.animateEnter(TASKS_HEADER_ORDER),
                action = { IconButton(Lucide.ChevronRight, stringResource(R.string.dashboard_view_all), onOpenTasks) },
            )
        }
        if (due == null) {
            items(TASK_SKELETON_COUNT, key = { "task-skeleton-$it" }) {
                SkeletonBlock(68.dp, Modifier.padding(bottom = 12.dp).animateEnter(TASKS_LIST_ORDER + it))
            }
        } else if (due.isEmpty()) {
            item(key = "tasks-empty") { NoTasks() }
        } else {
            items(due.size, key = { "task-${due[it].first.id}" }) { index ->
                val (item, _) = due[index]
                val checked = item.id in data.checked
                val isLingering = item.id in lingering
                LaunchedEffect(isLingering) {
                    if (isLingering) {
                        delay(CHECK_LINGER_MS)
                        lingering = lingering - item.id
                    }
                }
                ItemCard(
                    item.title,
                    Modifier.padding(bottom = 12.dp).animateItem().animateEnter(TASKS_LIST_ORDER + index),
                    checkbox = {
                        Checkbox(checked, {
                            if (!checked) lingering = lingering + item.id
                            viewModel.toggleChecked(item)
                        })
                    },
                    badges = { BadgeLine("${subjectLabel(item.subject)} • ${formatDueDate(item.dueDate)}") },
                    actions = { IconButton(Lucide.ArrowUpRight, stringResource(R.string.dashboard_view_task), onOpenTasks, size = ButtonSize.Sm) },
                )
            }
        }

        item(key = "schedule-header") {
            PageHeader(
                stringResource(R.string.nav_schedule),
                Modifier.padding(top = 20.dp).animateEnter(SCHEDULE_HEADER_ORDER),
                action = { IconButton(Lucide.ChevronRight, stringResource(R.string.dashboard_view_schedule), onOpenSchedule) },
            )
        }
        item(key = "schedule") {
            when (val load = schedule.load) {
                is Load.Ready -> if (load.value.groups.isEmpty() && group.can(Permission.EditSchedule)) {
                    EmptyState(
                        title = null,
                        message = stringResource(R.string.schedule_setup_cta),
                        icon = Lucide.CalendarDays,
                        primaryLabel = stringResource(R.string.schedule_setup_button),
                        onPrimary = onScheduleSetup,
                        modifier = Modifier.animateEnter(),
                    )
                } else {
                    ScheduleOverview(load.value)
                }
                else -> ScheduleOverview(null)
            }
        }
    }
}

/** The page title: today's date in the short form the site uses ("Tue, 29 Sep"). */
@Composable
private fun DateHeader() {
    val today = remember { LocalDate.now() }
    val text = remember(today) {
        val locale = Locale.getDefault()
        today.format(DateTimeFormatter.ofPattern(android.text.format.DateFormat.getBestDateTimePattern(locale, "EEEdMMM"), locale))
    }
    PageHeader(text, Modifier.animateEnter(0))
}

/** The three open tasks due soonest, like the site's overview; ties go to the latest edit. */
private fun dueSoon(data: DashboardData, lingering: Set<String>): List<Pair<HwItem, LocalDate>> =
    data.items
        .filter { it.id !in data.checked || it.id in lingering }
        .mapNotNull { item ->
            val due = runCatching { Instant.parse(item.dueDate).atZone(ZoneId.systemDefault()).toLocalDate() }.getOrNull()
            due?.let { item to it }
        }
        .sortedWith(compareBy<Pair<HwItem, LocalDate>> { it.second }.thenByDescending { it.first.updatedAt ?: it.first.createdAt })
        .take(3)

@Composable
private fun NoTasks() {
    val colors = AppTheme.colors
    Column(
        Modifier.fillMaxWidth().padding(vertical = 32.dp).animateEnter(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Box(Modifier.clip(CircleShape).background(colors.success.copy(alpha = 0.1f)).padding(12.dp)) {
            Icon(Lucide.CheckCircle2, null, size = 40.dp, tint = colors.success)
        }
        Text(
            stringResource(R.string.dashboard_no_tasks),
            style = AppText.sm,
            fontWeight = FontWeight.Bold,
            color = colors.onGhost,
            textAlign = TextAlign.Center,
        )
    }
}

/** Next lesson and this week's changes; skeletons stand in until the schedule arrives. */
@Composable
private fun ScheduleOverview(schedule: ScheduleData?) {
    Column(verticalArrangement = Arrangement.spacedBy(24.dp)) {
        Column(Modifier.animateEnter(NEXT_LESSON_ORDER)) {
            Text(stringResource(R.string.dashboard_next_lesson), Modifier.padding(bottom = 4.dp), style = AppText.h3, color = AppTheme.colors.onGhost)
            AnimatedContent(schedule, transitionSpec = { fadeIn(tween(0)) togetherWith fadeOut(tween(300)) }, label = "next") { data ->
                if (data == null) {
                    SkeletonBlock(80.dp)
                } else {
                    val next = remember(data) { nextLessonGroup(LocalDateTime.now(), data.groups, data.config) }
                    if (next == null) DashedPanel(stringResource(R.string.dashboard_no_more_lessons), Modifier.animateEnter())
                    else NextLessonCard(next.slot, next.lessons.first())
                }
            }
        }
        Column(Modifier.animateEnter(SUBSTITUTIONS_ORDER)) {
            Text(stringResource(R.string.dashboard_substitutions), Modifier.padding(bottom = 4.dp), style = AppText.h3, color = AppTheme.colors.onGhost)
            AnimatedContent(schedule, transitionSpec = { fadeIn(tween(0)) togetherWith fadeOut(tween(300)) }, label = "changes") { data ->
                if (data == null) {
                    SkeletonBlock(64.dp)
                } else {
                    val changes = remember(data) {
                        data.groups.flatMap { it.lessons }.filter { it.hasChange() }.sortedWith(compareBy({ it.day }, { it.slot }))
                    }
                    if (changes.isEmpty()) DashedPanel(stringResource(R.string.dashboard_no_substitutions), Modifier.animateEnter(1))
                    else Column(Modifier.animateEnter(1)) {
                        changes.forEachIndexed { index, lesson ->
                            ChangeRow(lesson)
                            if (index != changes.lastIndex) Divider()
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun NextLessonCard(slot: Int, lesson: DisplayLesson) {
    val colors = AppTheme.colors
    app.schuldashboard.ui.design.Card(
        Modifier.fillMaxWidth().animateEnter(),
        radius = Radius.lg,
        padding = androidx.compose.foundation.layout.PaddingValues(horizontal = 12.dp, vertical = 8.dp),
    ) {
        Text(stringResource(R.string.dashboard_slot, slot), Modifier.padding(bottom = 2.dp), style = AppText.xs, color = colors.onGhostMuted)
        Text(
            subjectLabel(lesson.subjectName), style = AppText.base, fontWeight = FontWeight.Bold, color = colors.onGhost,
            maxLines = 1, overflow = TextOverflow.Ellipsis,
        )
        Text(
            lesson.room?.takeIf { it.isNotBlank() } ?: stringResource(R.string.dashboard_no_room),
            style = AppText.sm, color = colors.onGhostMuted,
        )
    }
}

@Composable
private fun ChangeRow(lesson: DisplayLesson) {
    val colors = AppTheme.colors
    Column(Modifier.fillMaxWidth().padding(vertical = 12.dp)) {
        val day = DayOfWeek.of(lesson.day).getDisplayName(TextStyle.FULL, Locale.getDefault())
        Text(
            stringResource(R.string.dashboard_slot, lesson.slot) + " " + subjectLabel(lesson.subjectName) + ", " + day,
            style = AppText.base, fontWeight = FontWeight.Medium, color = colors.onGhost,
        )
        if (lesson.originalRoom != null && lesson.originalRoom != lesson.room) {
            val template = stringResource(R.string.dashboard_room_change, "\u0000", lesson.originalRoom.orEmpty())
            val (before, after) = template.split("\u0000").let { it[0] to it.getOrElse(1) { "" } }
            Text(
                buildAnnotatedString {
                    append(before)
                    withStyle(SpanStyle(fontWeight = FontWeight.Bold, color = colors.onGhost)) { append(lesson.room.orEmpty()) }
                    append(after)
                },
                style = AppText.base, color = colors.onGhostMuted,
            )
        }
        if (lesson.cancelled) {
            Text(stringResource(R.string.dashboard_cancelled), style = AppText.base, fontWeight = FontWeight.Bold, color = colors.danger)
        }
    }
}

/**
 * The announcement bar docked under the header: the current announcement centred in a strip
 * tinted by its colour; tapping cycles through them and the ellipsis lists them all.
 */
@Composable
fun AnnouncementBar(announcements: List<AnnouncementDto>) {
    if (announcements.isEmpty()) return
    val colors = AppTheme.colors
    var index by remember { mutableStateOf(0) }
    var showAll by remember { mutableStateOf(false) }
    val current = announcements[index.coerceIn(announcements.indices)]
    val danger = current.color == "danger" || (current.color == null && current.priority == "high")
    val background = when {
        danger -> colors.danger
        current.color == "warn" -> colors.warn
        else -> colors.surface
    }
    val content = if (danger) colors.onDanger else if (current.color == "warn") colors.onWarn else colors.onGhost
    Column(Modifier.fillMaxWidth().background(background).clickable { index = (index + 1) % announcements.size }) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            AnimatedContent(current, Modifier.weight(1f), transitionSpec = { fadeIn(tween(200)) togetherWith fadeOut(tween(200)) }, label = "ann") {
                Text(
                    it.content, Modifier.padding(horizontal = 12.dp, vertical = 4.dp), style = AppText.sm,
                    color = content, textAlign = TextAlign.Center,
                )
            }
            if (announcements.size > 1) {
                Text(
                    "${index + 1}/${announcements.size}", Modifier.padding(end = 4.dp), style = AppText.xs,
                    color = if (danger) colors.onDangerMuted else colors.onGhostMuted,
                )
            }
            IconButton(
                Lucide.Ellipsis, stringResource(R.string.a11y_more), { showAll = true },
                Modifier.padding(end = 4.dp), size = ButtonSize.Sm, on = if (danger) ButtonOn.Danger else ButtonOn.Ghost,
            )
        }
        Divider(color = if (danger) colors.dangerHighlight else colors.ghostBorder)
    }
    Modal(showAll, { showAll = false }, stringResource(R.string.dashboard_announcements)) {
        announcements.forEachIndexed { i, announcement ->
            val dot = when (announcement.color) {
                "danger" -> colors.danger
                "warn" -> colors.warn
                else -> colors.onGhostSubtle
            }
            Row(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(Radius.xl2))
                    .background(if (i == index) colors.surface else androidx.compose.ui.graphics.Color.Transparent)
                    .clickable { index = i; showAll = false }
                    .padding(horizontal = 20.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Box(Modifier.padding(2.dp).clip(CircleShape).background(dot).padding(4.dp))
                Text(announcement.content, style = AppText.sm, fontWeight = FontWeight.Medium, color = colors.onGhostMuted, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
        }
    }
}
