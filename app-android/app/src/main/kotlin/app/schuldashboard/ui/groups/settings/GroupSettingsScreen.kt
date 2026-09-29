package app.schuldashboard.ui.groups.settings

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
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
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.schuldashboard.R
import app.schuldashboard.data.api.MemberDto
import app.schuldashboard.data.api.SubjectRequest
import app.schuldashboard.domain.GroupType
import app.schuldashboard.domain.Permission
import app.schuldashboard.ui.common.Avatar
import app.schuldashboard.ui.common.relativeTime
import app.schuldashboard.ui.common.subjectLabel
import app.schuldashboard.ui.design.AppButton
import app.schuldashboard.ui.design.ButtonSize
import app.schuldashboard.ui.design.ButtonVariant
import app.schuldashboard.ui.design.Card
import app.schuldashboard.ui.design.ChoiceCard
import app.schuldashboard.ui.design.Divider
import app.schuldashboard.ui.design.Dropdown
import app.schuldashboard.ui.design.FormActions
import app.schuldashboard.ui.design.FormGroup
import app.schuldashboard.ui.design.IconButton
import app.schuldashboard.ui.design.Label
import app.schuldashboard.ui.design.LocalToaster
import app.schuldashboard.ui.design.Menu
import app.schuldashboard.ui.design.MenuButton
import app.schuldashboard.ui.design.MenuDivider
import app.schuldashboard.ui.design.MenuSelect
import app.schuldashboard.ui.design.NavRow
import app.schuldashboard.ui.design.SkeletonBlock
import app.schuldashboard.ui.design.SubPageHeader
import app.schuldashboard.ui.design.TextField
import app.schuldashboard.ui.design.Toggle
import app.schuldashboard.ui.design.ToggleCard
import app.schuldashboard.ui.icons.Lucide
import app.schuldashboard.ui.theme.AppText
import app.schuldashboard.ui.theme.AppTheme
import app.schuldashboard.ui.theme.Motion
import app.schuldashboard.ui.theme.Radius

private fun SettingsTab.label() = when (this) {
    SettingsTab.Overview -> R.string.settings_tab_overview
    SettingsTab.General -> R.string.settings_tab_general
    SettingsTab.Members -> R.string.settings_tab_members
    SettingsTab.Subjects -> R.string.settings_tab_subjects
    SettingsTab.Schedule -> R.string.settings_tab_schedule
    SettingsTab.Announcements -> R.string.settings_tab_announcements
}

private fun SettingsTab.description() = when (this) {
    SettingsTab.Overview -> R.string.settings_desc_overview
    SettingsTab.General -> R.string.settings_desc_general
    SettingsTab.Members -> R.string.settings_desc_members
    SettingsTab.Subjects -> R.string.settings_desc_subjects
    SettingsTab.Schedule -> R.string.settings_desc_schedule
    SettingsTab.Announcements -> R.string.settings_desc_announcements
}

private fun SettingsTab.icon() = when (this) {
    SettingsTab.Overview -> Lucide.LayoutDashboard
    SettingsTab.General -> Lucide.SlidersHorizontal
    SettingsTab.Members -> Lucide.UsersRound
    SettingsTab.Subjects -> Lucide.BookOpen
    SettingsTab.Schedule -> Lucide.CalendarDays
    SettingsTab.Announcements -> Lucide.Megaphone
}

@Composable
fun roleLabel(role: String) = stringResource(
    when (role) {
        "owner" -> R.string.role_owner
        "admin" -> R.string.role_admin
        "moderator" -> R.string.role_moderator
        else -> R.string.role_user
    },
)

/**
 * GroupSettings as a phone shows it: the list of sections under the page title, each opening
 * as a pane that slides in from the right, like account settings.
 */
