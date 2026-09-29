package app.schuldashboard.ui.groups

import android.app.Application
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import app.schuldashboard.R
import app.schuldashboard.data.AuthState
import app.schuldashboard.data.ScheduleRepository
import app.schuldashboard.data.SessionRepository
import app.schuldashboard.data.api.CourseSelection
import app.schuldashboard.data.api.ScheduleSubjectDto
import app.schuldashboard.data.api.apiErrorMessage
import app.schuldashboard.ui.common.ErrorBox
import app.schuldashboard.ui.common.Load
import app.schuldashboard.ui.common.LoadingBox
import app.schuldashboard.ui.common.subjectLabel
import app.schuldashboard.ui.design.AppButton
import app.schuldashboard.ui.design.ButtonVariant
import app.schuldashboard.ui.design.Dropdown
import app.schuldashboard.ui.design.FormError
import app.schuldashboard.ui.design.FormGroup
import app.schuldashboard.ui.design.SubPageHeader
import app.schuldashboard.ui.theme.AppText
import app.schuldashboard.ui.theme.AppTheme
import app.schuldashboard.ui.theme.animateEnter
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import javax.inject.Inject

private const val NO_COURSE = "NONE"

/** How a subject's courses are offered: `core` has nothing to pick, required ones must be picked. */
private val REQUIRED_CATEGORIES = setOf("elective", "mandatory")
private val OPTIONAL_CATEGORIES = setOf("extra", "optional", "zk")

data class CoursesState(
    val subjects: Load<List<ScheduleSubjectDto>> = Load.Loading,
    /** subjectId to courseId, or [NO_COURSE]. */
    val selection: Map<String, String> = emptyMap(),
    val saving: Boolean = false,
    val error: String? = null,
) {
    val required get() = (subjects as? Load.Ready)?.value.orEmpty().filter { it.category in REQUIRED_CATEGORIES && !it.courses.isNullOrEmpty() }
    val optional get() = (subjects as? Load.Ready)?.value.orEmpty().filter { it.category in OPTIONAL_CATEGORIES && !it.courses.isNullOrEmpty() }
    val complete get() = required.all { selection[it.id].orEmpty().isNotEmpty() && selection[it.id] != NO_COURSE }
}

@HiltViewModel
class MyCoursesViewModel @Inject constructor(
    application: Application,
    handle: SavedStateHandle,
    private val sessions: SessionRepository,
    private val schedule: ScheduleRepository,
    private val json: Json,
) : AndroidViewModel(application) {
    private val groupId: String = checkNotNull(handle["groupId"])
    private val _state = MutableStateFlow(CoursesState())
    val state: StateFlow<CoursesState> = _state.asStateFlow()
    private val _saved = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    val saved = _saved.asSharedFlow()

    init {
        load()
    }

    fun load() {
        _state.update { it.copy(subjects = Load.Loading) }
        viewModelScope.launch {
            runCatching { schedule.subjects(groupId) }
                .onSuccess { subjects ->
                    val enrolled = (sessions.state.value as? AuthState.LoggedIn)?.user?.courses.orEmpty()
                    val selection = buildMap {
                        subjects.forEach { subject ->
                            val course = enrolled.firstOrNull { e -> e.subjectId == subject.id && subject.courses?.any { it.id == e.courseId } == true }
                            put(subject.id, course?.courseId ?: if (subject.category in OPTIONAL_CATEGORIES) NO_COURSE else "")
                        }
                    }
                    _state.update { it.copy(subjects = Load.Ready(subjects), selection = selection) }
                }
                .onFailure { _state.update { it.copy(subjects = Load.Failed()) } }
        }
    }

    fun select(subjectId: String, courseId: String) = _state.update { it.copy(selection = it.selection + (subjectId to courseId)) }

    fun save() {
        val current = _state.value
        val subjects = (current.subjects as? Load.Ready)?.value ?: return
        val courses = (current.required + current.optional).mapNotNull { subject ->
            current.selection[subject.id]?.takeIf { it.isNotEmpty() && it != NO_COURSE }?.let { CourseSelection(subject.id, it) }
        }
        _state.update { it.copy(saving = true, error = null) }
        viewModelScope.launch {
            try {
                sessions.saveCourses(groupId, courses, subjects.mapTo(hashSetOf()) { it.id })
                _saved.tryEmit(Unit)
            } catch (e: Exception) {
                val fallback = getApplication<Application>().getString(R.string.error_unknown)
                _state.update { it.copy(error = e.apiErrorMessage(json, fallback)) }
            } finally {
                _state.update { it.copy(saving = false) }
            }
        }
    }
}

/** GroupSettingsMyCourses: a muted intro, then one select per subject that offers courses. */
@Composable
fun MyCoursesScreen(onDone: () -> Unit, viewModel: MyCoursesViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val colors = AppTheme.colors
    LaunchedEffect(Unit) { viewModel.saved.collect { onDone() } }

    Column(Modifier.fillMaxSize().background(colors.canvas).statusBarsPadding()) {
        SubPageHeader(stringResource(R.string.courses_title), onDone, large = false)
        when (val subjects = state.subjects) {
            Load.Loading -> LoadingBox()
            is Load.Failed -> ErrorBox(subjects.message, viewModel::load)
            is Load.Ready -> Column(
                Modifier.fillMaxSize().verticalScroll(rememberScrollState()).navigationBarsPadding()
                    .padding(horizontal = 24.dp, vertical = 16.dp),
            ) {
                Text(
                    stringResource(R.string.courses_intro), Modifier.padding(bottom = 16.dp).animateEnter(0),
                    style = AppText.base.copy(lineHeight = 26.sp), color = colors.onGhostMuted,
                )
                Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    (state.required + state.optional).forEachIndexed { index, subject ->
                        val optional = subject.category in OPTIONAL_CATEGORIES
                        val options = buildList {
                            if (optional) add(NO_COURSE to stringResource(R.string.courses_none))
                            subject.courses.orEmpty().forEach { add(it.id to it.name) }
                        }
                        FormGroup(Modifier.animateEnter(1 + index), label = subjectLabel(subject.name)) {
                            Dropdown(
                                subjectLabel(subject.name), options, state.selection[subject.id]?.ifEmpty { null },
                                { viewModel.select(subject.id, it) },
                            )
                        }
                    }
                    FormError(state.error)
                    Row(Modifier.fillMaxWidth().padding(top = 8.dp), horizontalArrangement = Arrangement.End) {
                        AppButton(
                            viewModel::save, variant = ButtonVariant.Action, loading = state.saving,
                            enabled = state.complete, text = stringResource(R.string.action_save),
                        )
                    }
                }
            }
        }
    }
}
