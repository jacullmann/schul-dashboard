package app.schuldashboard.ui.groups

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.ime
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBars
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.TransformOrigin
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import app.schuldashboard.R
import app.schuldashboard.data.AuthState
import app.schuldashboard.data.SessionRepository
import app.schuldashboard.data.api.AdminApi
import app.schuldashboard.domain.Group
import app.schuldashboard.domain.Permission
import app.schuldashboard.domain.User
import app.schuldashboard.ui.account.AccountMenu
import app.schuldashboard.ui.chat.ChatScreen
import app.schuldashboard.ui.common.Avatar
import app.schuldashboard.ui.common.LoadingBox
import app.schuldashboard.ui.common.LocalBottomInset
import app.schuldashboard.ui.common.LocalTopInset
import app.schuldashboard.ui.dashboard.AnnouncementBar
import app.schuldashboard.ui.dashboard.DashboardScreen
import app.schuldashboard.ui.dashboard.DashboardViewModel
import app.schuldashboard.ui.common.Load
import app.schuldashboard.ui.design.BackdropBlurSupported
import app.schuldashboard.ui.design.ConfirmDialog
import app.schuldashboard.ui.design.Menu
import app.schuldashboard.ui.design.MenuButton
import app.schuldashboard.ui.design.MenuDivider
import app.schuldashboard.ui.design.TabBar
import app.schuldashboard.ui.design.TabItem
import app.schuldashboard.ui.design.pillButton
import app.schuldashboard.ui.design.scrollFade
import app.schuldashboard.ui.icons.Icon
import app.schuldashboard.ui.icons.Lucide
import app.schuldashboard.ui.schedule.ScheduleScreen
import app.schuldashboard.ui.tasks.PrivateTasksScreen
import app.schuldashboard.ui.tasks.TasksScreen
import app.schuldashboard.ui.theme.AppText
import app.schuldashboard.ui.theme.AppTheme
import app.schuldashboard.ui.theme.DisplayFamily
import app.schuldashboard.ui.theme.Motion
import dagger.hilt.android.lifecycle.HiltViewModel
import dev.chrisbanes.haze.hazeSource
import dev.chrisbanes.haze.rememberHazeState
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import javax.inject.Inject

/** The four tabs of the site's bar, plus Chat which the site only reaches from the menu. */
private enum class GroupPage { Dashboard, Tasks, Schedule, Private, Chat }

@HiltViewModel
class GroupHostViewModel @Inject constructor(
    handle: SavedStateHandle,
    private val sessions: SessionRepository,
    private val admin: AdminApi,
) : ViewModel() {
    private val groupId: String = checkNotNull(handle["groupId"])
    val group: Flow<Group?> = sessions.groupFlow(groupId)
    val user: Flow<User?> = sessions.state.map { (it as? AuthState.LoggedIn)?.user }
    private val setupPrompted = MutableStateFlow(false)
    private val _inviteToken = MutableStateFlow<String?>(null)
    val inviteToken = _inviteToken.asStateFlow()
    private val _left = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    val left = _left.asSharedFlow()

    /** True once per launch when the member has not chosen courses yet. */
    val promptForCourses: Flow<Boolean> = combine(sessions.state, setupPrompted) { auth, prompted ->
        val loggedIn = auth as? AuthState.LoggedIn
        loggedIn != null && !loggedIn.user.doneSetup && !prompted
    }

    init {
        sessions.recordVisit(groupId)
    }

    fun coursePromptHandled() {
        setupPrompted.value = true
    }

    fun createInvite() {
        viewModelScope.launch { runCatching { admin.createInvite(groupId).token }.onSuccess { _inviteToken.value = it } }
    }

    fun clearInvite() {
        _inviteToken.value = null
    }

    fun leave() {
        viewModelScope.launch {
            runCatching { sessions.leaveGroup(groupId) }.onSuccess { _left.tryEmit(Unit) }
        }
    }
}

