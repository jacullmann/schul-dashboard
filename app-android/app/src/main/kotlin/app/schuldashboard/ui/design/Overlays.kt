package app.schuldashboard.ui.design

import android.view.WindowManager
import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.SizeTransform
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.MutableTransitionState
import androidx.compose.animation.core.Transition
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.rememberTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.Orientation
import androidx.compose.foundation.gestures.draggable
import androidx.compose.foundation.gestures.rememberDraggableState
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.BlurredEdgeTreatment
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.nestedscroll.NestedScrollConnection
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.input.nestedscroll.NestedScrollSource
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.Velocity
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.compose.ui.window.DialogWindowProvider
import app.schuldashboard.R
import app.schuldashboard.ui.icons.Icon
import app.schuldashboard.ui.icons.Lucide
import app.schuldashboard.ui.icons.LucideIcon
import app.schuldashboard.ui.theme.AppText
import app.schuldashboard.ui.theme.AppTheme
import app.schuldashboard.ui.theme.Motion
import app.schuldashboard.ui.theme.Radius
import app.schuldashboard.ui.theme.cssBlur
import app.schuldashboard.ui.theme.focusBlur
import dev.chrisbanes.haze.hazeSource
import dev.chrisbanes.haze.rememberHazeState
import kotlinx.coroutines.launch

/**
 * Hosts an overlay in its own window, like the site's `<Teleport to="body">`, and keeps it
 * composed until its leave transition has finished. The window's own dim and animations are
 * switched off: the backdrop and motion are drawn here, on the site's curves.
 */
@Composable
internal fun OverlayWindow(open: Boolean, onDismissRequest: () -> Unit, content: @Composable (Transition<Boolean>) -> Unit) {
    val state = remember { MutableTransitionState(false) }
    state.targetState = open
    if (!state.currentState && !state.targetState && state.isIdle) return
    // The dialog window is not handed the activity's insets, so they are measured out here.
    val density = LocalDensity.current
    val bars = androidx.core.view.ViewCompat.getRootWindowInsets(LocalView.current)
        ?.getInsets(androidx.core.view.WindowInsetsCompat.Type.systemBars())
    val insets = with(density) { OverlayInsets(top = (bars?.top ?: 0).toDp(), bottom = (bars?.bottom ?: 0).toDp()) }
    val depth = LocalOverlayDepth.current + 1
    Dialog(
        onDismissRequest,
        DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false),
    ) {
        val window = (LocalView.current.parent as? DialogWindowProvider)?.window
        SideEffect {
            window?.apply {
                setDimAmount(0f)
                clearFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND)
                addFlags(WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS)
                setWindowAnimations(0)
                setLayout(WindowManager.LayoutParams.MATCH_PARENT, WindowManager.LayoutParams.MATCH_PARENT)
                // Dialog windows are fitted between the system bars by default; the backdrop should
                // cover them like the page's does, and the sheet reach down to the screen's edge.
                attributes = attributes.apply {
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) setFitInsetsTypes(0)
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
                        layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
                    }
                }
                @Suppress("DEPRECATION")
                setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE)
            }
        }
        CompositionLocalProvider(LocalOverlayInsets provides insets, LocalOverlayDepth provides depth) {
            // Registered above whatever opened it, so an overlay stacked on top blurs this one too.
            Box(Modifier.fillMaxSize().hazeSource(LocalPageBackdrop.current, zIndex = depth.toFloat())) {
                content(rememberTransition(state, label = "overlay"))
            }
        }
    }
}

internal data class OverlayInsets(val top: Dp, val bottom: Dp)

internal val LocalOverlayInsets = compositionLocalOf { OverlayInsets(0.dp, 0.dp) }

private val LocalOverlayDepth = compositionLocalOf { 0 }

/**
 * BaseModal as a centred card (BaseModalCard): the page blurs by 12px behind a 40% black
 * backdrop while the card settles from 110% scale out of a 12px blur. [actions] is BaseForm's footer.
 */
