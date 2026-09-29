package app.schuldashboard.ui.tasks

import android.app.Application
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import app.schuldashboard.R
import app.schuldashboard.data.Cloudinary
import app.schuldashboard.data.ImageRepository
import app.schuldashboard.data.ScheduleRepository
import app.schuldashboard.data.TasksRepository
import app.schuldashboard.data.api.CreateItemRequest
import app.schuldashboard.data.api.ImageItem
import app.schuldashboard.data.api.UpdateItemRequest
import app.schuldashboard.data.api.apiErrorMessage
import app.schuldashboard.ui.common.LoadingBox
import app.schuldashboard.ui.common.subjectLabel
import app.schuldashboard.ui.common.toDueIso
import app.schuldashboard.ui.design.AppButton
import app.schuldashboard.ui.design.ButtonSize
import app.schuldashboard.ui.design.ButtonVariant
import app.schuldashboard.ui.design.DateField
import app.schuldashboard.ui.design.FormError
import app.schuldashboard.ui.design.FormGroup
import app.schuldashboard.ui.design.IconButton
import app.schuldashboard.ui.design.SegmentedControl
import app.schuldashboard.ui.design.TabItem
import app.schuldashboard.ui.design.TextField
import app.schuldashboard.ui.design.Dropdown
import app.schuldashboard.ui.icons.Lucide
import app.schuldashboard.ui.theme.AppText
import app.schuldashboard.ui.theme.AppTheme
import app.schuldashboard.ui.theme.Radius
import coil.compose.AsyncImage
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import javax.inject.Inject

private const val MAX_IMAGES = 10
private const val MAX_TITLE_LENGTH = 60
private const val MAX_DESCRIPTION_LENGTH = 1000
private val TASK_TYPES = listOf("homework", "dalton", "exam")

data class TaskFormState(
    val loading: Boolean = true,
    val editing: Boolean = false,
    val type: String = "homework",
    val title: String = "",
    val subject: String = "",
    val description: String = "",
    val dueDate: LocalDate? = null,
    /** Images of an edited task are kept as they are; uploading is not part of this screen yet. */
    val images: List<ImageItem> = emptyList(),
    val subjects: List<String> = emptyList(),
    val titleError: Int? = null,
    val subjectError: Int? = null,
    val dateError: Int? = null,
    val descriptionError: Int? = null,
    val uploading: Boolean = false,
    val submitting: Boolean = false,
    val serverError: String? = null,
    val done: Boolean = false,
)

@HiltViewModel
class TaskFormViewModel @Inject constructor(
    application: Application,
    handle: SavedStateHandle,
    private val tasks: TasksRepository,
    private val schedule: ScheduleRepository,
    private val imageRepository: ImageRepository,
    private val json: Json,
) : AndroidViewModel(application) {
    private val groupId: String = checkNotNull(handle["groupId"])
    private val itemId: String? = handle["itemId"]

    private val _state = MutableStateFlow(TaskFormState(editing = itemId != null))
    val state: StateFlow<TaskFormState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            val subjects = runCatching { schedule.subjects(groupId) }.getOrDefault(emptyList())
            _state.update { it.copy(subjects = subjects.map { s -> s.name }) }
            if (itemId != null) {
                runCatching { tasks.item(groupId, itemId) }.onSuccess { item ->
                    _state.update {
                        it.copy(
                            type = item.type,
                            title = item.title,
                            subject = item.subject,
                            description = item.description,
                            dueDate = runCatching {
                                Instant.parse(item.dueDate).atZone(ZoneId.systemDefault()).toLocalDate()
                            }.getOrNull(),
                            images = item.images,
                        )
                    }
                }
            }
            _state.update { it.copy(loading = false) }
        }
    }

    fun onType(value: String) = _state.update { it.copy(type = value) }
    fun onTitle(value: String) = _state.update { it.copy(title = value, titleError = null) }
    fun onSubject(value: String) = _state.update { it.copy(subject = value, subjectError = null) }
    fun onDescription(value: String) = _state.update { it.copy(description = value, descriptionError = null) }
    fun onDate(value: LocalDate) = _state.update { it.copy(dueDate = value, dateError = null) }

    fun addImages(uris: List<Uri>) {
        if (uris.isEmpty()) return
        _state.update { it.copy(uploading = true, serverError = null) }
        viewModelScope.launch {
            val uploaded = mutableListOf<ImageItem>()
            var failed = false
            for (uri in uris.take(MAX_IMAGES)) {
                runCatching { imageRepository.upload(groupId, uri) }.onSuccess(uploaded::add).onFailure { failed = true }
            }
            _state.update {
                it.copy(
                    images = it.images + uploaded,
                    uploading = false,
                    serverError = if (failed) getApplication<Application>().getString(R.string.tasks_upload_failed) else null,
                )
            }
        }
    }

    fun removeImage(image: ImageItem) = _state.update { s -> s.copy(images = s.images.filterNot { it.publicId == image.publicId }) }

    fun submit() {
        val form = _state.value
        val title = form.title.trim()
        val description = form.description.trim()
        val checked = form.copy(
            titleError = when {
                title.isEmpty() -> R.string.error_title_missing
                title.length > MAX_TITLE_LENGTH -> R.string.error_title_long
                else -> null
            },
            subjectError = if (form.subject.isEmpty()) R.string.error_subject_missing else null,
            dateError = if (form.dueDate == null) R.string.error_date_missing else null,
            descriptionError = if (description.length > MAX_DESCRIPTION_LENGTH) R.string.error_description_long else null,
        )
        _state.value = checked
        val dueDate = checked.dueDate
        if (dueDate == null || listOf(checked.titleError, checked.subjectError, checked.descriptionError).any { it != null }) return

        _state.update { it.copy(submitting = true, serverError = null) }
        viewModelScope.launch {
            try {
                if (itemId != null) {
                    tasks.update(
                        groupId, itemId,
                        UpdateItemRequest(title, form.subject, description, form.images, dueDate.toDueIso()),
                    )
                } else {
                    tasks.create(
                        groupId,
                        CreateItemRequest(title, form.subject, description, form.images, dueDate.toDueIso(), form.type),
                    )
                }
                _state.update { it.copy(done = true) }
            } catch (e: Exception) {
                val fallback = getApplication<Application>().getString(R.string.error_unknown)
                _state.update { it.copy(serverError = e.apiErrorMessage(json, fallback)) }
            } finally {
                _state.update { it.copy(submitting = false) }
            }
        }
    }
}

