package app.schuldashboard.ui.schedule

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.viewModelScope
import app.schuldashboard.data.AuthState
import app.schuldashboard.data.RawSchedule
import app.schuldashboard.data.ScheduleRepository
import app.schuldashboard.data.SessionRepository
import app.schuldashboard.domain.GroupType
import app.schuldashboard.domain.ScheduleConfig
import app.schuldashboard.domain.schedule.LessonGroup
import app.schuldashboard.domain.schedule.activeOrNextGroupKey
import app.schuldashboard.domain.schedule.applySubstitutions
import app.schuldashboard.domain.schedule.defaultDayIndex
import app.schuldashboard.domain.schedule.groupLessonsBySlot
import app.schuldashboard.domain.schedule.personalizeLessons
import app.schuldashboard.ui.common.Load
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.time.LocalDateTime
import javax.inject.Inject

data class ScheduleData(
    val config: ScheduleConfig,
    val groups: List<LessonGroup>,
    val hiddenLessons: Int,
    val initialDayIndex: Int,
    val activeGroupKey: String?,
)

data class ScheduleUiState(val load: Load<ScheduleData> = Load.Loading)

@HiltViewModel
class ScheduleViewModel @Inject constructor(
    application: Application,
    handle: SavedStateHandle,
    private val sessions: SessionRepository,
    private val repository: ScheduleRepository,
) : AndroidViewModel(application) {
    private val groupId: String = checkNotNull(handle["groupId"])

    private val raw = MutableStateFlow<Load<RawSchedule>>(Load.Loading)

    /** Recomputed whenever the member's course selection changes, without another request. */
    val state: StateFlow<ScheduleUiState> = combine(raw, sessions.state) { schedule, auth ->
        val load = when (schedule) {
            Load.Loading -> Load.Loading
            is Load.Failed -> schedule
            is Load.Ready -> (auth as? AuthState.LoggedIn)?.let { Load.Ready(build(schedule.value, it)) } ?: Load.Loading
        }
        ScheduleUiState(load)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), ScheduleUiState())

    init {
        reload()
    }

    fun reload() {
        raw.value = Load.Loading
        viewModelScope.launch {
            raw.value = runCatching { repository.load(groupId) }
                .fold({ Load.Ready(it) }, { Load.Failed() })
        }
    }

    private fun build(schedule: RawSchedule, auth: AuthState.LoggedIn): ScheduleData {
        val group = auth.groups.firstOrNull { it.id == groupId }
        val config = group?.scheduleConfig ?: ScheduleConfig("08:00", 9, 45, emptyMap())
        val user = auth.user
        val personal = personalizeLessons(
            lessons = schedule.lessons,
            subjects = schedule.subjects,
            userCourses = user.courses,
            isPersonalized = user.personalized && user.doneSetup,
            hasCourseSelection = user.doneSetup,
            schedulesCoursesIndividually = group?.groupType == GroupType.Abitur,
        )
        val effective = applySubstitutions(personal.lessons, schedule.substitutions)
        val groups = groupLessonsBySlot(effective)
        val now = LocalDateTime.now()
        return ScheduleData(
            config = config,
            groups = groups,
            hiddenLessons = schedule.hiddenByServer + personal.hiddenCount,
            initialDayIndex = defaultDayIndex(now, effective, config),
            activeGroupKey = activeOrNextGroupKey(now, groups, config),
        )
    }
}
