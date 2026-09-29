package app.schuldashboard.ui.tasks

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.annotation.StringRes
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.schuldashboard.R
import app.schuldashboard.data.Cloudinary
import app.schuldashboard.data.api.HwItem
import app.schuldashboard.data.api.ImageItem
import app.schuldashboard.data.api.PrivateTaskDto
import app.schuldashboard.domain.Group
import app.schuldashboard.domain.Permission
import app.schuldashboard.ui.common.ErrorBox
import app.schuldashboard.ui.common.Load
import app.schuldashboard.ui.common.LocalBottomInset
import app.schuldashboard.ui.common.LocalTopInset
import app.schuldashboard.ui.common.formatDueDate
import app.schuldashboard.ui.common.subjectLabel
import app.schuldashboard.ui.design.AddButton
import app.schuldashboard.ui.design.AppButton
import app.schuldashboard.ui.design.BackdropBlurSupported
import app.schuldashboard.ui.design.BadgeLine
import app.schuldashboard.ui.design.ButtonSize
import app.schuldashboard.ui.design.ButtonVariant
import app.schuldashboard.ui.design.Checkbox
import app.schuldashboard.ui.design.ConfirmDialog
import app.schuldashboard.ui.design.EmptyState
import app.schuldashboard.ui.design.FormActions
import app.schuldashboard.ui.design.FormGroup
import app.schuldashboard.ui.design.IconButton
import app.schuldashboard.ui.design.ItemCard
import app.schuldashboard.ui.design.LocalToaster
import app.schuldashboard.ui.design.Menu
import app.schuldashboard.ui.design.MenuButton
import app.schuldashboard.ui.design.MenuDivider
import app.schuldashboard.ui.design.Modal
import app.schuldashboard.ui.design.PageHeader
import app.schuldashboard.ui.design.SegmentedControl
import app.schuldashboard.ui.design.SheetModal
import app.schuldashboard.ui.design.Skeleton
import app.schuldashboard.ui.design.TabItem
import app.schuldashboard.ui.design.TextField
import app.schuldashboard.ui.design.ToastType
import app.schuldashboard.ui.design.Toggle
import app.schuldashboard.ui.design.UnderlineTextField
import app.schuldashboard.ui.design.frosted
import app.schuldashboard.ui.theme.animateEnter
import app.schuldashboard.ui.design.pagePadding
import app.schuldashboard.ui.icons.Icon
import app.schuldashboard.ui.icons.Lucide
import app.schuldashboard.ui.theme.AppText
import app.schuldashboard.ui.theme.AppTheme
import app.schuldashboard.ui.theme.Motion
import app.schuldashboard.ui.theme.Radius
import app.schuldashboard.ui.theme.cssBlur
import coil.compose.AsyncImage
import dev.chrisbanes.haze.hazeSource
import dev.chrisbanes.haze.rememberHazeState

@StringRes
private fun TaskTab.label() = when (this) {
    TaskTab.All -> R.string.tasks_tab_all
    TaskTab.Homework -> R.string.tasks_tab_homework
    TaskTab.Dalton -> R.string.tasks_tab_dalton
    TaskTab.Exam -> R.string.tasks_tab_exam
    TaskTab.Private -> R.string.tasks_tab_private
}

private const val TABS_ORDER = 1
private const val LIST_ORDER = 3
/** Two thumbnails per row, as on the site below 500px. */
private const val IMAGES_PER_ROW = 2

/** Surfaces the view model's messages as the site's toasts. */
@Composable
private fun TasksFeedback(state: TasksUiState, viewModel: TasksViewModel) {
    val toaster = LocalToaster.current
    val uploading = stringResource(R.string.tasks_uploading)
    LaunchedEffect(state.message) {
        state.message?.let {
            toaster.show(it)
            viewModel.clearMessage()
        }
    }
    LaunchedEffect(state.uploading) { if (state.uploading) toaster.show(uploading, ToastType.Info) }
}

