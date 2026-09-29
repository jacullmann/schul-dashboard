package app.schuldashboard.ui.tasks

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.viewModelScope
import app.schuldashboard.R
import app.schuldashboard.data.AuthState
import app.schuldashboard.data.ImageRepository
import app.schuldashboard.data.ItemFilter
import app.schuldashboard.data.api.ImageApi
import app.schuldashboard.data.api.ImageItem
import app.schuldashboard.data.api.NoteRequest
import android.net.Uri
import app.schuldashboard.data.PrivateTasksRepository
import app.schuldashboard.data.ScheduleRepository
import app.schuldashboard.data.SessionRepository
import app.schuldashboard.data.TasksRepository
import app.schuldashboard.data.api.HwItem
import app.schuldashboard.data.api.PrivateTaskDto
import app.schuldashboard.data.api.apiErrorMessage
import app.schuldashboard.data.api.requireSuccess
import app.schuldashboard.ui.common.Load
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import javax.inject.Inject

/** The lists the task screen switches between; only [Private] is not tied to the group. */
enum class TaskTab(val type: String?) {
    All("all"), Homework("homework"), Dalton("dalton"), Exam("exam"), Private(null)
}

data class TasksUiState(
    val tab: TaskTab = TaskTab.All,
    val showOld: Boolean = false,
    val subject: String? = null,
    val hideChecked: Boolean = false,
    val items: Load<List<HwItem>> = Load.Loading,
    val hiddenByCourses: Int = 0,
    val checked: Set<String> = emptySet(),
    val pinned: Set<String> = emptySet(),
    val subjects: List<String> = emptyList(),
    val privateTasks: Load<List<PrivateTaskDto>> = Load.Loading,
    val uploading: Boolean = false,
    val message: String? = null,
) {
    /** Pinned items lead, the rest keeps the server's order. */
    val visibleItems: List<HwItem>
        get() {
            val list = (items as? Load.Ready)?.value.orEmpty()
            val (pinnedFirst, rest) = list.partition { it.id in pinned }
            return pinnedFirst + rest
        }
}

private const val MAX_UPLOADS = 10

