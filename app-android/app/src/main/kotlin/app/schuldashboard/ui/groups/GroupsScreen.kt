package app.schuldashboard.ui.groups

import android.app.Application
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import app.schuldashboard.R
import app.schuldashboard.data.AuthState
import app.schuldashboard.data.SessionRepository
import app.schuldashboard.data.api.apiErrorMessage
import app.schuldashboard.ui.account.AccountMenu
import app.schuldashboard.ui.common.Avatar
import app.schuldashboard.ui.design.AddButton
import app.schuldashboard.ui.design.AppButton
import app.schuldashboard.ui.design.ChoiceCard
import app.schuldashboard.ui.design.CountBadge
import app.schuldashboard.ui.design.EmptyState
import app.schuldashboard.ui.design.FormActions
import app.schuldashboard.ui.design.FormGroup
import app.schuldashboard.ui.design.IconButton
import app.schuldashboard.ui.design.Label
import app.schuldashboard.ui.design.ListRow
import app.schuldashboard.ui.design.LocalToaster
import app.schuldashboard.ui.design.Modal
import app.schuldashboard.ui.design.TextField
import app.schuldashboard.ui.design.Toggle
import app.schuldashboard.ui.icons.Lucide
import app.schuldashboard.ui.theme.AppText
import app.schuldashboard.ui.theme.AppTheme
import app.schuldashboard.ui.theme.DisplayFamily
import app.schuldashboard.ui.theme.animateEnter
import dagger.hilt.android.lifecycle.HiltViewModel
import java.time.LocalTime
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import javax.inject.Inject

data class GroupsUiState(val busy: Boolean = false, val error: String? = null)

@HiltViewModel
class GroupsViewModel @Inject constructor(
    application: Application,
    private val sessions: SessionRepository,
    private val json: Json,
) : AndroidViewModel(application) {
    val email = sessions.state.map { (it as? AuthState.LoggedIn)?.user?.email.orEmpty() }
    val isSuperadmin = sessions.state.map { (it as? AuthState.LoggedIn)?.user?.isSuperadmin == true }
    val groups = sessions.state.map { (it as? AuthState.LoggedIn)?.groups.orEmpty() }

    private val _ui = MutableStateFlow(GroupsUiState())
    val ui = _ui.asStateFlow()

    private val _opened = MutableSharedFlow<String>(extraBufferCapacity = 1)
    val opened = _opened.asSharedFlow()

    fun create(name: String, abitur: Boolean, dalton: Boolean) = launchBusy {
        _opened.tryEmit(sessions.createGroup(name.trim(), abitur, dalton))
    }

    fun join(token: String) = launchBusy { _opened.tryEmit(sessions.acceptInvite(token.trim())) }

    private fun launchBusy(block: suspend () -> Unit) {
        _ui.update { GroupsUiState(busy = true) }
        viewModelScope.launch {
            try {
                block()
                _ui.value = GroupsUiState()
            } catch (e: Exception) {
                val fallback = getApplication<Application>().getString(R.string.error_unknown)
                _ui.value = GroupsUiState(error = e.apiErrorMessage(json, fallback))
            }
        }
    }
}

