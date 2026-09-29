package app.schuldashboard.ui.admin

import android.app.Application
import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
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
import app.schuldashboard.data.api.ProcessedRequest
import app.schuldashboard.data.api.SuperAdminApi
import app.schuldashboard.data.api.SuperAdminGroup
import app.schuldashboard.data.api.SuperAdminReport
import app.schuldashboard.data.api.SuperAdminStats
import app.schuldashboard.data.api.SuperAdminUser
import app.schuldashboard.data.api.UserActivity
import app.schuldashboard.data.api.apiErrorMessage
import app.schuldashboard.data.api.requireSuccess
import app.schuldashboard.ui.common.Avatar
import app.schuldashboard.ui.common.relativeTime
import app.schuldashboard.ui.design.AppButton
import app.schuldashboard.ui.design.ButtonVariant
import app.schuldashboard.ui.design.Card
import app.schuldashboard.ui.design.ConfirmDialog
import app.schuldashboard.ui.design.Divider
import app.schuldashboard.ui.design.IconButton
import app.schuldashboard.ui.design.LocalToaster
import app.schuldashboard.ui.design.Menu
import app.schuldashboard.ui.design.MenuButton
import app.schuldashboard.ui.design.MenuDivider
import app.schuldashboard.ui.design.SkeletonBlock
import app.schuldashboard.ui.design.SubPageHeader
import app.schuldashboard.ui.icons.Icon
import app.schuldashboard.ui.icons.Lucide
import app.schuldashboard.ui.theme.AppText
import app.schuldashboard.ui.theme.AppTheme
import app.schuldashboard.ui.theme.Motion
import app.schuldashboard.ui.theme.Radius
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import javax.inject.Inject

enum class AdminTab { Overview, Users, Reports, Groups }

data class AdminState(
    val stats: SuperAdminStats? = null,
    val users: List<SuperAdminUser> = emptyList(),
    val activity: Map<String, List<UserActivity>> = emptyMap(),
    val reports: List<SuperAdminReport> = emptyList(),
    val groups: List<SuperAdminGroup> = emptyList(),
    val message: String? = null,
    val error: String? = null,
)

@HiltViewModel
class SuperAdminViewModel @Inject constructor(
    application: Application,
    private val api: SuperAdminApi,
    private val json: Json,
) : AndroidViewModel(application) {
    private val _state = MutableStateFlow(AdminState())
    val state: StateFlow<AdminState> = _state.asStateFlow()

    private fun launchAdmin(block: suspend () -> (AdminState) -> AdminState) {
        viewModelScope.launch {
            try {
                _state.update(block())
            } catch (e: Exception) {
                val fallback = getApplication<Application>().getString(R.string.error_unknown)
                _state.update { it.copy(error = e.apiErrorMessage(json, fallback)) }
            }
        }
    }

    fun load(tab: AdminTab) = when (tab) {
        AdminTab.Overview -> launchAdmin { val v = api.stats(); { s -> s.copy(stats = v, error = null) } }
        AdminTab.Users -> launchAdmin { val v = api.users(); { s -> s.copy(users = v, error = null) } }
        AdminTab.Reports -> launchAdmin { val v = api.reports(); { s -> s.copy(reports = v, error = null) } }
        AdminTab.Groups -> launchAdmin { val v = api.groups(); { s -> s.copy(groups = v, error = null) } }
    }

    fun cleanup() = launchAdmin { val m = api.cleanupOldItems().message; load(AdminTab.Overview); { s -> s.copy(message = m) } }

    fun toggleBan(user: SuperAdminUser) = launchAdmin {
        (if (user.isBanned) api.unban(user.id) else api.ban(user.id)).requireSuccess()
        load(AdminTab.Users); { s -> s }
    }

    fun deleteUser(user: SuperAdminUser) = launchAdmin { api.deleteUser(user.id).requireSuccess(); load(AdminTab.Users); { s -> s } }

    fun loadActivity(user: SuperAdminUser) = launchAdmin { val v = api.activity(user.id); { s -> s.copy(activity = s.activity + (user.id to v)) } }

    fun pruneActivity(user: SuperAdminUser) = launchAdmin {
        api.pruneActivity(user.id).requireSuccess()
        val v = api.activity(user.id)
        ({ s -> s.copy(activity = s.activity + (user.id to v)) })
    }

    fun toggleReport(report: SuperAdminReport) = launchAdmin {
        api.processReport(report.id, ProcessedRequest(!report.processed)).requireSuccess()
        load(AdminTab.Reports); { s -> s }
    }

    fun deleteReport(report: SuperAdminReport) = launchAdmin { api.deleteReport(report.id).requireSuccess(); load(AdminTab.Reports); { s -> s } }

    fun deleteGroup(group: SuperAdminGroup) = launchAdmin { api.deleteGroup(group.id).requireSuccess(); load(AdminTab.Groups); { s -> s } }
}

private fun AdminTab.icon() = when (this) {
    AdminTab.Overview -> Lucide.LayoutDashboard
    AdminTab.Users -> Lucide.Users
    AdminTab.Reports -> Lucide.Flag
    AdminTab.Groups -> Lucide.LayoutGrid
}

