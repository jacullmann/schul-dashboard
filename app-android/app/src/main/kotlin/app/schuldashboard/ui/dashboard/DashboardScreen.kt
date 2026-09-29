package app.schuldashboard.ui.dashboard

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import app.schuldashboard.data.ScheduleRepository
import app.schuldashboard.data.TasksRepository
import app.schuldashboard.data.ItemFilter
import app.schuldashboard.data.api.AnnouncementDto
import app.schuldashboard.data.api.HwItem
import app.schuldashboard.ui.common.Load
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class DashboardData(
    val announcements: List<AnnouncementDto>,
    val unreadAnnouncementIds: Set<String>,
    val items: List<HwItem>,
    val checked: Set<String>,
)

@HiltViewModel
class DashboardViewModel @Inject constructor(
    handle: SavedStateHandle,
    private val schedule: ScheduleRepository,
    private val tasks: TasksRepository,
) : ViewModel() {
    private val groupId: String = checkNotNull(handle["groupId"])

    private val _state = MutableStateFlow<Load<DashboardData>>(Load.Loading)
    val state: StateFlow<Load<DashboardData>> = _state.asStateFlow()

    init {
        load()
    }

    fun load() {
        _state.value = Load.Loading
        viewModelScope.launch {
            _state.value = runCatching {
                coroutineScope {
                    val announcements = async { schedule.announcements(groupId) }
                    val read = async { schedule.readAnnouncementIds(groupId) }
                    val items = async { tasks.items(groupId, ItemFilter(type = "all")).items }
                    val checked = async { runCatching { tasks.checkedIds() }.getOrDefault(emptySet()) }
                    val all = announcements.await()
                    val seen = read.await()
                    DashboardData(all, all.map { it.id }.filterNot { it in seen }.toSet(), items.await(), checked.await())
                }
            }.fold({ data ->
                // Opening the dashboard counts as reading its announcements.
                data.unreadAnnouncementIds.forEach { id -> launch { schedule.markAnnouncementRead(groupId, id) } }
                Load.Ready(data)
            }, { Load.Failed() })
        }
    }

    fun toggleChecked(item: HwItem) {
        val current = (_state.value as? Load.Ready)?.value ?: return
        val desired = item.id !in current.checked
        setChecked(item.id, desired)
        viewModelScope.launch {
            runCatching { tasks.setChecked(groupId, item.id, desired) }.onFailure { setChecked(item.id, !desired) }
        }
    }

    private fun setChecked(id: String, checked: Boolean) = _state.update { load ->
        val data = (load as? Load.Ready)?.value ?: return@update load
        Load.Ready(data.copy(checked = if (checked) data.checked + id else data.checked - id))
    }
}