@Composable
fun TasksScreen(
    group: Group,
    onCreateTask: () -> Unit,
    onEditTask: (String) -> Unit,
    modifier: Modifier = Modifier,
    viewModel: TasksViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var showFilters by rememberSaveable { mutableStateOf(false) }
    var noticeDismissed by rememberSaveable { mutableStateOf(false) }
    val filtersActive = state.subject != null || state.showOld || state.hideChecked
    TasksFeedback(state, viewModel)

    val tabs = TaskTab.entries.filter { it != TaskTab.Private && (it != TaskTab.Dalton || group.daltonEnabled) }
        .map { TabItem(it, stringResource(it.label())) }

    LazyColumn(modifier.fillMaxSize(), contentPadding = pagePadding(LocalTopInset.current, LocalBottomInset.current)) {
        item(key = "header") {
            PageHeader(
                stringResource(R.string.nav_tasks),
                Modifier.animateEnter(0),
                action = {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        // No room for a label here, so an active filter keeps the button filled.
                        FilterButton(filtersActive) { showFilters = true }
                        AddButton(stringResource(R.string.tasks_add), onCreateTask)
                    }
                },
            )
        }
        item(key = "tabs") {
            SegmentedControl(tabs, state.tab, viewModel::setTab, Modifier.animateEnter(TABS_ORDER))
        }
        item(key = "notice") {
            val show = state.hiddenByCourses > 0 && !noticeDismissed
            PersonalizedNotice(show) { noticeDismissed = true }
            val gap by androidx.compose.animation.core.animateDpAsState(
                if (show) 12.dp else 32.dp, tween(500, easing = Motion.Settle), label = "gap",
            )
            Box(Modifier.height(gap))
        }
        taskList(group, state, viewModel, onCreateTask, onEditTask)
    }

    SheetModal(showFilters, { showFilters = false }, stringResource(R.string.tasks_filter)) {
        FilterSheetContent(state, viewModel)
    }
}

@Composable
private fun FilterButton(active: Boolean, onClick: () -> Unit) {
    val colors = AppTheme.colors
    Box(Modifier.clip(RoundedCornerShape(percent = 50)).background(if (active) colors.ghostHover else Color.Transparent)) {
        IconButton(
            Lucide.ListFilter,
            stringResource(if (active) R.string.tasks_filter_active else R.string.tasks_filter),
            onClick,
            contentColor = if (active) colors.onGhost else null,
        )
    }
}

/** PersonalizedViewNotice: opens its row from nothing so the list below eases down. */
@Composable
private fun PersonalizedNotice(show: Boolean, onDismiss: () -> Unit) {
    val colors = AppTheme.colors
    AnimatedVisibility(
        show,
        enter = expandVertically(tween(500, easing = Motion.Settle)) + fadeIn(tween(150)),
        exit = shrinkVertically(tween(500, easing = Motion.Settle)) + fadeOut(tween(150)),
    ) {
        Row(
            Modifier.fillMaxWidth().padding(top = 16.dp).animateEnter(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Icon(Lucide.ListFilter, null, size = 16.dp, tint = colors.onGhostMuted)
            Text(stringResource(R.string.personalized_notice), Modifier.weight(1f), style = AppText.sm, color = colors.onGhostMuted)
            Box(Modifier.clip(RoundedCornerShape(percent = 50)).clickable(onClick = onDismiss).padding(4.dp)) {
                Icon(Lucide.X, stringResource(R.string.a11y_dismiss), size = 16.dp, tint = colors.onGhostMuted)
            }
        }
    }
}

/** The filter sheet: 48dp rows with a label and its control, like the site's. */
@Composable
private fun ColumnScope.FilterSheetContent(state: TasksUiState, viewModel: TasksViewModel) {
    val colors = AppTheme.colors
    var subjectMenu by remember { mutableStateOf(false) }
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        FilterRow(stringResource(R.string.tasks_field_subject)) {
            val chevron by animateFloatAsState(if (subjectMenu) 180f else 0f, tween(200, easing = Motion.EaseInOut), label = "chev")
            AppButton(
                { subjectMenu = true },
                icon = Lucide.ChevronDown,
                iconTrailing = true,
                iconRotation = chevron,
                contentColor = if (subjectMenu) colors.onGhost else null,
                text = state.subject?.let { subjectLabel(it) } ?: stringResource(R.string.tasks_all_subjects),
            )
        }
        FilterRow(stringResource(R.string.tasks_archive)) { Toggle(state.showOld, viewModel::setShowOld) }
        FilterRow(stringResource(R.string.tasks_hide_checked)) { Toggle(state.hideChecked, viewModel::setHideChecked) }
    }
    Menu(subjectMenu, { subjectMenu = false }, title = stringResource(R.string.tasks_field_subject)) {
        MenuButton(
            stringResource(R.string.tasks_all_subjects),
            { viewModel.setSubject(null); subjectMenu = false },
            selected = state.subject == null,
        )
        state.subjects.forEach { subject ->
            MenuButton(subjectLabel(subject), { viewModel.setSubject(subject); subjectMenu = false }, selected = state.subject == subject)
        }
    }
}