/**
 * AdminLayout on a phone: the title bar, the sections as a scrolling row of sidebar buttons,
 * and the section's content below.
 */
@Composable
fun SuperAdminScreen(onBack: () -> Unit, viewModel: SuperAdminViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var tab by rememberSaveable { mutableStateOf(AdminTab.Overview) }
    val toaster = LocalToaster.current
    LaunchedEffect(tab) { viewModel.load(tab) }
    LaunchedEffect(state.message, state.error) {
        state.message?.let(toaster::success)
        state.error?.let(toaster::error)
    }

    Column(Modifier.fillMaxSize().background(AppTheme.colors.canvas).statusBarsPadding()) {
        SubPageHeader(stringResource(R.string.admin_title), onBack, large = false)
        Row(
            Modifier.fillMaxWidth().background(AppTheme.colors.surface).horizontalScroll(rememberScrollState()).padding(8.dp),
            horizontalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            AdminTab.entries.forEach { entry ->
                SidebarButton(entry.name, entry.icon(), entry == tab) { tab = entry }
            }
        }
        Divider()
        Box(Modifier.weight(1f)) {
            when (tab) {
                AdminTab.Overview -> OverviewPane(state.stats, viewModel)
                AdminTab.Users -> UsersPane(state, viewModel)
                AdminTab.Reports -> ReportsPane(state.reports, viewModel)
                AdminTab.Groups -> GroupsPane(state.groups, viewModel)
            }
        }
    }
}

/** SidebarButton: a pill with an icon and label, full colour while active. */
@Composable
private fun SidebarButton(label: String, icon: app.schuldashboard.ui.icons.LucideIcon, active: Boolean, onClick: () -> Unit) {
    val colors = AppTheme.colors
    val background by animateColorAsState(if (active) colors.ghostHover else Color.Transparent, Motion.hover(), label = "bg")
    Row(
        Modifier.clip(CircleShape).background(background).clickable(onClick = onClick).padding(horizontal = 12.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        val content = if (active) colors.onGhost else colors.onGhostMuted
        Icon(icon, null, size = 20.dp, tint = content)
        Text(label, style = AppText.sm, fontWeight = FontWeight.Medium, color = content)
    }
}

private val PanePadding = PaddingValues(start = 16.dp, end = 16.dp, top = 20.dp, bottom = 48.dp)

@Composable
private fun StatTile(value: String, label: String, modifier: Modifier) {
    Card(modifier, radius = Radius.xl, padding = PaddingValues(18.dp), shadow = true) {
        Text(value, style = AppText.xl2.copy(lineHeight = 16.sp), fontWeight = FontWeight.Bold, color = AppTheme.colors.onGhost)
        Text(label, Modifier.padding(top = 4.dp), style = AppText.sm, color = AppTheme.colors.onGhostMuted)
    }
}

@Composable
private fun OverviewPane(stats: SuperAdminStats?, vm: SuperAdminViewModel) {
    var confirm by remember { mutableStateOf(false) }
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(PanePadding), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        if (stats == null) {
            SkeletonBlock(240.dp)
            return@Column
        }
        listOf(
            stats.userCount.toString() to "Users",
            "${stats.verifiedUsers} / ${stats.unverifiedUsers}" to "Verified / unverified",
            stats.bannedCount.toString() to "Banned",
            stats.adminCount.toString() to "Admins",
            stats.itemCount.toString() to "Tasks",
            stats.oldItemsCount.toString() to "Old tasks",
            "${stats.reportCount} / ${stats.reportCountTotal}" to "Reports (open / total)",
            stats.newUsersThisWeek.toString() to "New users this week",
            stats.newItemsThisWeek.toString() to "New tasks this week",
        ).chunked(2).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                row.forEach { (value, label) -> StatTile(value, label, Modifier.weight(1f)) }
                if (row.size == 1) Box(Modifier.weight(1f))
            }
        }
        AppButton(
            { confirm = true }, Modifier.padding(top = 8.dp), variant = ButtonVariant.Danger,
            enabled = stats.oldItemsCount > 0, text = stringResource(R.string.settings_cleanup),
        )
    }
    ConfirmDialog(
        confirm, stringResource(R.string.settings_cleanup), stringResource(R.string.settings_cleanup_confirm),
        { confirm = false }, { vm.cleanup(); confirm = false }, danger = true,
    )
}