@Composable
fun GroupSettingsScreen(
    onBack: () -> Unit,
    onGroupGone: () -> Unit,
    viewModel: GroupSettingsViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var tab by rememberSaveable { mutableStateOf<SettingsTab?>(null) }
    val toaster = LocalToaster.current

    LaunchedEffect(tab) { tab?.let(viewModel::load) }
    LaunchedEffect(Unit) { viewModel.groupGone.collect { onGroupGone() } }
    LaunchedEffect(state.message, state.error) {
        state.message?.let(toaster::success)
        state.error?.let(toaster::error)
        if (state.message != null || state.error != null) viewModel.clearFeedback()
    }
    BackHandler(enabled = tab != null) { tab = null }

    Box(Modifier.fillMaxSize().background(AppTheme.colors.canvas).statusBarsPadding()) {
        AnimatedContent(
            tab,
            transitionSpec = {
                val spec = tween<IntOffset>(450, easing = Motion.Settle)
                val fade = tween<Float>(450, easing = Motion.Ease)
                if (targetState != null) {
                    slideInHorizontally(spec) { it } togetherWith
                        (slideOutHorizontally(spec) { -it * 15 / 100 } + fadeOut(fade, targetAlpha = 0.6f))
                } else {
                    (slideInHorizontally(spec) { -it * 15 / 100 } + fadeIn(fade, initialAlpha = 0.6f)) togetherWith
                        slideOutHorizontally(spec) { it }
                }
            },
            label = "settings",
        ) { shown ->
            if (shown == null) {
                Column(Modifier.fillMaxSize().background(AppTheme.colors.canvas).verticalScroll(rememberScrollState())) {
                    SubPageHeader(stringResource(R.string.settings_management), onBack, subtitle = viewModel.group?.name)
                    SettingsTab.entries.forEach { entry ->
                        NavRow(stringResource(entry.label()), stringResource(entry.description()), entry.icon(), { tab = entry })
                    }
                }
            } else {
                Column(Modifier.fillMaxSize().background(AppTheme.colors.canvas)) {
                    SubPageHeader(stringResource(shown.label()), { tab = null }, large = false)
                    Column(
                        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).navigationBarsPadding()
                            .padding(start = 24.dp, end = 24.dp, top = 16.dp, bottom = 48.dp),
                        verticalArrangement = Arrangement.spacedBy(32.dp),
                    ) {
                        when (shown) {
                            SettingsTab.Overview -> OverviewTab(state, viewModel)
                            SettingsTab.General -> GeneralTab(state, viewModel)
                            SettingsTab.Members -> MembersTab(state, viewModel)
                            SettingsTab.Subjects -> SubjectsTab(state, viewModel)
                            SettingsTab.Schedule -> ScheduleTab(state, viewModel)
                            SettingsTab.Announcements -> AnnouncementsTab(state, viewModel)
                        }
                    }
                }
            }
        }
    }
}

/** A statistic card: a large bold number over its muted label. */
@Composable
private fun StatCard(value: Int, label: String, modifier: Modifier, warn: Boolean = false) {
    Card(
        modifier, radius = Radius.xl, padding = PaddingValues(18.dp), shadow = true,
        borderColor = if (warn) AppTheme.colors.warn.copy(alpha = 0.3f) else AppTheme.colors.ghostBorder,
    ) {
        Text(value.toString(), style = AppText.xl2.copy(lineHeight = 16.sp), fontWeight = FontWeight.Bold, color = AppTheme.colors.onGhost)
        Text(label, Modifier.padding(top = 4.dp), style = AppText.sm, color = AppTheme.colors.onGhostMuted)
    }
}