@Composable
fun GroupHost(
    groupId: String,
    onSwitchGroup: () -> Unit,
    onAccount: () -> Unit,
    onSettings: () -> Unit,
    onMyCourses: () -> Unit,
    onCreateTask: () -> Unit,
    onEditTask: (String) -> Unit,
    viewModel: GroupHostViewModel = hiltViewModel(),
) {
    val group by viewModel.group.collectAsStateWithLifecycle(null)
    val promptCourses by viewModel.promptForCourses.collectAsStateWithLifecycle(false)
    val inviteToken by viewModel.inviteToken.collectAsStateWithLifecycle()
    var page by rememberSaveable { mutableStateOf(GroupPage.Dashboard) }
    var confirmLeave by remember { mutableStateOf(false) }
    var barHeight by remember { mutableStateOf(0.dp) }
    val density = LocalDensity.current
    // The dashboard's view model already loads the announcements the bar shows on every page.
    val dashboard: DashboardViewModel = hiltViewModel()
    val dashboardState by dashboard.state.collectAsStateWithLifecycle()
    val announcements = (dashboardState as? Load.Ready)?.value?.announcements.orEmpty()

    LaunchedEffect(promptCourses) {
        if (promptCourses) {
            viewModel.coursePromptHandled()
            onMyCourses()
        }
    }
    LaunchedEffect(Unit) { viewModel.left.collect { onSwitchGroup() } }
    BackHandler(enabled = page == GroupPage.Chat) { page = GroupPage.Dashboard }

    val current = group
    if (current == null) {
        LoadingBox()
        return
    }

    val tabs = listOf(
        TabItem(GroupPage.Dashboard, stringResource(R.string.nav_dashboard_tab), Lucide.House),
        TabItem(GroupPage.Tasks, stringResource(R.string.nav_tasks), Lucide.ListTodo),
        TabItem(GroupPage.Schedule, stringResource(R.string.nav_schedule), Lucide.CalendarDays),
        TabItem(GroupPage.Private, stringResource(R.string.nav_private), Lucide.Lock),
    )
    val keyboardOpen = WindowInsets.ime.getBottom(density) > 0
    val showBar = page != GroupPage.Chat && !keyboardOpen

    val colors = AppTheme.colors
    val pageBackdrop = rememberHazeState(blurEnabled = BackdropBlurSupported)
    var headerHeight by remember { mutableStateOf(0.dp) }
    val statusBar = with(density) { WindowInsets.statusBars.getTop(density).toDp() }

    Box(Modifier.fillMaxSize().background(colors.canvas)) {
        Box(Modifier.fillMaxSize().hazeSource(pageBackdrop).background(colors.canvas)) {
            val content = Modifier.fillMaxSize()
            CompositionLocalProvider(
                LocalTopInset provides headerHeight,
                LocalBottomInset provides (if (page == GroupPage.Chat) 0.dp else barHeight),
            ) {
                when (page) {
                    GroupPage.Dashboard -> DashboardScreen(
                        current,
                        content,
                        onOpenTasks = { page = GroupPage.Tasks },
                        onOpenSchedule = { page = GroupPage.Schedule },
                        onScheduleSetup = onSettings,
                    )
                    GroupPage.Tasks -> TasksScreen(current, onCreateTask, onEditTask, content)
                    GroupPage.Schedule -> ScheduleScreen(content)
                    GroupPage.Private -> PrivateTasksScreen(content)
                    GroupPage.Chat -> ChatScreen(current, content)
                }
            }
        }
        // The site's sticky AppHeader: the page scrolls up under it, here under the status bar
        // too, into a fade that stops 16dp below the header and never covers the announcements.
        Box(Modifier.fillMaxWidth().height(statusBar + HEADER_HEIGHT + 16.dp).scrollFade(pageBackdrop, colors.canvas))
        Column(Modifier.fillMaxWidth().onSizeChanged { headerHeight = with(density) { it.height.toDp() } }) {
            Spacer(Modifier.height(statusBar))
            GroupHeader(
                group = current,
                onChat = { page = GroupPage.Chat },
                onSwitchGroup = onSwitchGroup,
                onSettings = onSettings,
                onMyCourses = onMyCourses,
                onInvite = viewModel::createInvite,
                onLeave = { confirmLeave = true },
                onAccount = onAccount,
            )
            AnnouncementBar(announcements)
        }
        // Like a native tab bar it reaches into the gesture area, keeping only enough margin for
        // the home indicator, and slides off the bottom edge while it is not needed.
        val navInset = with(density) { WindowInsets.navigationBars.getBottom(density).toDp() }
        AnimatedVisibility(
            showBar,
            Modifier.align(Alignment.BottomCenter),
            enter = slideInVertically(Motion.settleSpring()) { it } +
                scaleIn(Motion.settleSpring(), 0.9f, TransformOrigin(0.5f, 1f)),
            exit = slideOutVertically(tween(250, easing = Motion.Exit)) { it } +
                scaleOut(tween(250, easing = Motion.Exit), 0.9f, TransformOrigin(0.5f, 1f)),
        ) {
            Box(
                Modifier.fillMaxWidth()
                    .onSizeChanged { barHeight = with(density) { it.height.toDp() } }
                    .padding(start = 24.dp, end = 24.dp, top = 8.dp, bottom = maxOf(8.dp, minOf(24.dp, navInset))),
                contentAlignment = Alignment.Center,
            ) {
                TabBar(tabs, page, { page = it }, backdrop = pageBackdrop)
            }
        }
    }

    val context = LocalContext.current
    ConfirmDialog(
        open = inviteToken != null,
        title = stringResource(R.string.settings_invite_create),
        text = stringResource(R.string.settings_invite_created, inviteToken.orEmpty()),
        onDismiss = viewModel::clearInvite,
        confirmText = stringResource(R.string.invite_copy),
        onConfirm = {
            (context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager)
                .setPrimaryClip(ClipData.newPlainText("invite", inviteToken))
            viewModel.clearInvite()
        },
    )
    ConfirmDialog(
        open = confirmLeave,
        title = stringResource(R.string.group_leave_title),
        text = stringResource(R.string.group_leave_confirm, current.name),
        onDismiss = { confirmLeave = false },
        confirmText = stringResource(R.string.group_leave_submit),
        danger = true,
        onConfirm = {
            confirmLeave = false
            viewModel.leave()
        },
    )
}