@Composable
fun Modal(
    open: Boolean,
    onDismiss: () -> Unit,
    title: String,
    modifier: Modifier = Modifier,
    actions: (@Composable ColumnScope.() -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit,
) {
    OverlayWindow(open, onDismiss) { transition ->
        val colors = AppTheme.colors
        val enterFade = tween<Float>(250, easing = Motion.EaseOut)
        val exitFade = tween<Float>(150, easing = Motion.EaseOut)
        val alpha by transition.animateFloat({ if (targetState) enterFade else exitFade }, label = "alpha") { if (it) 1f else 0f }
        val scale by transition.animateFloat(
            { if (targetState) tween(250, easing = Motion.Settle) else tween(150, easing = Motion.Exit) }, label = "scale",
        ) { if (it) 1f else 1.1f }
        val blur by transition.animateFloat(
            { if (targetState) tween(250, easing = Motion.FocusIn) else tween(150, easing = Motion.FocusOut) }, label = "blur",
        ) { if (it) 0f else 12f }

        Box(Modifier.fillMaxSize().graphicsLayer { this.alpha = alpha }) {
            OverlayBackdrop(
                12f, Color.Black.copy(alpha = 0.4f),
                Modifier.clickable(remember { MutableInteractionSource() }, null, onClick = onDismiss),
            )
            Box(
                Modifier.fillMaxSize()
                    .padding(top = LocalOverlayInsets.current.top, bottom = LocalOverlayInsets.current.bottom)
                    .imePadding(),
                contentAlignment = Alignment.Center,
            ) {
                val shape = RoundedCornerShape(Radius.xl2)
                Column(
                    modifier
                        .padding(horizontal = 16.dp, vertical = 40.dp)
                        .widthIn(max = 640.dp)
                        .fillMaxWidth()
                        .heightIn(max = 896.dp)
                        .graphicsLayer {
                            scaleX = scale
                            scaleY = scale
                        }
                        .then(if (blur > 0.05f) Modifier.blur(cssBlur(blur), BlurredEdgeTreatment.Unbounded) else Modifier)
                        .clip(shape)
                        .background(colors.canvas)
                        .border(1.dp, colors.ghostBorder, shape)
                        .clickable(remember { MutableInteractionSource() }, null) {},
                ) {
                    StickyTitleScroller(colors.canvas, title = { measure ->
                        Text(
                            title,
                            measure.padding(start = 16.dp, top = 16.dp, end = 64.dp).heightIn(min = 30.dp),
                            style = AppText.h3,
                            color = colors.onGhost,
                        )
                        IconButton(
                            Lucide.X, stringResource(R.string.a11y_close), onDismiss,
                            Modifier.align(Alignment.TopEnd).padding(4.dp),
                        )
                    }) {
                        Column(Modifier.padding(start = 16.dp, end = 16.dp, bottom = 16.dp)) {
                            content()
                            actions?.let {
                                Column(Modifier.padding(top = 16.dp), verticalArrangement = Arrangement.spacedBy(8.dp), content = it)
                            }
                        }
                    }
                }
            }
        }
    }
}

/**
 * A scroller whose title stays put while the content scrolls up under it into a BaseScrollFade
 * of [color], like the sticky headings of BaseModal and BaseMenu. [title] reports its height
 * through the modifier it is handed; the content starts [gap] below it and the fade reaches
 * [fadeBelow] past it.
 */
@Composable
internal fun StickyTitleScroller(
    color: Color,
    modifier: Modifier = Modifier,
    gap: Dp = 16.dp,
    fadeBelow: Dp = 16.dp,
    title: @Composable BoxScope.(measure: Modifier) -> Unit,
    content: @Composable ColumnScope.() -> Unit,
) {
    val scroll = rememberHazeState(blurEnabled = BackdropBlurSupported)
    val density = LocalDensity.current
    var titleHeight by remember { mutableStateOf(0.dp) }
    Box(modifier) {
        Column(Modifier.hazeSource(scroll).verticalScroll(rememberScrollState())) {
            Spacer(Modifier.height(titleHeight + gap))
            content()
        }
        Box(Modifier.fillMaxWidth().height(titleHeight + fadeBelow).scrollFade(scroll, color))
        title(Modifier.onSizeChanged { titleHeight = with(density) { it.height.toDp() } })
    }
}

/**
 * BaseForm's footer on phones: full-width buttons stacked with the action above cancel.
 * [danger] swaps the action for the danger variant.
 */
@Composable
fun ColumnScope.FormActions(
    submitText: String,
    onSubmit: () -> Unit,
    onCancel: (() -> Unit)? = null,
    cancelText: String = stringResource(R.string.action_cancel),
    danger: Boolean = false,
    loading: Boolean = false,
    enabled: Boolean = true,
) {
    AppButton(
        onSubmit,
        variant = if (danger) ButtonVariant.Danger else ButtonVariant.Action,
        full = true,
        loading = loading,
        enabled = enabled && !loading,
        text = submitText,
    )
    onCancel?.let { AppButton(it, Modifier.fillMaxWidth(), text = cancelText, full = true) }
}

/** BaseDialog: a confirmation modal with one paragraph of text. */
@Composable
fun ConfirmDialog(
    open: Boolean,
    title: String,
    text: String,
    onDismiss: () -> Unit,
    onConfirm: () -> Unit,
    confirmText: String = stringResource(R.string.action_confirm),
    danger: Boolean = false,
    loading: Boolean = false,
) {
    Modal(open, onDismiss, title, actions = { FormActions(confirmText, onConfirm, onDismiss, danger = danger, loading = loading) }) {
        Text(text, style = AppText.base, color = AppTheme.colors.onGhostMuted)
    }
}

private const val DISMISS_DISTANCE_DP = 100
private const val DISMISS_VELOCITY = 500f

/**
 * BaseSheet: slides up from the bottom over a light, 8px-blurred backdrop, with a drag handle.
 * Dragging it down past 100dp, or flicking it, dismisses it; content scrolled back to its top
 * hands the drag over to the sheet. [header] sticks below the handle, and the content scrolls
 * up under both into a fade reaching [fadeBelow] past them.
 */
@Composable
fun Sheet(
    open: Boolean,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
    gap: Dp = 0.dp,
    fadeBelow: Dp = 4.dp,
    header: (@Composable ColumnScope.() -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit,
) {
    OverlayWindow(open, onDismiss) { transition ->
        val colors = AppTheme.colors
        val density = LocalDensity.current
        val scope = rememberCoroutineScope()
        val drag = remember { Animatable(0f) }
        var sheetHeight by remember { mutableStateOf(0f) }
        var closing by remember { mutableStateOf(false) }

        val backdrop by transition.animateFloat(
            { if (targetState) tween(200, easing = Motion.Ease) else tween(if (closing) 150 else 280, easing = Motion.Ease) },
            label = "backdrop",
        ) { if (it) 1f else 0f }
        val slide by transition.animateFloat(
            { if (targetState) tween(400, easing = Motion.Expand) else tween(150, easing = Motion.Collapse) }, label = "slide",
        ) { if (it) 0f else 1f }

        fun settle(velocity: Float) {
            val distance = with(density) { DISMISS_DISTANCE_DP.dp.toPx() }
            val dismiss = drag.value > distance || (velocity > DISMISS_VELOCITY && drag.value > with(density) { 20.dp.toPx() })
            scope.launch {
                if (dismiss) {
                    closing = true
                    drag.animateTo(sheetHeight, tween(150, easing = Motion.Collapse))
                    onDismiss()
                } else {
                    drag.animateTo(0f, tween(200, easing = Motion.Expand))
                }
            }
        }

        val nested = remember {
            object : NestedScrollConnection {
                override fun onPreScroll(available: Offset, source: NestedScrollSource): Offset {
                    if (available.y < 0 && drag.value > 0f) {
                        val consumed = maxOf(available.y, -drag.value)
                        scope.launch { drag.snapTo(drag.value + consumed) }
                        return Offset(0f, consumed)
                    }
                    return Offset.Zero
                }

                override fun onPostScroll(consumed: Offset, available: Offset, source: NestedScrollSource): Offset {
                    if (available.y > 0 && source == NestedScrollSource.UserInput) {
                        scope.launch { drag.snapTo(drag.value + available.y) }
                        return Offset(0f, available.y)
                    }
                    return Offset.Zero
                }

                override suspend fun onPreFling(available: Velocity): Velocity {
                    if (drag.value > 0f) {
                        settle(available.y)
                        return available
                    }
                    return Velocity.Zero
                }
            }
        }

        BackHandler { onDismiss() }
        Box(Modifier.fillMaxSize()) {
            val distance = with(density) { DISMISS_DISTANCE_DP.dp.toPx() }
            OverlayBackdrop(
                8f, Color.Black.copy(alpha = 0.25f),
                Modifier
                    .graphicsLayer { alpha = backdrop * (1f - (drag.value / distance).coerceIn(0f, 1f) * 0.6f) }
                    .clickable(remember { MutableInteractionSource() }, null, onClick = onDismiss),
            )
            BoxWithConstraints(Modifier.align(Alignment.BottomCenter).padding(top = LocalOverlayInsets.current.top).imePadding()) {
                val maxHeight = maxHeight * 0.85f
                val shape = RoundedCornerShape(topStart = Radius.xl2, topEnd = Radius.xl2)
                StickyTitleScroller(
                    colors.surface,
                    modifier
                        .fillMaxWidth()
                        .heightIn(max = maxHeight)
                        .graphicsLayer {
                            sheetHeight = size.height
                            translationY = slide * size.height + drag.value
                        }
                        .menuShadow(shape, colors.shadowHeavy)
                        // Runs on past the bottom edge, so a spring or rounding never shows a seam there.
                        .drawBehind {
                            drawRect(colors.surface, Offset(0f, size.height - 1f), androidx.compose.ui.geometry.Size(size.width, 64.dp.toPx()))
                        }
                        .clip(shape)
                        .background(colors.surface)
                        .topBorder(colors.ghostBorder, Radius.xl2)
                        .clickable(remember { MutableInteractionSource() }, null) {}
                        .draggable(
                            rememberDraggableState { delta -> scope.launch { drag.snapTo((drag.value + delta).coerceAtLeast(0f)) } },
                            Orientation.Vertical,
                            onDragStopped = { velocity -> settle(velocity) },
                        )
                        .nestedScroll(nested),
                    gap = gap,
                    fadeBelow = fadeBelow,
                    title = { measure ->
                        Column(measure) {
                            Box(Modifier.fillMaxWidth().padding(top = 8.dp, bottom = 12.dp), contentAlignment = Alignment.Center) {
                                Box(Modifier.size(64.dp, 4.dp).clip(CircleShape).background(colors.onGhostSubtle.copy(alpha = 0.5f)))
                            }
                            header?.invoke(this)
                        }
                    },
                ) {
                    Column(Modifier.padding(bottom = maxOf(16.dp, LocalOverlayInsets.current.bottom)), content = content)
                }
            }
        }
        LaunchedEffect(open) { if (open) { closing = false; drag.snapTo(0f) } }
    }
}

/** The sheet's top edge: a hairline that follows the rounded corners and stops where they end. */
private fun Modifier.topBorder(color: Color, radius: Dp) = drawWithContent {
    drawContent()
    val r = radius.toPx()
    val stroke = 1.dp.toPx()
    val inset = stroke / 2
    val path = Path().apply {
        moveTo(inset, r)
        arcTo(Rect(inset, inset, inset + 2 * (r - inset), inset + 2 * (r - inset)), 180f, 90f, false)
        lineTo(size.width - r, inset)
        arcTo(Rect(size.width - inset - 2 * (r - inset), inset, size.width - inset, inset + 2 * (r - inset)), 270f, 90f, false)
    }
    drawPath(path, color, style = Stroke(stroke))
}

/** A modal that becomes a sheet, like BaseModal with `sheet` on a phone. */
@Composable
fun SheetModal(
    open: Boolean,
    onDismiss: () -> Unit,
    title: String,
    actions: (@Composable ColumnScope.() -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit,
) {
    Sheet(
        open, onDismiss, gap = 16.dp, fadeBelow = 16.dp,
        header = { Text(title, Modifier.padding(horizontal = 16.dp), style = AppText.h3, color = AppTheme.colors.onGhost) },
    ) {
        Column(Modifier.padding(horizontal = 16.dp).padding(bottom = 16.dp)) {
            content()
            actions?.let { Column(Modifier.padding(top = 16.dp), verticalArrangement = Arrangement.spacedBy(8.dp), content = it) }
        }
    }
}

/** Lets menu items drill into a submenu, the way BaseSubmenu does inside a sheet. */
class MenuNavigator internal constructor() {
    internal var stack by mutableStateOf<List<Pair<String, @Composable ColumnScope.() -> Unit>>>(emptyList())
    internal var dismiss: () -> Unit = {}

    fun push(label: String, content: @Composable ColumnScope.() -> Unit) {
        stack = stack + (label to content)
    }

    fun pop() {
        stack = stack.dropLast(1)
    }

    /** Closes the whole menu, e.g. after an item ran its action. */
    fun close() = dismiss()
}

val LocalMenu = compositionLocalOf<MenuNavigator?> { null }

/**
 * BaseMenu, which the site shows as a sheet on phones: an optional sticky title, then items.
 * Opening a submenu slides the root out to the left and the submenu in from the right while
 * the sheet's height follows, with a back button above.
 */
@Composable
fun Menu(open: Boolean, onDismiss: () -> Unit, title: String? = null, content: @Composable ColumnScope.() -> Unit) {
    val navigator = remember { MenuNavigator() }
    navigator.dismiss = onDismiss
    LaunchedEffect(open) { if (!open) navigator.stack = emptyList() }
    val depth = navigator.stack.size
    Sheet(open, onDismiss, header = {
        val colors = AppTheme.colors
        val sheetTitle = navigator.stack.lastOrNull()?.first ?: title
        if (sheetTitle != null) {
            AnimatedContent(sheetTitle, transitionSpec = { fadeIn(tween(150)) togetherWith fadeOut(tween(150)) }, label = "title") {
                Text(
                    it,
                    Modifier.fillMaxWidth().padding(horizontal = 16.dp).padding(bottom = 8.dp),
                    style = AppText.base,
                    fontWeight = FontWeight.SemiBold,
                    color = colors.onGhost,
                    textAlign = TextAlign.Center,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
        AnimatedVisibility(
            depth > 0,
            enter = expandVertically(tween(300, easing = Motion.Drawer)) + fadeIn(tween(300, easing = Motion.Drawer)),
            exit = shrinkVertically(tween(300, easing = Motion.Drawer)) + fadeOut(tween(300, easing = Motion.Drawer)),
        ) {
            AppButton(navigator::pop, Modifier.padding(start = 4.dp, top = 4.dp), icon = Lucide.ChevronLeft, text = stringResource(R.string.action_back))
        }
    }) {
        CompositionLocalProvider(LocalMenu provides navigator) {
            AnimatedContent(
                depth,
                transitionSpec = {
                    val forward = targetState > initialState
                    (
                        slideInHorizontally(tween(300, easing = Motion.Drawer)) { if (forward) it / 12 else -it / 12 } +
                            fadeIn(tween(300, easing = Motion.Drawer))
                        ) togetherWith (
                        slideOutHorizontally(tween(300, easing = Motion.Drawer)) { if (forward) -it / 12 else it / 12 } +
                            fadeOut(tween(300, easing = Motion.Drawer))
                        ) using SizeTransform(clip = true) { _, _ -> tween(300, easing = Motion.Drawer) }
                },
                label = "menu",
            ) { level ->
                Column(Modifier.fillMaxWidth().padding(4.dp)) {
                    if (level == 0) content() else navigator.stack.getOrNull(level - 1)?.second?.invoke(this)
                }
            }
        }
    }
}

/**
 * BaseMenuButton as it appears in the sheet: a 48dp row with a 20dp icon. [selected] shows the
 * select tick, [value] the current choice before a submenu chevron.
 */
@Composable
fun MenuButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    icon: LucideIcon? = null,
    iconFilled: Boolean = false,
    danger: Boolean = false,
    enabled: Boolean = true,
    selected: Boolean? = null,
    submenu: Boolean = false,
    value: String? = null,
    description: String? = null,
    trailing: (@Composable () -> Unit)? = null,
) {
    val colors = AppTheme.colors
    val content = if (danger) colors.danger else colors.onGhost
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val background by androidx.compose.animation.animateColorAsState(
        if (pressed && enabled) (if (danger) colors.dangerHover else colors.ghostHover) else Color.Transparent,
        Motion.hover(),
        label = "bg",
    )
    Row(
        modifier
            .fillMaxWidth()
            .heightIn(min = 48.dp)
            .graphicsLayer { alpha = if (enabled) 1f else 0.5f }
            .clip(RoundedCornerShape(Radius.lg))
            .background(background)
            .clickable(interaction, androidx.compose.material3.ripple(color = content), enabled, role = Role.Button, onClick = onClick)
            .padding(start = if (icon != null) 16.dp else 18.dp, end = 16.dp, top = 8.dp, bottom = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        CompositionLocalProvider(LocalContentColor provides content) {
            Row(Modifier.weight(1f), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                icon?.let {
                    AnimatedContent(it, transitionSpec = iconSwapTransition(), label = "icon") { swapped ->
                        Icon(swapped, null, Modifier.focusBlur(this, 4f, 300, 200), size = 20.dp, filled = iconFilled)
                    }
                }
                Column {
                    Text(
                        text,
                        style = AppText.sm.copy(lineHeight = 24.sp),
                        fontWeight = if (selected == true && description == null) FontWeight.Bold else FontWeight.Medium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    description?.let { Text(it, style = AppText.xs, color = colors.onGhostMuted) }
                }
            }
            if (value != null || submenu) {
                Row(
                    Modifier.widthIn(max = 200.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp, Alignment.End),
                ) {
                    value?.let {
                        AnimatedContent(it, transitionSpec = wheelTransition(), label = "value") { v ->
                            Text(
                                v,
                                Modifier.focusBlur(this, 3f, 300, 300),
                                style = AppText.sm.copy(lineHeight = 24.sp),
                                color = colors.onGhostMuted,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                            )
                        }
                    }
                    if (submenu) Icon(Lucide.ChevronRight, null, size = 18.dp, tint = colors.onGhostMuted)
                }
            }
            selected?.let {
                if (it) Icon(Lucide.Check, null, size = 18.dp, tint = colors.onGhost) else Box(Modifier.size(16.dp))
            }
            trailing?.invoke()
        }
    }
}

/** BaseMenuDivider. */
@Composable
fun MenuDivider() = Divider(Modifier.padding(4.dp))

/**
 * BaseMenuSelect: a submenu row showing [label] and the current option, which drills into the
 * options and returns once one is picked.
 */
@Composable
fun <T> MenuSelect(
    label: String,
    options: List<Triple<T, String, LucideIcon?>>,
    selected: T,
    onSelect: (T) -> Unit,
    enabled: Boolean = true,
) {
    val navigator = LocalMenu.current
    val current = options.firstOrNull { it.first == selected }
    MenuButton(
        label,
        onClick = {
            navigator?.push(label) {
                options.forEach { (value, text, icon) ->
                    MenuButton(text, { onSelect(value); navigator.pop() }, icon = icon, selected = value == selected, enabled = enabled)
                }
            }
        },
        icon = current?.third,
        submenu = true,
        value = current?.second,
        enabled = enabled,
    )
}

/** The site's `swap-icon`: the old icon shrinks away as the new one springs up from 40%. */
private fun <S> iconSwapTransition(): androidx.compose.animation.AnimatedContentTransitionScope<S>.() -> androidx.compose.animation.ContentTransform = {
    (
        androidx.compose.animation.scaleIn(tween(450, easing = Motion.Overshoot), 0.4f) +
            fadeIn(tween(250, easing = Motion.FocusIn))
        ) togetherWith (
        androidx.compose.animation.scaleOut(tween(200, easing = Motion.Exit), 0.4f) +
            fadeOut(tween(150, easing = androidx.compose.animation.core.LinearEasing))
        ) using SizeTransform(clip = false)
}

/** The picker-wheel roll the site uses when a menu value changes. */
fun <S> wheelTransition(): androidx.compose.animation.AnimatedContentTransitionScope<S>.() -> androidx.compose.animation.ContentTransform = {
    (
        androidx.compose.animation.slideInVertically(tween(450, easing = Motion.Drawer)) { it * 3 / 4 } +
            fadeIn(tween(300, easing = Motion.Drawer))
        ) togetherWith (
        androidx.compose.animation.slideOutVertically(tween(450, easing = Motion.Drawer)) { -it * 3 / 4 } +
            fadeOut(tween(300, easing = Motion.Drawer))
        )
}