@Composable
private fun OverviewTab(state: SettingsState, vm: GroupSettingsViewModel) {
    var confirmCleanup by remember { mutableStateOf(false) }
    var confirmDelete by remember { mutableStateOf(false) }
    val colors = AppTheme.colors
    state.stats?.let { stats ->
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                StatCard(stats.itemCount, stringResource(R.string.settings_stat_items), Modifier.weight(1f))
                StatCard(stats.memberCount, stringResource(R.string.settings_stat_members), Modifier.weight(1f))
            }
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                StatCard(stats.subsCount, stringResource(R.string.settings_stat_subs), Modifier.weight(1f))
                StatCard(stats.oldItemsCount, stringResource(R.string.settings_stat_old), Modifier.weight(1f), warn = stats.oldItemsCount > 0)
            }
        }
        if (stats.oldItemsCount > 0) {
            Card(Modifier.fillMaxWidth(), radius = Radius.xl2) {
                Text(stringResource(R.string.settings_cleanup_confirm), style = AppText.base, color = colors.onGhostMuted)
                Box(Modifier.fillMaxWidth().padding(top = 16.dp), contentAlignment = Alignment.CenterEnd) {
                    AppButton({ confirmCleanup = true }, variant = ButtonVariant.Danger, text = stringResource(R.string.settings_cleanup))
                }
            }
        }
    } ?: SkeletonBlock(160.dp)
    if (vm.group?.role == "owner" || vm.isSuperadmin) {
        Card(Modifier.fillMaxWidth(), borderColor = colors.danger, background = colors.canvas) {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(stringResource(R.string.acc_danger), style = AppText.h3, color = colors.danger)
                Text(stringResource(R.string.settings_delete_group_confirm), style = AppText.sm.copy(lineHeight = 22.sp), color = colors.onGhostMuted)
                AppButton({ confirmDelete = true }, variant = ButtonVariant.Danger, icon = Lucide.Trash2, text = stringResource(R.string.settings_delete_group))
            }
        }
    }
    if (confirmCleanup) {
        ConfirmDialog(stringResource(R.string.settings_cleanup), stringResource(R.string.settings_cleanup_confirm), true,
            { confirmCleanup = false }) { vm.cleanup(); confirmCleanup = false }
    }
    if (confirmDelete) {
        ConfirmDialog(stringResource(R.string.settings_delete_group), stringResource(R.string.settings_delete_group_confirm), true,
            { confirmDelete = false }) { vm.deleteGroup(); confirmDelete = false }
    }
}

private val permissionLabels = mapOf(
    Permission.EditGroupGeneral to R.string.perm_edit_group_general,
    Permission.EditSubjectsCourses to R.string.perm_edit_subjects_courses,
    Permission.EditSchedule to R.string.perm_edit_schedule,
    Permission.CreateItems to R.string.perm_create_items,
    Permission.UploadImages to R.string.perm_upload_images,
    Permission.ManageNotes to R.string.perm_manage_notes,
    Permission.SendMessages to R.string.perm_send_messages,
    Permission.ManageScheduleChanges to R.string.perm_manage_schedule_changes,
    Permission.ManageAnnouncements to R.string.perm_manage_announcements,
    Permission.ModerateMembers to R.string.perm_moderate_members,
    Permission.DeleteOtherContent to R.string.perm_delete_other_content,
    Permission.InviteMembers to R.string.perm_invite_members,
)

@Composable
private fun GeneralTab(state: SettingsState, vm: GroupSettingsViewModel) {
    val group = vm.group ?: return
    var renaming by remember { mutableStateOf(false) }
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Card(Modifier.fillMaxWidth(), radius = Radius.xl2, padding = PaddingValues(start = 16.dp, end = 8.dp, top = 8.dp, bottom = 8.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Avatar(group.name, group.avatarUrl, 40.dp)
                Text(group.name, Modifier.weight(1f), style = AppText.base, fontWeight = FontWeight.SemiBold, color = AppTheme.colors.onGhost)
                IconButton(Lucide.Pencil, stringResource(R.string.settings_rename), { renaming = true })
            }
        }
        Label(stringResource(R.string.group_type_label))
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            val abitur = group.groupType == GroupType.Abitur
            ChoiceCard(
                stringResource(R.string.group_type_regular), stringResource(R.string.group_type_regular_desc),
                !abitur, { if (abitur) vm.setGroupType("regular") }, enabled = !state.busy,
            )
            ChoiceCard(
                stringResource(R.string.group_type_abitur), stringResource(R.string.group_type_abitur_desc),
                abitur, { if (!abitur) vm.setGroupType("abitur") }, enabled = !state.busy,
            )
        }
        ToggleCard(stringResource(R.string.group_dalton_label), null, group.daltonEnabled, vm::setDalton, enabled = !state.busy)
    }
    SectionCard(stringResource(R.string.settings_permissions)) {
        val levels = listOf(
            "user" to stringResource(R.string.perm_user),
            "moderator" to stringResource(R.string.perm_moderator),
            "admin" to stringResource(R.string.perm_admin),
        )
        Permission.entries.forEach { permission ->
            val label = stringResource(permissionLabels.getValue(permission))
            FormGroup(label = label) {
                Dropdown(label, levels, state.permissions[permission.key], { vm.setPermission(permission.key, it) })
            }
        }
    }
    if (renaming) {
        TextInputDialog(stringResource(R.string.settings_rename), stringResource(R.string.group_name), group.name,
            { renaming = false }) { vm.rename(it); renaming = false }
    }
}

