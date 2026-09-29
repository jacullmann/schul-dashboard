package app.schuldashboard.ui.groups

import android.app.Application
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import app.schuldashboard.R
import app.schuldashboard.data.SessionRepository
import app.schuldashboard.data.api.InviteInfo
import app.schuldashboard.data.api.SchulApi
import app.schuldashboard.data.api.apiErrorMessage
import app.schuldashboard.ui.common.Avatar
import app.schuldashboard.ui.common.Load
import app.schuldashboard.ui.design.Card
import app.schuldashboard.ui.design.FormActions
import app.schuldashboard.ui.design.FormError
import app.schuldashboard.ui.design.Spinner
import app.schuldashboard.ui.icons.Icon
import app.schuldashboard.ui.icons.Lucide
import app.schuldashboard.ui.theme.AppText
import app.schuldashboard.ui.theme.AppTheme
import app.schuldashboard.ui.theme.Radius
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

data class InviteState(val info: Load<InviteInfo> = Load.Loading, val busy: Boolean = false, val error: String? = null)

@HiltViewModel
class InviteViewModel @Inject constructor(
    application: Application,
    handle: SavedStateHandle,
    private val api: SchulApi,
    private val sessions: SessionRepository,
    private val json: Json,
) : AndroidViewModel(application) {
    private val token: String = checkNotNull(handle["token"])
    private val _state = MutableStateFlow(InviteState())
    val state: StateFlow<InviteState> = _state.asStateFlow()
    private val _joined = MutableSharedFlow<String>(extraBufferCapacity = 1)
    val joined = _joined.asSharedFlow()

    init {
        viewModelScope.launch {
            val fallback = application.getString(R.string.error_unknown)
            runCatching { api.invite(token) }
                .onSuccess { info -> _state.update { it.copy(info = Load.Ready(info)) } }
                .onFailure { e -> _state.update { it.copy(info = Load.Failed(e.apiErrorMessage(json, fallback))) } }
        }
    }

    fun accept() {
        _state.update { it.copy(busy = true, error = null) }
        viewModelScope.launch {
            try {
                _joined.tryEmit(sessions.acceptInvite(token))
            } catch (e: Exception) {
                val fallback = getApplication<Application>().getString(R.string.error_unknown)
                _state.update { it.copy(error = e.apiErrorMessage(json, fallback), busy = false) }
            }
        }
    }
}

/**
 * GroupInvite, a modal on the site: the group's avatar, name and member count, or the invalid
 * link notice, with join and cancel below.
 */
@Composable
fun InviteScreen(onOpenGroup: (String) -> Unit, onCancel: () -> Unit, viewModel: InviteViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val colors = AppTheme.colors
    LaunchedEffect(Unit) { viewModel.joined.collect(onOpenGroup) }

    Box(Modifier.fillMaxSize().background(colors.canvas).safeDrawingPadding().padding(16.dp), contentAlignment = Alignment.Center) {
        Card(Modifier.widthIn(max = 640.dp).fillMaxWidth().animateEnter(), radius = Radius.xl2, background = colors.canvas) {
            Text(stringResource(R.string.group_join_title), Modifier.padding(bottom = 16.dp), style = AppText.h3, color = colors.onGhost)
            when (val info = state.info) {
                Load.Loading -> Box(Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) { Spinner(24.dp) }
                is Load.Failed -> Column(
                    Modifier.fillMaxWidth().padding(vertical = 24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Icon(Lucide.AlertCircle, null, size = 64.dp, tint = colors.danger)
                    Text(info.message ?: stringResource(R.string.error_loading), style = AppText.base, color = colors.onGhostMuted, textAlign = TextAlign.Center)
                }
                is Load.Ready -> Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterHorizontally),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Avatar(info.value.groupName.orEmpty(), size = 64.dp)
                    Column {
                        Text(info.value.groupName.orEmpty(), style = AppText.lg, fontWeight = FontWeight.Bold, color = colors.onGhost)
                        info.value.memberCount?.let { Text(stringResource(R.string.invite_members, it), style = AppText.sm, color = colors.onGhostMuted) }
                    }
                }
            }
            FormError(state.error)
            Column(Modifier.padding(top = 16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                FormActions(
                    stringResource(R.string.group_join_submit), viewModel::accept, onCancel,
                    loading = state.busy, enabled = state.info is Load.Ready,
                )
            }
        }
    }
}