private val HEADER_HEIGHT = 49.dp

/**
 * AppHeader: the group avatar and name as a menu button and the account avatar on the right,
 * 49dp tall like the site's header.
 */
@Composable
private fun GroupHeader(
    group: Group,
    onChat: () -> Unit,
    onSwitchGroup: () -> Unit,
    onSettings: () -> Unit,
    onMyCourses: () -> Unit,
    onInvite: () -> Unit,
    onLeave: () -> Unit,
    onAccount: () -> Unit,
) {
    val colors = AppTheme.colors
    var groupMenu by remember { mutableStateOf(false) }
    val chevron by animateFloatAsState(if (groupMenu) 180f else 0f, tween(200, easing = Motion.EaseInOut), label = "chevron")
    Row(
        Modifier.fillMaxWidth().height(HEADER_HEIGHT).padding(horizontal = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Box(Modifier.weight(1f)) {
        Row(
            Modifier.pillButton { groupMenu = true }.padding(4.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Avatar(group.name, group.avatarUrl, 32.dp)
            Text(
                group.name,
                Modifier.weight(1f, fill = false),
                style = AppText.xl2,
                fontFamily = DisplayFamily,
                fontWeight = FontWeight.Bold,
                color = colors.onGhost,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Icon(Lucide.ChevronDown, null, Modifier.padding(end = 8.dp).rotate(chevron), size = 16.dp, tint = colors.onGhostMuted)
        }
        }
        AccountMenu(onAccountSettings = onAccount)
    }

    Menu(groupMenu, { groupMenu = false }, title = group.name) {
        MenuButton(stringResource(R.string.nav_chat), { groupMenu = false; onChat() }, icon = Lucide.MessageCircle)
        MenuButton(stringResource(R.string.courses_title), { groupMenu = false; onMyCourses() }, icon = Lucide.GraduationCap)
        MenuButton(stringResource(R.string.group_switch), { groupMenu = false; onSwitchGroup() }, icon = Lucide.ArrowLeftRight)
        MenuDivider()
        if (group.can(Permission.InviteMembers)) {
            MenuButton(stringResource(R.string.settings_invite_create), { groupMenu = false; onInvite() }, icon = Lucide.UserRoundPlus)
        }
        if (group.role != "user") {
            MenuButton(stringResource(R.string.group_settings), { groupMenu = false; onSettings() }, icon = Lucide.Settings)
        }
        MenuDivider()
        MenuButton(stringResource(R.string.group_leave), { groupMenu = false; onLeave() }, icon = Lucide.LogOut, danger = true)
    }
}