@Composable
private fun MembersTab(state: SettingsState, vm: GroupSettingsViewModel) {
    val context = LocalContext.current
    var removing by remember { mutableStateOf<MemberDto?>(null) }
    var transferring by remember { mutableStateOf<MemberDto?>(null) }
    val colors = AppTheme.colors

    SectionCard(stringResource(R.string.settings_tab_members)) {
        Card(Modifier.fillMaxWidth(), radius = Radius.xl, padding = PaddingValues(0.dp), shadow = true) {
            state.members.forEachIndexed { index, member ->
                MemberRow(member, vm.currentUserId, onRole = { vm.changeRole(member.userId, it) },
                    onRemove = { removing = member }, onTransfer = { transferring = member })
                if (index < state.members.lastIndex) Divider()
            }
        }
    }
    if (state.banned.isNotEmpty()) {
        SectionCard(stringResource(R.string.settings_banned)) {
            state.banned.forEach { user ->
                Card(Modifier.fillMaxWidth(), radius = Radius.xl, padding = PaddingValues(start = 12.dp, end = 4.dp, top = 4.dp, bottom = 4.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Avatar(user.generatedName, size = 32.dp)
                        Text(user.generatedName, Modifier.weight(1f), style = AppText.base, fontWeight = FontWeight.Medium, color = colors.onGhost)
                        AppButton({ vm.unban(user.userId) }, text = stringResource(R.string.settings_unban))
                    }
                }
            }
        }
    }
    SectionCard(stringResource(R.string.settings_invites)) {
        AppButton(vm::createInvite, variant = ButtonVariant.Action, icon = Lucide.UserRoundPlus, loading = state.busy, text = stringResource(R.string.settings_invite_create))
        state.invites.filter { it.revokedAt == null && it.usedAt == null }.forEach { invite ->
            Card(Modifier.fillMaxWidth(), radius = Radius.xl, padding = PaddingValues(start = 12.dp, end = 4.dp, top = 4.dp, bottom = 4.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        invite.token.take(12) + "…", Modifier.weight(1f),
                        style = AppText.sm.copy(fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace), color = colors.onGhost,
                    )
                    IconButton(Lucide.Copy, stringResource(R.string.settings_copy), {
                        (context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager)
                            .setPrimaryClip(ClipData.newPlainText("invite", invite.token))
                    })
                    IconButton(Lucide.Trash2, stringResource(R.string.settings_invite_revoke), { vm.revokeInvite(invite.id) }, contentColor = colors.danger)
                }
            }
        }
    }
    state.newInviteToken?.let { token ->
        app.schuldashboard.ui.design.ConfirmDialog(
            true, stringResource(R.string.settings_invite_create), stringResource(R.string.settings_invite_created, token),
            vm::clearInvite,
            {
                (context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager)
                    .setPrimaryClip(ClipData.newPlainText("invite", token))
                vm.clearInvite()
            },
            confirmText = stringResource(R.string.invite_copy),
        )
    }
    removing?.let { member ->
        app.schuldashboard.ui.design.Modal(
            true, { removing = null }, member.generatedName,
            actions = {
                FormActions(stringResource(R.string.settings_remove), { vm.removeMember(member.userId, false); removing = null }, { removing = null }, danger = true)
                AppButton(
                    { vm.removeMember(member.userId, true); removing = null }, Modifier.fillMaxWidth(), full = true,
                    contentColor = colors.danger, text = stringResource(R.string.settings_ban),
                )
            },
        ) {
            Text(stringResource(R.string.settings_remove_prompt), style = AppText.base, color = colors.onGhostMuted)
        }
    }
    transferring?.let { member ->
        ConfirmDialog(stringResource(R.string.settings_transfer), stringResource(R.string.settings_transfer_confirm, member.generatedName), true,
            { transferring = null }) { vm.transferOwnership(member.userId); transferring = null }
    }
}