@HiltViewModel
class TasksViewModel @Inject constructor(
    application: Application,
    handle: SavedStateHandle,
    private val sessions: SessionRepository,
    private val tasks: TasksRepository,
    private val privateTasks: PrivateTasksRepository,
    private val schedule: ScheduleRepository,
    private val images: ImageRepository,
    private val imageApi: ImageApi,
    private val json: Json,
) : AndroidViewModel(application) {
    private val groupId: String = checkNotNull(handle["groupId"])

    private val _state = MutableStateFlow(TasksUiState())
    val state: StateFlow<TasksUiState> = _state.asStateFlow()

    private var listJob: Job? = null

    val currentUserId: String get() = (sessions.state.value as? AuthState.LoggedIn)?.user?.id.orEmpty()

    init {
        loadUserState()
        loadSubjects()
        reload()
        loadPrivate()
    }

    private fun errorMessage(e: Throwable) =
        e.apiErrorMessage(json, getApplication<Application>().getString(R.string.error_unknown))

    private fun loadUserState() = viewModelScope.launch {
        runCatching { tasks.checkedIds() }.onSuccess { ids -> _state.update { it.copy(checked = ids) } }
        runCatching { tasks.pinnedIds() }.onSuccess { ids -> _state.update { it.copy(pinned = ids) } }
    }

    private fun loadSubjects() = viewModelScope.launch {
        runCatching { schedule.subjects(groupId) }
            .onSuccess { subjects -> _state.update { it.copy(subjects = subjects.map { s -> s.name }) } }
    }

    fun setTab(tab: TaskTab) {
        _state.update { it.copy(tab = tab) }
        if (tab != TaskTab.Private) reload()
    }

    fun setShowOld(value: Boolean) {
        _state.update { it.copy(showOld = value) }
        reload()
    }

    fun setSubject(subject: String?) {
        _state.update { it.copy(subject = subject) }
        reload()
    }

    fun setHideChecked(value: Boolean) {
        _state.update { it.copy(hideChecked = value) }
        reload()
    }

    fun clearMessage() = _state.update { it.copy(message = null) }

    fun reload() {
        val current = _state.value
        val type = current.tab.type ?: return
        val loggedIn = sessions.state.value as? AuthState.LoggedIn
        listJob?.cancel()
        _state.update { it.copy(items = Load.Loading) }
        listJob = viewModelScope.launch {
            val filter = ItemFilter(
                type = type,
                old = current.showOld,
                subject = current.subject,
                hideChecked = current.hideChecked,
                personalized = loggedIn?.user?.let { it.personalized && it.doneSetup } == true,
            )
            runCatching { tasks.items(groupId, filter) }
                .onSuccess { page ->
                    _state.update { it.copy(items = Load.Ready(page.items), hiddenByCourses = page.hiddenByCourses) }
                }
                .onFailure { e -> _state.update { it.copy(items = Load.Failed(errorMessage(e))) } }
        }
    }

    /** Optimistic: the checkbox flips at once and is restored if the server refuses. */
    fun toggleChecked(item: HwItem) {
        val desired = item.id !in _state.value.checked
        _state.update { it.copy(checked = if (desired) it.checked + item.id else it.checked - item.id) }
        viewModelScope.launch {
            runCatching { tasks.setChecked(groupId, item.id, desired) }.onFailure {
                _state.update { s -> s.copy(checked = if (desired) s.checked - item.id else s.checked + item.id) }
            }
        }
    }

    fun togglePinned(item: HwItem) {
        val desired = item.id !in _state.value.pinned
        _state.update { it.copy(pinned = if (desired) it.pinned + item.id else it.pinned - item.id) }
        viewModelScope.launch {
            runCatching { tasks.setPinned(groupId, item.id, desired) }.onFailure {
                _state.update { s -> s.copy(pinned = if (desired) s.pinned - item.id else s.pinned + item.id) }
            }
        }
    }

    fun delete(item: HwItem) {
        viewModelScope.launch {
            runCatching { tasks.delete(groupId, item.id) }
                .onSuccess {
                    _state.update { s ->
                        val list = (s.items as? Load.Ready)?.value ?: return@update s
                        s.copy(items = Load.Ready(list.filterNot { it.id == item.id }))
                    }
                }
                .onFailure { e -> _state.update { it.copy(message = errorMessage(e)) } }
        }
    }

    fun report(item: HwItem, reason: String) {
        viewModelScope.launch {
            val app = getApplication<Application>()
            runCatching { tasks.report(groupId, item, reason.takeIf { it.isNotBlank() }) }
                .onSuccess { _state.update { it.copy(message = app.getString(R.string.tasks_reported)) } }
                .onFailure { e -> _state.update { it.copy(message = errorMessage(e)) } }
        }
    }

    private fun replaceItem(item: HwItem) = _state.update { s ->
        val list = (s.items as? Load.Ready)?.value ?: return@update s
        s.copy(items = Load.Ready(list.map { if (it.id == item.id) item else it }))
    }

    fun uploadImages(item: HwItem, uris: List<Uri>) {
        if (uris.isEmpty()) return
        _state.update { it.copy(uploading = true) }
        viewModelScope.launch {
            val added = mutableListOf<ImageItem>()
            var failures = 0
            for (uri in uris.take(MAX_UPLOADS)) {
                runCatching { images.attach(groupId, item.id, images.upload(groupId, uri)) }
                    .onSuccess(added::add)
                    .onFailure { failures++ }
            }
            if (added.isNotEmpty()) replaceItem(item.copy(images = item.images + added))
            _state.update {
                it.copy(
                    uploading = false,
                    message = if (failures > 0) getApplication<Application>().getString(R.string.tasks_upload_failed) else null,
                )
            }
        }
    }

    fun removeImage(item: HwItem, image: ImageItem) {
        viewModelScope.launch {
            runCatching { images.remove(groupId, item.id, image.publicId) }
                .onSuccess { replaceItem(item.copy(images = item.images.filterNot { it.publicId == image.publicId })) }
                .onFailure { e -> _state.update { it.copy(message = errorMessage(e)) } }
        }
    }

    fun saveNote(item: HwItem, note: String) {
        viewModelScope.launch {
            runCatching { imageApi.setNote(groupId, item.id, NoteRequest(note.trim())).requireSuccess() }
                .onSuccess { replaceItem(item.copy(editorNote = note.trim())) }
                .onFailure { e -> _state.update { it.copy(message = errorMessage(e)) } }
        }
    }

    fun loadPrivate() {
        viewModelScope.launch {
            runCatching { privateTasks.all() }
                .onSuccess { list -> _state.update { it.copy(privateTasks = Load.Ready(list)) } }
                .onFailure { e -> _state.update { it.copy(privateTasks = Load.Failed(errorMessage(e))) } }
        }
    }

    fun addPrivate(title: String, description: String) {
        viewModelScope.launch {
            runCatching { privateTasks.create(title.trim(), description.trim()) }
                .onSuccess { created -> updatePrivate { it + created } }
                .onFailure { e -> _state.update { it.copy(message = errorMessage(e)) } }
        }
    }

    fun togglePrivate(task: PrivateTaskDto) {
        updatePrivate { list -> list.map { if (it.id == task.id) it.copy(completed = !it.completed) else it } }
        viewModelScope.launch {
            runCatching { privateTasks.toggle(task.id) }.onFailure {
                updatePrivate { list -> list.map { if (it.id == task.id) task else it } }
            }
        }
    }

    fun deletePrivate(task: PrivateTaskDto) {
        viewModelScope.launch {
            runCatching { privateTasks.delete(task.id) }
                .onSuccess { updatePrivate { list -> list.filterNot { it.id == task.id } } }
                .onFailure { e -> _state.update { it.copy(message = errorMessage(e)) } }
        }
    }

    private fun updatePrivate(transform: (List<PrivateTaskDto>) -> List<PrivateTaskDto>) {
        _state.update { s ->
            val list = (s.privateTasks as? Load.Ready)?.value ?: return@update s
            s.copy(privateTasks = Load.Ready(transform(list)))
        }
    }
}