@Composable
fun GroupsScreen(
    onOpenGroup: (String) -> Unit,
    onAccount: () -> Unit,
    onAdmin: () -> Unit,
    viewModel: GroupsViewModel = hiltViewModel(),
) {
    val groups by viewModel.groups.collectAsStateWithLifecycle(emptyList())
    val ui by viewModel.ui.collectAsStateWithLifecycle()
    val isSuperadmin by viewModel.isSuperadmin.collectAsStateWithLifecycle(false)
    var showCreate by rememberSaveable { mutableStateOf(false) }
    var showJoin by rememberSaveable { mutableStateOf(false) }
    val colors = AppTheme.colors
    val toaster = LocalToaster.current

    LaunchedEffect(Unit) { viewModel.opened.collect(onOpenGroup) }
    LaunchedEffect(ui.error) { ui.error?.let(toaster::error) }

    val greeting = when (LocalTime.now().hour) {
        in 0..5 -> R.string.groups_good_night
        in 6..11 -> R.string.groups_good_morning
        in 12..17 -> R.string.groups_good_day
        else -> R.string.groups_good_evening
    }

    Column(Modifier.fillMaxSize().background(colors.canvas).statusBarsPadding()) {
        LogoHeader(onAccount) {
            if (isSuperadmin) IconButton(Lucide.Shield, stringResource(R.string.admin_title), onAdmin)
        }
        LazyColumn(Modifier.weight(1f), contentPadding = PaddingValues(bottom = 24.dp)) {
            item(key = "greeting") {
                Row(
                    Modifier.fillMaxWidth().padding(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 16.dp),
                    verticalAlignment = Alignment.Top,
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    Column(Modifier.weight(1f)) {
                        Text(stringResource(greeting), Modifier.animateEnter(0), style = AppText.h2, color = colors.onGhost)
                        Text(
                            stringResource(if (groups.isEmpty()) R.string.groups_join_or_create else R.string.groups_choose),
                            Modifier.animateEnter(1),
                            style = AppText.base.copy(lineHeight = 26.sp),
                            color = colors.onGhostMuted,
                        )
                    }
                    if (groups.isNotEmpty()) {
                        Box(Modifier.animateEnter(1)) { AddButton(stringResource(R.string.group_create)) { showCreate = true } }
                    }
                }
            }
            if (groups.isEmpty()) {
                item(key = "empty") {
                    EmptyState(
                        stringResource(R.string.groups_no_groups),
                        Modifier.animateEnter(2),
                        message = stringResource(R.string.groups_join_text),
                        icon = Lucide.UsersRound,
                        primaryLabel = stringResource(R.string.group_create),
                        onPrimary = { showCreate = true },
                        secondaryLabel = stringResource(R.string.group_join_title),
                        onSecondary = { showJoin = true },
                    )
                }
            } else {
                item(key = "title") {
                    Row(
                        Modifier.padding(horizontal = 16.dp).padding(bottom = 16.dp).animateEnter(2),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        Text(stringResource(R.string.groups_title), style = AppText.xl2, fontWeight = FontWeight.Bold, fontFamily = DisplayFamily, color = colors.onGhost)
                        CountBadge(groups.size)
                    }
                }
                itemsIndexed(groups, key = { _, g -> g.id }) { index, group ->
                    ListRow(
                        { onOpenGroup(group.id) },
                        Modifier.animateEnter(3 + index),
                        icon = { Avatar(group.name, group.avatarUrl, 40.dp) },
                    ) {
                        Column {
                            Text(
                                group.name, style = AppText.base, fontWeight = FontWeight.SemiBold, color = colors.onGhost,
                                maxLines = 1, overflow = TextOverflow.Ellipsis,
                            )
                            Text(roleLabel(group.role), style = AppText.sm, color = colors.onGhostMuted)
                        }
                    }
                }
                item(key = "join") {
                    AppButton(
                        { showJoin = true },
                        Modifier.padding(horizontal = 12.dp, vertical = 8.dp).animateEnter(3 + groups.size),
                        icon = Lucide.UserRoundPlus,
                        text = stringResource(R.string.group_join_title),
                    )
                }
            }
        }
    }

    CreateGroupModal(showCreate, ui.busy, onDismiss = { showCreate = false }) { name, abitur, dalton ->
        viewModel.create(name, abitur, dalton)
        showCreate = false
    }
    JoinGroupModal(showJoin, ui.busy, onDismiss = { showJoin = false }) {
        viewModel.join(it)
        showJoin = false
    }
}

/** AppHeader outside a group: the "schul-dashboard" wordmark and the account avatar. */
@Composable
fun LogoHeader(onAccount: () -> Unit, actions: @Composable () -> Unit = {}) {
    Row(
        Modifier.fillMaxWidth().height(49.dp).padding(horizontal = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text(
            stringResource(R.string.app_name).lowercase(),
            Modifier.weight(1f),
            style = AppText.xl2,
            fontFamily = DisplayFamily,
            fontWeight = FontWeight.Bold,
            color = AppTheme.colors.onGhost,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        actions()
        AccountMenu(onAccountSettings = onAccount)
    }
}

@Composable
private fun roleLabel(role: String) = stringResource(
    when (role) {
        "owner" -> R.string.role_owner
        "admin" -> R.string.role_admin
        "moderator" -> R.string.role_moderator
        else -> R.string.role_user
    },
)

/** CreateGroupModal: name, group type as two choice cards, and the Dalton setting. */
@Composable
private fun CreateGroupModal(open: Boolean, busy: Boolean, onDismiss: () -> Unit, onCreate: (String, Boolean, Boolean) -> Unit) {
    var name by rememberSaveable(open) { mutableStateOf("") }
    var abitur by rememberSaveable(open) { mutableStateOf(false) }
    var dalton by rememberSaveable(open) { mutableStateOf(false) }
    Modal(
        open, onDismiss, stringResource(R.string.group_create),
        actions = {
            FormActions(
                stringResource(R.string.action_create), { onCreate(name, abitur, dalton) },
                loading = busy, enabled = name.isNotBlank(),
            )
        },
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
            FormGroup(label = stringResource(R.string.group_name)) {
                TextField(name, { name = it }, placeholder = stringResource(R.string.group_name))
            }
            Column {
                Label(stringResource(R.string.group_type_label))
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    ChoiceCard(
                        stringResource(R.string.group_type_regular), stringResource(R.string.group_type_regular_desc),
                        !abitur, { abitur = false },
                    )
                    ChoiceCard(
                        stringResource(R.string.group_type_abitur), stringResource(R.string.group_type_abitur_desc),
                        abitur, { abitur = true },
                    )
                }
            }
            Column {
                Label(stringResource(R.string.group_settings_label))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(stringResource(R.string.group_dalton_label), Modifier.weight(1f), style = AppText.sm, fontWeight = FontWeight.Medium, color = AppTheme.colors.onGhost)
                    Toggle(dalton, { dalton = it }, enabled = !busy)
                }
            }
        }
    }
}

@Composable
private fun JoinGroupModal(open: Boolean, busy: Boolean, onDismiss: () -> Unit, onJoin: (String) -> Unit) {
    var token by rememberSaveable(open) { mutableStateOf("") }
    Modal(
        open, onDismiss, stringResource(R.string.group_join_title),
        actions = {
            FormActions(stringResource(R.string.group_join_submit), { onJoin(token) }, onDismiss, loading = busy, enabled = token.isNotBlank())
        },
    ) {
        FormGroup(label = stringResource(R.string.group_join)) { TextField(token, { token = it }) }
    }
}