/** A member: avatar, name and role, with role changes and removal in a menu. */
@Composable
private fun MemberRow(member: MemberDto, currentUserId: String, onRole: (String) -> Unit, onRemove: () -> Unit, onTransfer: () -> Unit) {
    val colors = AppTheme.colors
    var menu by remember { mutableStateOf(false) }
    val manageable = member.assignableRoles.isNotEmpty() || member.canRemove
    Row(
        Modifier.fillMaxWidth().padding(start = 12.dp, end = 4.dp, top = 8.dp, bottom = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Avatar(member.generatedName, size = 40.dp)
        Column(Modifier.weight(1f)) {
            Text(
                member.generatedName + if (member.userId == currentUserId) " (" + stringResource(R.string.chat_you) + ")" else "",
                style = AppText.base, fontWeight = FontWeight.SemiBold, color = colors.onGhost,
                maxLines = 1, overflow = TextOverflow.Ellipsis,
            )
            Text(roleLabel(member.role), style = AppText.sm, color = colors.onGhostMuted)
        }
        if (manageable) IconButton(Lucide.Ellipsis, stringResource(R.string.a11y_more), { menu = true })
    }
    Menu(menu, { menu = false }, title = member.generatedName) {
        val roles = member.assignableRoles.filter { it != "owner" }
        if (roles.isNotEmpty()) {
            MenuSelect(stringResource(R.string.settings_role), roles.map { Triple(it, roleLabel(it), null) }, member.role, { onRole(it); menu = false })
        }
        if ("owner" in member.assignableRoles) {
            MenuButton(stringResource(R.string.settings_transfer), { menu = false; onTransfer() }, icon = Lucide.Crown)
        }
        if (member.canRemove) {
            MenuDivider()
            MenuButton(stringResource(R.string.settings_remove), { menu = false; onRemove() }, icon = Lucide.Ban, danger = true)
        }
    }
}

@Composable
private fun AnnouncementsTab(state: SettingsState, vm: GroupSettingsViewModel) {
    var content by rememberSaveable { mutableStateOf("") }
    var color by rememberSaveable { mutableStateOf("info") }
    val colors = AppTheme.colors
    SectionCard(stringResource(R.string.settings_announcement_new)) {
        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
            FormGroup(label = stringResource(R.string.settings_announcement_text)) {
                TextField(content, { content = it }, singleLine = false, minLines = 2)
            }
            Dropdown("", listOf("info", "warn", "danger").map { it to it.replaceFirstChar(Char::uppercase) }, color, { color = it })
            AppButton(
                { vm.createAnnouncement(content, color); content = "" },
                variant = ButtonVariant.Action, full = true, enabled = content.isNotBlank(), loading = state.busy,
                text = stringResource(R.string.action_create),
            )
        }
    }
    if (state.announcements.isEmpty()) {
        Text(stringResource(R.string.announcements_empty), Modifier.fillMaxWidth().padding(32.dp), style = AppText.base, color = colors.onGhostMuted, textAlign = TextAlign.Center)
    }
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        state.announcements.forEach { announcement ->
            val accent = when (announcement.color) {
                "warn" -> colors.warn
                "danger" -> colors.danger
                "info" -> colors.action
                else -> colors.ghostBorder
            }
            Card(
                Modifier.fillMaxWidth().drawBehind { drawRect(accent, size = androidx.compose.ui.geometry.Size(3.dp.toPx(), size.height)) },
                radius = Radius.xl, padding = PaddingValues(4.dp),
            ) {
                Row(verticalAlignment = Alignment.Top) {
                    Column(Modifier.weight(1f).padding(start = 12.dp, top = 4.dp, bottom = 4.dp)) {
                        Text(announcement.content, Modifier.padding(bottom = 8.dp), style = AppText.base.copy(lineHeight = 26.sp), color = colors.onGhost)
                        Text(relativeTime(announcement.createdAt), style = AppText.xs, color = colors.onGhostMuted)
                    }
                    IconButton(Lucide.Trash2, stringResource(R.string.action_delete), { vm.deleteAnnouncement(announcement.id) }, contentColor = colors.danger)
                }
            }
        }
    }
}