@Composable
private fun UsersPane(state: AdminState, vm: SuperAdminViewModel) {
    var deleting by remember { mutableStateOf<SuperAdminUser?>(null) }
    var menuFor by remember { mutableStateOf<SuperAdminUser?>(null) }
    val colors = AppTheme.colors
    LazyColumn(contentPadding = PanePadding, verticalArrangement = Arrangement.spacedBy(12.dp)) {
        items(state.users, key = SuperAdminUser::id) { user ->
            Card(Modifier.fillMaxWidth().animateItem(), radius = Radius.xl, padding = PaddingValues(start = 12.dp, end = 4.dp, top = 12.dp, bottom = 12.dp), shadow = true) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Avatar(user.email, size = 40.dp)
                    Column(Modifier.weight(1f)) {
                        Text(user.username.ifEmpty { user.email }, style = AppText.base, fontWeight = FontWeight.SemiBold, color = colors.onGhost, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text(
                            listOfNotNull(user.email, user.role, "banned".takeIf { user.isBanned }, "unverified".takeIf { !user.emailVerified })
                                .joinToString(" • "),
                            style = AppText.sm, color = if (user.isBanned) colors.danger else colors.onGhostMuted, maxLines = 2,
                        )
                        user.lastLogin?.let { Text(relativeTime(it), style = AppText.xs, color = colors.onGhostSubtle) }
                    }
                    if (user.role != "superadmin") IconButton(Lucide.Ellipsis, stringResource(R.string.a11y_more), { menuFor = user })
                }
                state.activity[user.id]?.let { entries ->
                    Column(Modifier.padding(top = 8.dp, end = 8.dp)) {
                        entries.take(20).forEach {
                            Text("${relativeTime(it.at)} • ${it.type}", style = AppText.xs, color = colors.onGhostMuted)
                        }
                        if (entries.isNotEmpty()) AppButton({ vm.pruneActivity(user) }, text = "Prune")
                    }
                }
            }
        }
    }
    val target = menuFor
    Menu(target != null, { menuFor = null }, title = target?.email) {
        if (target != null) {
            MenuButton("Activity", { menuFor = null; vm.loadActivity(target) }, icon = Lucide.Clock)
            MenuButton(if (target.isBanned) "Unban" else "Ban", { menuFor = null; vm.toggleBan(target) }, icon = Lucide.Ban)
            MenuDivider()
            MenuButton(stringResource(R.string.action_delete), { menuFor = null; deleting = target }, icon = Lucide.Trash2, danger = true)
        }
    }
    ConfirmDialog(
        deleting != null, stringResource(R.string.action_delete), deleting?.email.orEmpty(),
        { deleting = null }, { deleting?.let(vm::deleteUser); deleting = null }, danger = true,
    )
}

@Composable
private fun ReportsPane(reports: List<SuperAdminReport>, vm: SuperAdminViewModel) {
    val colors = AppTheme.colors
    LazyColumn(contentPadding = PanePadding, verticalArrangement = Arrangement.spacedBy(12.dp)) {
        items(reports, key = SuperAdminReport::id) { report ->
            Card(Modifier.fillMaxWidth().animateItem(), radius = Radius.xl, shadow = true, borderColor = if (report.processed) colors.ghostBorder else colors.warn.copy(alpha = 0.4f)) {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text((report.itemTitle ?: report.messageContent).orEmpty(), style = AppText.h4, color = colors.onGhost)
                    report.itemDescription?.let { Text(it, style = AppText.sm, color = colors.onGhostMuted) }
                    report.reason?.let { Text(it, style = AppText.base, color = colors.onGhost) }
                    Text(
                        listOfNotNull(report.reporterEmail, relativeTime(report.reportedAt), if (report.processed) "resolved" else null).joinToString(" • "),
                        style = AppText.xs, color = colors.onGhostSubtle,
                    )
                    Row(Modifier.padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        AppButton({ vm.toggleReport(report) }, variant = if (report.processed) ButtonVariant.Ghost else ButtonVariant.Action, text = if (report.processed) "Reopen" else "Resolve")
                        AppButton({ vm.deleteReport(report) }, contentColor = colors.danger, icon = Lucide.Trash2, text = stringResource(R.string.action_delete))
                    }
                }
            }
        }
    }
}

@Composable
private fun GroupsPane(groups: List<SuperAdminGroup>, vm: SuperAdminViewModel) {
    var deleting by remember { mutableStateOf<SuperAdminGroup?>(null) }
    val colors = AppTheme.colors
    LazyColumn(contentPadding = PanePadding, verticalArrangement = Arrangement.spacedBy(12.dp)) {
        items(groups, key = SuperAdminGroup::id) { group ->
            Card(Modifier.fillMaxWidth().animateItem(), radius = Radius.xl, padding = PaddingValues(start = 12.dp, end = 4.dp, top = 12.dp, bottom = 12.dp), shadow = true) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Avatar(group.name, size = 40.dp)
                    Column(Modifier.weight(1f)) {
                        Text(group.name, style = AppText.base, fontWeight = FontWeight.SemiBold, color = colors.onGhost, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text("${group.ownerName} • ${group.memberCount} members • ${group.itemCount} tasks", style = AppText.sm, color = colors.onGhostMuted)
                    }
                    IconButton(Lucide.Trash2, stringResource(R.string.action_delete), { deleting = group }, contentColor = colors.danger)
                }
            }
        }
    }
    ConfirmDialog(
        deleting != null, stringResource(R.string.settings_delete_group), deleting?.name.orEmpty(),
        { deleting = null }, { deleting?.let(vm::deleteGroup); deleting = null }, danger = true,
    )
}
