package app.schuldashboard.ui.groups.settings

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import app.schuldashboard.R
import app.schuldashboard.data.api.AdminLessonDto
import app.schuldashboard.data.api.LessonRequest
import app.schuldashboard.data.api.SubstitutionRequest
import app.schuldashboard.domain.schedule.SCHOOL_DAYS
import app.schuldashboard.ui.common.subjectLabel
import app.schuldashboard.ui.design.AppButton
import app.schuldashboard.ui.design.ButtonVariant
import app.schuldashboard.ui.design.Card
import app.schuldashboard.ui.design.Divider
import app.schuldashboard.ui.design.Dropdown
import app.schuldashboard.ui.design.FormGroup
import app.schuldashboard.ui.design.IconButton
import app.schuldashboard.ui.design.LabeledCheckbox
import app.schuldashboard.ui.design.ListRow
import app.schuldashboard.ui.design.TextField
import app.schuldashboard.ui.icons.Lucide
import app.schuldashboard.ui.theme.AppText
import app.schuldashboard.ui.theme.AppTheme
import app.schuldashboard.ui.theme.Radius
import java.time.DayOfWeek
import java.time.format.TextStyle
import java.util.Locale

private fun dayName(day: Int) = DayOfWeek.of(day).getDisplayName(TextStyle.FULL, Locale.getDefault())

@Composable
fun ScheduleTab(state: SettingsState, vm: GroupSettingsViewModel) {
    var editing by remember { mutableStateOf<AdminLessonDto?>(null) }
    var creating by remember { mutableStateOf(false) }
    var substituting by remember { mutableStateOf(false) }
    val group = vm.group
    val colors = AppTheme.colors

    if (group != null) ConfigSection(group.scheduleConfig.startTime, group.scheduleConfig.totalSlots,
        group.scheduleConfig.lessonDurationMins, group.scheduleConfig.breaks, state.busy, vm)

    SectionCard(stringResource(R.string.settings_lessons)) {
        AppButton({ creating = true }, icon = Lucide.Plus, text = stringResource(R.string.settings_lesson_add))
        SCHOOL_DAYS.forEach { day ->
            val lessons = state.lessons.filter { it.day == day }.sortedBy { it.slot }
            if (lessons.isEmpty()) return@forEach
            Text(dayName(day), Modifier.padding(top = 8.dp), style = AppText.base, fontWeight = FontWeight.Bold, color = colors.onGhostMuted)
            Card(Modifier.fillMaxWidth(), radius = Radius.lg, padding = PaddingValues(0.dp), shadow = true) {
                lessons.forEachIndexed { index, lesson ->
                    val subject = if (lesson.isDalton) "Dalton" else lesson.subjects?.name.orEmpty()
                    ListRow({ editing = lesson }, icon = {
                        Text(lesson.slot.toString(), Modifier.width(24.dp), style = AppText.lg, fontWeight = FontWeight.Bold, color = colors.onGhost)
                    }) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Text(subjectLabel(subject), style = AppText.base, fontWeight = FontWeight.Bold, color = colors.onGhost)
                                Text(
                                    listOfNotNull(lesson.courses?.name, lesson.room).joinToString(" • ").ifEmpty { "-" },
                                    style = AppText.sm, color = colors.onGhostMuted,
                                )
                            }
                            IconButton(Lucide.Trash2, stringResource(R.string.action_delete), { vm.deleteLesson(lesson.id) }, contentColor = colors.danger)
                        }
                    }
                    if (index < lessons.lastIndex) Divider()
                }
            }
        }
    }

    SectionCard(stringResource(R.string.settings_subs)) {
        AppButton({ substituting = true }, icon = Lucide.Plus, enabled = state.lessons.isNotEmpty(), text = stringResource(R.string.settings_sub_add))
        state.subs.forEach { sub ->
            val lesson = state.lessons.firstOrNull { it.id == sub.lessonId }
            Card(Modifier.fillMaxWidth(), radius = Radius.lg, padding = PaddingValues(start = 12.dp, top = 8.dp, bottom = 8.dp, end = 4.dp), shadow = true) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(
                            lesson?.let { "${dayName(it.day)}, ${it.slot}. ${subjectLabel(it.subjects?.name.orEmpty())}" } ?: sub.lessonId,
                            style = AppText.base, fontWeight = FontWeight.Medium, color = colors.onGhost,
                        )
                        Text(
                            listOfNotNull(
                                sub.subject, sub.room,
                                if (sub.cancelled == true) stringResource(R.string.schedule_cancelled) else null,
                                if (sub.hide == true) stringResource(R.string.settings_sub_hide) else null,
                            ).joinToString(" • "),
                            style = AppText.sm, color = if (sub.cancelled == true) colors.danger else colors.onGhostMuted,
                        )
                    }
                    IconButton(Lucide.Trash2, stringResource(R.string.action_delete), { vm.deleteSub(sub.id) }, contentColor = colors.danger)
                }
            }
        }
    }

    if (creating || editing != null) {
        LessonDialog(editing, state, onDismiss = { creating = false; editing = null }) {
            vm.saveLesson(it); creating = false; editing = null
        }
    }
    if (substituting) {
        SubstitutionDialog(state, { substituting = false }) { vm.saveSub(it); substituting = false }
    }
}