private val subjectCategories = mapOf(
    GroupType.Regular to listOf("core", "elective", "extra"),
    GroupType.Abitur to listOf("mandatory", "optional", "zk"),
)

@Composable
private fun SubjectsTab(state: SettingsState, vm: GroupSettingsViewModel) {
    val type = vm.group?.groupType ?: GroupType.Regular
    val categories = subjectCategories.getValue(type)
    var name by rememberSaveable { mutableStateOf("") }
    var category by rememberSaveable { mutableStateOf(categories.first()) }
    var courseFor by remember { mutableStateOf<String?>(null) }
    val colors = AppTheme.colors

    SectionCard(stringResource(R.string.settings_subject_add)) {
        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
            FormGroup(label = stringResource(R.string.settings_subject_name)) { TextField(name, { name = it }) }
            Dropdown("", categories.map { it to it.replaceFirstChar(Char::uppercase) }, category, { category = it })
            AppButton(
                { vm.createSubject(name, category, false); name = "" },
                variant = ButtonVariant.Action, full = true, enabled = name.isNotBlank(), loading = state.busy,
                text = stringResource(R.string.action_create),
            )
        }
    }
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        state.subjects.forEach { subject ->
            Card(Modifier.fillMaxWidth(), radius = Radius.xl, shadow = true, padding = PaddingValues(start = 16.dp, end = 4.dp, top = 8.dp, bottom = 8.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(subjectLabel(subject.name), style = AppText.h4, color = colors.onGhost)
                        subject.category?.let { Text(it.replaceFirstChar(Char::uppercase), style = AppText.sm, color = colors.onGhostMuted) }
                    }
                    IconButton(Lucide.Trash2, stringResource(R.string.action_delete), { vm.deleteSubject(subject.id) }, contentColor = colors.danger)
                }
                Row(Modifier.padding(end = 12.dp, top = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text(stringResource(R.string.group_dalton), Modifier.weight(1f), style = AppText.sm, fontWeight = FontWeight.Medium, color = colors.onGhost)
                    Toggle(subject.isDalton, { vm.updateSubject(subject.id, SubjectRequest(isDalton = it)) })
                }
                subject.courses.forEach { course ->
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            course.name + course.courseType?.let { " (${it.uppercase()})" }.orEmpty(),
                            Modifier.weight(1f), style = AppText.base, color = colors.onGhost,
                        )
                        IconButton(Lucide.X, stringResource(R.string.action_delete), { vm.deleteCourse(course.id) }, size = ButtonSize.Sm)
                    }
                }
                AppButton({ courseFor = subject.id }, Modifier.padding(top = 4.dp), icon = Lucide.Plus, text = stringResource(R.string.settings_course_add))
            }
        }
    }
    courseFor?.let { subjectId ->
        TextInputDialog(stringResource(R.string.settings_course_add), stringResource(R.string.settings_course_name),
            onDismiss = { courseFor = null }) {
            vm.createCourse(subjectId, it, if (type == GroupType.Abitur) "gk" else null)
            courseFor = null
        }
    }
}