@Composable
private fun FilterRow(label: String, control: @Composable () -> Unit) {
    Row(Modifier.fillMaxWidth().height(48.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(label, Modifier.weight(1f), style = AppText.sm, fontWeight = FontWeight.Medium, color = AppTheme.colors.onGhost)
        control()
    }
}

private fun LazyListScope.taskList(
    group: Group,
    state: TasksUiState,
    viewModel: TasksViewModel,
    onCreateTask: () -> Unit,
    onEditTask: (String) -> Unit,
) {
    when (val loaded = state.items) {
        Load.Loading -> items(5, key = { "skeleton-$it" }) { TaskSkeleton(Modifier.animateEnter(LIST_ORDER + it)) }
        is Load.Failed -> item(key = "error") { ErrorBox(loaded.message, viewModel::reload, Modifier.heightIn(max = 400.dp)) }
        is Load.Ready -> {
            val visible = state.visibleItems
            if (visible.isEmpty()) {
                item(key = "empty") {
                    EmptyState(
                        stringResource(R.string.tasks_no_tasks),
                        Modifier.animateEnter(),
                        message = stringResource(R.string.tasks_no_tasks_in_view),
                        primaryLabel = stringResource(R.string.tasks_add),
                        onPrimary = onCreateTask.takeIf { group.can(Permission.CreateItems) },
                        secondaryLabel = stringResource(R.string.tasks_reset_filters),
                        onSecondary = {
                            viewModel.setSubject(null)
                            viewModel.setShowOld(false)
                            viewModel.setHideChecked(false)
                        },
                    )
                }
            }
            itemsIndexed(visible, key = { _, item -> item.id }) { index, item ->
                TaskCard(
                    group = group,
                    item = item,
                    tab = state.tab,
                    checked = item.id in state.checked,
                    pinned = item.id in state.pinned,
                    viewModel = viewModel,
                    onEdit = { onEditTask(item.id) },
                    modifier = Modifier.padding(bottom = 12.dp).animateItem().animateEnter(LIST_ORDER + index),
                )
            }
        }
    }
}

/** TaskSkeleton: title and meta bars, three text lines and two square thumbnails. */
@Composable
private fun TaskSkeleton(modifier: Modifier = Modifier) {
    Column(modifier.fillMaxWidth().padding(12.dp).padding(bottom = 24.dp)) {
        Skeleton(Modifier.width(240.dp).height(20.dp))
        Skeleton(Modifier.padding(top = 12.dp).width(160.dp).height(16.dp))
        Skeleton(Modifier.padding(top = 12.dp).fillMaxWidth().height(16.dp))
        Skeleton(Modifier.padding(top = 8.dp).fillMaxWidth().height(16.dp))
        Skeleton(Modifier.padding(top = 8.dp).fillMaxWidth(0.7f).height(16.dp))
        Row(Modifier.padding(top = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            repeat(2) { Skeleton(Modifier.weight(1f).aspectRatio(1f), RoundedCornerShape(Radius.lg)) }
        }
    }
}

@StringRes
private fun typeLabel(type: String) = when (type) {
    "exam" -> R.string.tasks_type_exam
    "dalton" -> R.string.tasks_tab_dalton
    else -> R.string.tasks_type_homework
}

@Composable
private fun TaskCard(
    group: Group,
    item: HwItem,
    tab: TaskTab,
    checked: Boolean,
    pinned: Boolean,
    viewModel: TasksViewModel,
    onEdit: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var menu by remember { mutableStateOf(false) }
    var confirmDelete by remember { mutableStateOf(false) }
    var reporting by remember { mutableStateOf(false) }
    var editingNote by remember { mutableStateOf(false) }
    var viewer by remember { mutableStateOf<Int?>(null) }
    val canModify = item.createdBy == viewModel.currentUserId || group.can(Permission.DeleteOtherContent)
    val isAdmin = group.role != "user"
    val canNote = group.can(Permission.ManageNotes) || group.role == "admin" || group.role == "owner"
    val picker = rememberLauncherForActivityResult(ActivityResultContracts.OpenMultipleDocuments()) { uris ->
        if (uris.isNotEmpty()) viewModel.uploadImages(item, uris)
    }
    val hasBody = item.description.isNotBlank() || item.images.isNotEmpty() || item.editorNote.isNotBlank() || editingNote

    ItemCard(
        item.title,
        modifier,
        collapsed = checked,
        checkbox = { Checkbox(checked, { viewModel.toggleChecked(item) }) },
        badges = {
            val parts = buildList {
                if (tab == TaskTab.All) add(stringResource(typeLabel(item.type)))
                add(subjectLabel(item.subject))
                add(formatDueDate(item.dueDate))
                if (isAdmin) item.createdByName?.let(::add)
            }
            BadgeLine(parts.joinToString(" • "))
        },
        actions = {
            if (pinned) {
                IconButton(Lucide.Pin, stringResource(R.string.tasks_unpin), { viewModel.togglePinned(item) }, size = ButtonSize.Sm, filled = true)
            }
        },
        onMenu = { menu = true },
        hasBody = hasBody,
        body = if (!hasBody) null else {
            {
                if (item.description.isNotBlank()) TaskDescription(item.description)
                if (item.images.isNotEmpty()) TaskImages(item.images) { viewer = it }
                if (item.editorNote.isNotBlank() || editingNote) {
                    TaskNote(
                        note = item.editorNote,
                        editing = editingNote,
                        canEdit = canNote,
                        reducedMargin = item.description.isBlank() && item.images.isEmpty(),
                        onEdit = { editingNote = true },
                        onCancel = { editingNote = false },
                        onSave = { viewModel.saveNote(item, it); editingNote = false },
                        onDelete = { viewModel.saveNote(item, "") },
                    )
                }
            }
        },
    )

    Menu(menu, { menu = false }, title = item.title) {
        if (group.can(Permission.UploadImages)) {
            MenuButton(stringResource(R.string.tasks_upload_images), { menu = false; picker.launch(UPLOAD_MIME_TYPES) }, icon = Lucide.Upload)
        }
        if (canModify) MenuButton(stringResource(R.string.action_edit), { menu = false; onEdit() }, icon = Lucide.Pencil)
        if (canNote && item.editorNote.isBlank()) {
            MenuButton(stringResource(R.string.tasks_add_note), { menu = false; editingNote = true }, icon = Lucide.MessageSquarePlus)
        }
        if (group.can(Permission.UploadImages) || canModify || (canNote && item.editorNote.isBlank())) MenuDivider()
        MenuButton(
            stringResource(if (pinned) R.string.tasks_unpin else R.string.tasks_pin),
            { menu = false; viewModel.togglePinned(item) },
            icon = Lucide.Pin,
            iconFilled = pinned,
        )
        MenuDivider()
        MenuButton(stringResource(R.string.action_report), { menu = false; reporting = true }, icon = Lucide.Flag)
        if (canModify) {
            MenuButton(stringResource(R.string.action_delete), { menu = false; confirmDelete = true }, icon = Lucide.Trash2, danger = true)
        }
    }

    ConfirmDialog(
        confirmDelete,
        stringResource(R.string.tasks_delete_title),
        stringResource(R.string.tasks_delete_description),
        onDismiss = { confirmDelete = false },
        onConfirm = { confirmDelete = false; viewModel.delete(item) },
        confirmText = stringResource(R.string.tasks_delete_action),
        danger = true,
    )
    ReportModal(reporting, { reporting = false }) { reason ->
        reporting = false
        viewModel.report(item, reason)
    }
    viewer?.let { index ->
        if (item.images.isEmpty()) viewer = null
        else ImageViewer(
            images = item.images,
            startIndex = index.coerceAtMost(item.images.lastIndex),
            canDelete = { it.createdBy == viewModel.currentUserId || group.can(Permission.DeleteOtherContent) },
            onDelete = { viewModel.removeImage(item, it) },
            onDismiss = { viewer = null },
        )
    }
}

/** ReportModal: an optional reason in a textarea, confirmed with the danger button. */
@Composable
fun ReportModal(open: Boolean, onDismiss: () -> Unit, onConfirm: (String) -> Unit) {
    var reason by rememberSaveable(open) { mutableStateOf("") }
    Modal(
        open, onDismiss, stringResource(R.string.tasks_report_title),
        actions = { FormActions(stringResource(R.string.tasks_report_action), { onConfirm(reason) }, onDismiss, danger = true) },
    ) {
        FormGroup(label = stringResource(R.string.tasks_report_label)) {
            TextField(reason, { reason = it }, placeholder = stringResource(R.string.tasks_report_placeholder), singleLine = false, minLines = 3)
        }
    }
}

/**
 * TaskCardDescription: past four lines it folds to 5rem under a fade into the card, with a
 * "more" toggle that opens it over 300ms.
 */
@Composable
private fun TaskDescription(text: String) {
    val colors = AppTheme.colors
    var expanded by rememberSaveable(text) { mutableStateOf(false) }
    var overflows by remember(text) { mutableStateOf(false) }
    val fade by animateFloatAsState(if (expanded) 0f else 1f, tween(300), label = "fade")
    Box(
        Modifier
            .animateContentSize(tween(300, easing = Motion.Check))
            .then(if (!expanded) Modifier.heightIn(max = 80.dp) else Modifier)
            .drawWithContent {
                drawContent()
                if (overflows && fade > 0f) {
                    val h = 32.dp.toPx()
                    drawRect(
                        Brush.verticalGradient(listOf(Color.Transparent, colors.surface), startY = size.height - h, endY = size.height),
                        topLeft = androidx.compose.ui.geometry.Offset(0f, size.height - h),
                        alpha = fade,
                    )
                }
            },
    ) {
        Text(
            text.replace("⁠- ", "• "),
            style = AppText.base,
            color = colors.onGhost,
            onTextLayout = { if (!expanded) overflows = it.hasVisualOverflow },
        )
    }
    if (overflows || expanded) {
        Text(
            stringResource(if (expanded) R.string.action_show_less else R.string.tasks_more),
            Modifier.padding(top = if (expanded) 8.dp else 4.dp).clickable { expanded = !expanded }.padding(vertical = 4.dp),
            style = AppText.base,
            fontWeight = FontWeight.Bold,
            color = colors.onGhostMuted,
        )
    }
}

private data class FileBadge(val label: String, val icon: app.schuldashboard.ui.icons.LucideIcon, val gradient: List<Color>)

private fun fileBadge(image: ImageItem): FileBadge? {
    val format = image.metadata?.format?.lowercase()
    return when {
        format == "pdf" || image.publicId.lowercase().endsWith(".pdf") ->
            FileBadge("PDF", Lucide.FileText, listOf(Color(0xFF6A7282), Color(0xFF364153)))
        format == "docx" || format == "doc" -> FileBadge("DOCX", Lucide.FileText, listOf(Color(0xFF51A2FF), Color(0xFF372AAC)))
        format == "pptx" || format == "ppt" -> FileBadge("PPTX", Lucide.PieChart, listOf(Color(0xFFFF8904), Color(0xFFC70036)))
        format == "xlsx" || format == "xls" -> FileBadge("XLSX", Lucide.Table, listOf(Color(0xFF9AE600), Color(0xFF016630)))
        else -> null
    }
}

/**
 * TaskCardImages: square thumbnails, two to a row. Beyond one row the last tile shows "+N"
 * over a grey veil until tapped.
 */
@Composable
private fun TaskImages(images: List<ImageItem>, onOpen: (Int) -> Unit) {
    var revealed by rememberSaveable { mutableStateOf(false) }
    val shown = if (revealed) images else images.take(IMAGES_PER_ROW)
    Column(
        Modifier.padding(vertical = 8.dp).animateContentSize(tween(300, easing = Motion.Check)),
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        shown.chunked(IMAGES_PER_ROW).forEachIndexed { row, chunk ->
            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                chunk.forEachIndexed { col, image ->
                    val index = row * IMAGES_PER_ROW + col
                    val hiddenCount = if (!revealed && index == IMAGES_PER_ROW - 1) images.size - index else 0
                    if (hiddenCount > 1) {
                        ImageTile(image, Modifier.weight(1f), overflow = hiddenCount) { revealed = true }
                    } else {
                        ImageTile(image, Modifier.weight(1f)) { onOpen(index) }
                    }
                }
                repeat(IMAGES_PER_ROW - chunk.size) { Box(Modifier.weight(1f)) }
            }
        }
    }
}

/**
 * One square thumbnail; [overflow] covers it with the "+N" veil standing for the hidden rest.
 * The veil fills the tile, so blurring the thumbnail itself stands in for the site's backdrop blur.
 */
@Composable
private fun ImageTile(image: ImageItem, modifier: Modifier, overflow: Int = 0, onClick: () -> Unit) {
    val badge = fileBadge(image)
    val thumbnail = rememberHazeState(blurEnabled = BackdropBlurSupported)
    val officeWithoutThumb = badge != null && badge.label != "PDF" && image.metadata?.thumbnailId == null
    Box(
        modifier.aspectRatio(1f).clip(RoundedCornerShape(Radius.sm)).background(Color.Black.copy(alpha = 0.12f)).clickable(onClick = onClick),
    ) {
        if (officeWithoutThumb) {
            Column(
                Modifier.fillMaxSize().background(Brush.linearGradient(badge!!.gradient)).padding(12.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                Icon(badge.icon, null, Modifier.padding(bottom = 6.dp), size = 32.dp, tint = Color.White.copy(alpha = 0.9f))
                Text(image.metadata?.format.orEmpty().uppercase(), style = AppText.sm, fontWeight = FontWeight.Bold, color = Color.White)
                Text(
                    image.metadata?.name ?: stringResource(R.string.tasks_document),
                    style = AppText.xs, color = Color.White.copy(alpha = 0.75f), maxLines = 1, overflow = TextOverflow.Ellipsis,
                )
            }
        } else {
            AsyncImage(
                Cloudinary.thumb(image),
                image.metadata?.name,
                Modifier.fillMaxSize().hazeSource(thumbnail).then(if (overflow > 0) Modifier.blur(cssBlur(8f)) else Modifier),
                contentScale = ContentScale.Crop,
            )
            badge?.let {
                Row(
                    Modifier.padding(4.dp).clip(RoundedCornerShape(Radius.md)).frosted(thumbnail, 8f, Color.Black.copy(alpha = 0.4f))
                        .border(1.dp, Color.White.copy(alpha = 0.1f), RoundedCornerShape(Radius.md))
                        .padding(start = 6.dp, end = 8.dp, top = 6.dp, bottom = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    Icon(it.icon, null, size = 16.dp, tint = Color.White)
                    Text(it.label, style = AppText.sm.copy(lineHeight = 16.sp), fontWeight = FontWeight.SemiBold, color = Color.White)
                }
            }
        }
        if (overflow > 0) {
            Box(Modifier.fillMaxSize().background(Color(0x66888888)), contentAlignment = Alignment.Center) {
                Text("+$overflow", style = AppText.h1.copy(fontSize = 36.sp, fontFamily = app.schuldashboard.ui.theme.InterFamily), fontWeight = FontWeight.Medium, color = Color.White)
            }
        }
    }
}

/**
 * TaskCardNote: under a hairline, a bold "Note" heading and the note, with edit and delete
 * buttons; editing swaps in an underlined field and cancel/save.
 */
@Composable
private fun TaskNote(
    note: String,
    editing: Boolean,
    canEdit: Boolean,
    reducedMargin: Boolean,
    onEdit: () -> Unit,
    onCancel: () -> Unit,
    onSave: (String) -> Unit,
    onDelete: () -> Unit,
) {
    val colors = AppTheme.colors
    var draft by remember(editing) { mutableStateOf(note) }
    Column(Modifier.padding(top = if (reducedMargin) 0.dp else 8.dp)) {
        app.schuldashboard.ui.design.Divider()
        Row(Modifier.padding(top = 4.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Column(Modifier.weight(1f)) {
                Text(stringResource(R.string.tasks_note), Modifier.padding(bottom = 4.dp), style = AppText.base, fontWeight = FontWeight.Bold, color = colors.onGhost)
                if (!editing) {
                    if (note.isNotBlank()) Text(note, style = AppText.base, color = colors.onGhost)
                    else Text(stringResource(R.string.tasks_no_notes), style = AppText.base, fontStyle = FontStyle.Italic, color = colors.onGhostMuted)
                } else {
                    UnderlineTextField(draft, { draft = it.take(2000) }, placeholder = stringResource(R.string.tasks_note_placeholder))
                    Row(
                        Modifier.fillMaxWidth().padding(top = 8.dp, bottom = 4.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.End),
                    ) {
                        AppButton(onCancel, text = stringResource(R.string.action_cancel))
                        AppButton({ onSave(draft) }, variant = ButtonVariant.Action, text = stringResource(R.string.action_save))
                    }
                }
            }
            if (!editing && canEdit) {
                Row(Modifier.padding(end = 0.dp), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    IconButton(Lucide.Pencil, stringResource(R.string.action_edit), onEdit, size = ButtonSize.Sm)
                    if (note.isNotBlank()) {
                        IconButton(Lucide.Trash2, stringResource(R.string.action_delete), onDelete, size = ButtonSize.Sm, contentColor = colors.danger)
                    }
                }
            }
        }
    }
}

/** "Privat": the member's own to-dos, reached from the tab bar like on the site. */
@Composable
fun PrivateTasksScreen(modifier: Modifier = Modifier, viewModel: TasksViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var showForm by rememberSaveable { mutableStateOf(false) }
    val colors = AppTheme.colors

    LazyColumn(modifier.fillMaxSize(), contentPadding = pagePadding(LocalTopInset.current, LocalBottomInset.current)) {
        item(key = "header") {
            PageHeader(
                stringResource(R.string.private_title),
                Modifier.animateEnter(0),
                action = { AddButton(stringResource(R.string.private_new_title)) { showForm = true } },
            )
        }
        item(key = "notice") {
            Row(
                Modifier.fillMaxWidth().padding(bottom = 16.dp).animateEnter(1),
                horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(Lucide.Lock, null, size = 20.dp, tint = colors.onGhostMuted)
                Text(stringResource(R.string.private_only_you), style = AppText.base, fontWeight = FontWeight.Medium, color = colors.onGhostMuted)
            }
        }
        when (val tasks = state.privateTasks) {
            Load.Loading -> items(10, key = { "skeleton-$it" }) {
                Column(Modifier.padding(top = if (it == 0) 16.dp else 32.dp).animateEnter(2 + it)) {
                    Skeleton(Modifier.width(240.dp).height(20.dp))
                    Skeleton(Modifier.padding(top = 12.dp).fillMaxWidth().height(16.dp))
                }
            }
            is Load.Failed -> item(key = "error") { ErrorBox(tasks.message, viewModel::loadPrivate, Modifier.heightIn(max = 400.dp)) }
            is Load.Ready -> {
                if (tasks.value.isEmpty()) {
                    item(key = "empty") {
                        Text(
                            stringResource(R.string.private_empty),
                            Modifier.fillMaxWidth().padding(48.dp).animateEnter(2),
                            style = AppText.base,
                            color = colors.onGhostMuted,
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                        )
                    }
                }
                itemsIndexed(tasks.value, key = { _, task -> task.id }) { index, task ->
                    PrivateTaskCard(task, viewModel, Modifier.padding(bottom = 12.dp).animateItem().animateEnter(2 + index))
                }
            }
        }
    }

    PrivateTaskForm(showForm, { showForm = false }) { title, description ->
        viewModel.addPrivate(title, description)
        showForm = false
    }
}

@Composable
private fun PrivateTaskCard(task: PrivateTaskDto, viewModel: TasksViewModel, modifier: Modifier) {
    var menu by remember { mutableStateOf(false) }
    ItemCard(
        task.title,
        modifier,
        collapsed = task.completed,
        checkbox = { Checkbox(task.completed, { viewModel.togglePrivate(task) }) },
        onMenu = { menu = true },
        hasBody = task.description.isNotBlank(),
        body = if (task.description.isBlank()) null else {
            { Text(task.description, style = AppText.base, color = AppTheme.colors.onGhost) }
        },
    )
    Menu(menu, { menu = false }, title = task.title) {
        MenuButton(stringResource(R.string.action_delete), { menu = false; viewModel.deletePrivate(task) }, icon = Lucide.Trash2, danger = true)
    }
}

/** PrivateTaskForm: title and description in a modal. */
@Composable
private fun PrivateTaskForm(open: Boolean, onDismiss: () -> Unit, onSave: (String, String) -> Unit) {
    var title by rememberSaveable(open) { mutableStateOf("") }
    var description by rememberSaveable(open) { mutableStateOf("") }
    var titleError by remember(open) { mutableStateOf<String?>(null) }
    val missing = stringResource(R.string.error_title_missing)
    Modal(
        open, onDismiss, stringResource(R.string.private_new_title),
        actions = {
            FormActions(stringResource(R.string.action_create), {
                if (title.isBlank()) titleError = missing else onSave(title.trim(), description.trim())
            }, onDismiss)
        },
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
            FormGroup(label = stringResource(R.string.tasks_field_title), required = true, error = titleError) {
                TextField(title, { title = it.take(100); titleError = null })
            }
            FormGroup(label = stringResource(R.string.tasks_field_description)) {
                TextField(description, { description = it.take(2000) }, singleLine = false, minLines = 4)
            }
        }
    }
}

private val UPLOAD_MIME_TYPES = arrayOf(
    "image/*",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
)