@Composable
private fun ConfigSection(startTime: String, totalSlots: Int, duration: Int, breaks: Map<Int, Int>, busy: Boolean, vm: GroupSettingsViewModel) {
    var start by remember(startTime) { mutableStateOf(startTime) }
    var slots by remember(totalSlots) { mutableStateOf(totalSlots.toString()) }
    var mins by remember(duration) { mutableStateOf(duration.toString()) }
    var breakText by remember(breaks) { mutableStateOf(breaks.entries.sortedBy { it.key }.joinToString(",") { "${it.key}:${it.value}" }) }
    SectionCard(stringResource(R.string.settings_config)) {
        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
            FormGroup(label = stringResource(R.string.settings_start_time)) { TextField(start, { start = it }) }
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                NumberField(stringResource(R.string.settings_total_slots), slots, { slots = it }, Modifier.weight(1f))
                NumberField(stringResource(R.string.settings_lesson_minutes), mins, { mins = it }, Modifier.weight(1f))
            }
            FormGroup(label = stringResource(R.string.settings_breaks)) { TextField(breakText, { breakText = it }) }
            val parsedBreaks = breakText.split(',').mapNotNull { part ->
                val (slot, length) = part.trim().split(':').takeIf { it.size == 2 } ?: return@mapNotNull null
                (slot.trim().toIntOrNull() ?: return@mapNotNull null) to (length.trim().toIntOrNull() ?: return@mapNotNull null)
            }.toMap()
            AppButton(
                { vm.saveScheduleConfig(start, slots.toInt(), mins.toInt(), parsedBreaks) },
                variant = ButtonVariant.Action,
                full = true,
                loading = busy,
                enabled = slots.toIntOrNull() != null && mins.toIntOrNull() != null && Regex("^\\d{1,2}:\\d{2}$").matches(start),
                text = stringResource(R.string.action_save),
            )
        }
    }
}