/**
 * TaskForm, which the site opens as a modal: an h3 title with a close button, the form groups
 * 16dp apart and the stacked submit button, here as a full page.
 */
@Composable
fun TaskFormScreen(onDone: () -> Unit, viewModel: TaskFormViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val colors = AppTheme.colors
    LaunchedEffect(state.done) { if (state.done) onDone() }

    Column(Modifier.fillMaxSize().background(colors.canvas).statusBarsPadding().imePadding()) {
        Row(
            Modifier.fillMaxWidth().padding(start = 16.dp, end = 4.dp, top = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                stringResource(if (state.editing) R.string.task_form_edit else R.string.task_form_new),
                Modifier.weight(1f),
                style = AppText.h3,
                color = colors.onGhost,
            )
            IconButton(Lucide.X, stringResource(R.string.a11y_close), onDone)
        }
        if (state.loading) {
            LoadingBox()
            return@Column
        }
        Column(
            Modifier.fillMaxSize().verticalScroll(rememberScrollState()).navigationBarsPadding().padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            if (!state.editing) {
                SegmentedControl(
                    TASK_TYPES.map { TabItem(it, stringResource(typeLabel(it))) },
                    state.type,
                    viewModel::onType,
                    stretch = true,
                )
            }
            FormGroup(label = stringResource(R.string.tasks_field_title), required = true, error = state.titleError?.let { stringResource(it) }) {
                TextField(state.title, viewModel::onTitle)
            }
            FormGroup(label = stringResource(R.string.tasks_field_subject), required = true, error = state.subjectError?.let { stringResource(it) }) {
                Dropdown(
                    stringResource(R.string.tasks_field_subject),
                    state.subjects.map { it to subjectLabel(it) },
                    state.subject.ifEmpty { null },
                    viewModel::onSubject,
                )
            }
            FormGroup(label = stringResource(R.string.task_form_due), required = true, error = state.dateError?.let { stringResource(it) }) {
                DateField(state.dueDate, viewModel::onDate)
            }
            FormGroup(label = stringResource(R.string.tasks_field_description), error = state.descriptionError?.let { stringResource(it) }) {
                TextField(state.description, viewModel::onDescription, singleLine = false, minLines = 4, maxLines = 8)
            }
            ImagesSection(state, viewModel)
            FormError(state.serverError)
            Column(Modifier.padding(top = 0.dp)) {
                AppButton(
                    viewModel::submit,
                    variant = ButtonVariant.Action,
                    full = true,
                    loading = state.submitting,
                    enabled = !state.uploading,
                    text = stringResource(if (state.editing) R.string.action_save else R.string.action_create),
                )
            }
        }
    }
}

private fun typeLabel(type: String) = when (type) {
    "dalton" -> R.string.tasks_tab_dalton
    "exam" -> R.string.tasks_type_exam
    else -> R.string.tasks_type_homework
}

/** The form's images: 128dp rounded thumbnails with a small danger remove button, then upload. */
@Composable
private fun ImagesSection(state: TaskFormState, viewModel: TaskFormViewModel) {
    val picker = rememberLauncherForActivityResult(ActivityResultContracts.OpenMultipleDocuments()) { viewModel.addImages(it) }
    FormGroup(label = stringResource(R.string.task_form_images)) {
        Row(
            Modifier.horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            state.images.forEach { image ->
                Box(Modifier.size(128.dp).clip(RoundedCornerShape(Radius.xl)).background(Color.Black.copy(alpha = 0.5f))) {
                    AsyncImage(Cloudinary.thumb(image), image.metadata?.name, Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                    IconButton(
                        Lucide.X, stringResource(R.string.action_delete), { viewModel.removeImage(image) },
                        Modifier.align(Alignment.TopEnd).padding(4.dp), size = ButtonSize.Xs, variant = ButtonVariant.Danger,
                    )
                }
            }
            AppButton(
                { picker.launch(arrayOf("image/*", "application/pdf")) },
                icon = Lucide.Upload,
                loading = state.uploading,
                contentDescription = stringResource(R.string.tasks_upload_images),
            )
        }
    }
}