@Composable
private fun LessonDialog(existing: AdminLessonDto?, state: SettingsState, onDismiss: () -> Unit, onSave: (LessonRequest) -> Unit) {
    var day by remember { mutableStateOf(existing?.day ?: 1) }
    var slot by remember { mutableStateOf((existing?.slot ?: 1).toString()) }
    var duration by remember { mutableStateOf((existing?.duration ?: 1).toString()) }
    var room by remember { mutableStateOf(existing?.room.orEmpty()) }
    var dalton by remember { mutableStateOf(existing?.isDalton ?: false) }
    var subjectId by remember { mutableStateOf(existing?.subjectId ?: existing?.subjects?.id) }
    var courseId by remember { mutableStateOf(existing?.courseId ?: existing?.courses?.id) }
    val courses = state.subjects.firstOrNull { it.id == subjectId }?.courses.orEmpty()

    FormDialog(
        stringResource(if (existing == null) R.string.settings_lesson_add else R.string.action_edit),
        onDismiss,
        {
            onSave(
                LessonRequest(
                    id = existing?.id,
                    day = day,
                    slot = slot.toInt(),
                    duration = duration.toInt(),
                    room = room.trim().ifEmpty { null },
                    subjectId = if (dalton) null else subjectId,
                    courseId = if (dalton) null else courseId,
                    isDalton = dalton,
                ),
            )
        },
        enabled = slot.toIntOrNull() != null && duration.toIntOrNull() != null && (dalton || subjectId != null),
    ) {
        FormGroup(label = stringResource(R.string.settings_day)) {
            Dropdown(stringResource(R.string.settings_day), SCHOOL_DAYS.map { it.toString() to dayName(it) }, day.toString(), { day = it.toInt() })
        }
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            NumberField(stringResource(R.string.settings_slot), slot, { slot = it }, Modifier.weight(1f))
            NumberField(stringResource(R.string.settings_duration), duration, { duration = it }, Modifier.weight(1f))
        }
        FormGroup(label = stringResource(R.string.settings_room)) { TextField(room, { room = it }) }
        LabeledCheckbox(dalton, { dalton = it }, stringResource(R.string.group_dalton))
        if (!dalton) {
            FormGroup(label = stringResource(R.string.tasks_field_subject)) {
                Dropdown(
                    stringResource(R.string.tasks_field_subject),
                    state.subjects.map { it.id to subjectLabel(it.name) },
                    subjectId, { subjectId = it; courseId = null },
                )
            }
            if (courses.isNotEmpty()) {
                FormGroup(label = stringResource(R.string.tasks_field_course)) {
                    Dropdown(stringResource(R.string.tasks_field_course), courses.map { it.id to it.name }, courseId, { courseId = it })
                }
            }
        }
    }
}

@Composable
private fun SubstitutionDialog(state: SettingsState, onDismiss: () -> Unit, onSave: (SubstitutionRequest) -> Unit) {
    var lessonId by remember { mutableStateOf<String?>(null) }
    var subject by remember { mutableStateOf("") }
    var room by remember { mutableStateOf("") }
    var cancelled by remember { mutableStateOf(false) }
    var hide by remember { mutableStateOf(false) }
    FormDialog(
        stringResource(R.string.settings_sub_add),
        onDismiss,
        {
            onSave(
                SubstitutionRequest(
                    lessonId = checkNotNull(lessonId),
                    subject = subject.trim().ifEmpty { null },
                    room = room.trim().ifEmpty { null },
                    cancelled = cancelled.takeIf { it },
                    hide = hide.takeIf { it },
                ),
            )
        },
        enabled = lessonId != null,
    ) {
        FormGroup(label = stringResource(R.string.settings_lesson_pick)) {
            Dropdown(
                stringResource(R.string.settings_lesson_pick),
                state.lessons.sortedWith(compareBy({ it.day }, { it.slot })).map {
                    it.id to "${dayName(it.day)} ${it.slot}. ${if (it.isDalton) "Dalton" else subjectLabel(it.subjects?.name.orEmpty())}"
                },
                lessonId, { lessonId = it },
            )
        }
        FormGroup(label = stringResource(R.string.tasks_field_subject)) { TextField(subject, { subject = it }) }
        FormGroup(label = stringResource(R.string.settings_room)) { TextField(room, { room = it }) }
        LabeledCheckbox(cancelled, { cancelled = it }, stringResource(R.string.schedule_cancelled))
        LabeledCheckbox(hide, { hide = it }, stringResource(R.string.settings_sub_hide))
    }
}
