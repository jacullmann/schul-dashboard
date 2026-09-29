package app.schuldashboard.ui.design

import androidx.compose.animation.core.Animatable
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.PressInteraction
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.clipRect
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.layout.positionInParent
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.schuldashboard.ui.icons.Icon
import app.schuldashboard.ui.icons.LucideIcon
import app.schuldashboard.ui.theme.AppText
import app.schuldashboard.ui.theme.AppTheme
import app.schuldashboard.ui.theme.Motion
import dev.chrisbanes.haze.HazeState
import kotlinx.coroutines.launch

data class TabItem<T>(val id: T, val label: String, val icon: LucideIcon? = null)

/** Tapping a tab: straight there, without overshooting (BaseTabs' SELECT spring). */
private val SelectSpring = Motion.spring<Float>(response = 0.34f)
/** The pill giving way under a finger (BaseTabs' PRESS spring). */
private val PressSpring = Motion.spring<Float>(response = 0.22f)
private val PressInset = 2.dp
/** How far the pill reaches past a label onto its neighbours' padding. */
private val PillOverhang = 6.dp

private class TabBounds(val left: Float, val right: Float)

/**
 * The pill of BaseTabs: the row is drawn twice, the copy in the active colours clipped to the
 * pill, so labels change colour exactly where the pill's edge passes over them.
 */
@Composable
private fun <T> PillTabs(
    items: List<TabItem<T>>,
    selected: T,
    onSelect: (T) -> Unit,
    pillColor: Color,
    activeContent: Color,
    idleContent: Color,
    overhang: Boolean,
    modifier: Modifier = Modifier,
    tab: @Composable RowScope.(item: TabItem<T>, index: Int, content: Color, measure: Modifier) -> Unit,
) {
    val bounds = remember(items.size) { mutableStateListOf<TabBounds?>().apply { repeat(items.size) { add(null) } } }
    val left = remember { Animatable(0f) }
    val right = remember { Animatable(0f) }
    val press = remember { Animatable(0f) }
    var placed by remember { mutableStateOf(false) }
    var rowWidth by remember { mutableStateOf(0f) }
    val index = items.indexOfFirst { it.id == selected }
    val target = bounds.getOrNull(index)
    val overhangPx = with(androidx.compose.ui.platform.LocalDensity.current) { PillOverhang.toPx() }
    val insetPx = with(androidx.compose.ui.platform.LocalDensity.current) { PressInset.toPx() }

    LaunchedEffect(target?.left, target?.right, rowWidth) {
        val t = target ?: return@LaunchedEffect
        val l = if (overhang && index > 0) t.left - overhangPx else t.left
        val r = if (overhang && index < items.lastIndex) t.right + overhangPx else t.right
        if (!placed) {
            left.snapTo(l)
            right.snapTo(r)
            placed = true
        } else {
            launch { left.animateTo(l, SelectSpring) }
            right.animateTo(r, SelectSpring)
        }
    }

    val interactions = remember(items.size) { List(items.size) { MutableInteractionSource() } }
    val selectedInteraction = interactions.getOrNull(index)
    LaunchedEffect(selectedInteraction) {
        selectedInteraction?.interactions?.collect { interaction ->
            when (interaction) {
                is PressInteraction.Press -> launch { press.animateTo(1f, PressSpring) }
                else -> launch { press.animateTo(0f, PressSpring) }
            }
        }
    }

    val row: @Composable (content: Color, measuring: Boolean) -> Unit = { content, measuring ->
        Row(Modifier.fillMaxWidth().onGloballyPositioned { if (measuring) rowWidth = it.size.width.toFloat() }) {
            items.forEachIndexed { i, item ->
                val measure = if (measuring) {
                    Modifier
                        .onGloballyPositioned {
                            val x = it.positionInParent().x
                            bounds[i] = TabBounds(x, x + it.size.width)
                        }
                        .clickable(interactions[i], null, role = Role.Tab) { onSelect(item.id) }
                } else Modifier
                tab(item, i, content, measure)
            }
        }
    }

    Box(
        modifier.drawBehind {
            if (placed) {
                val inset = press.value * insetPx
                drawRoundRect(
                    pillColor,
                    Offset(left.value + inset, inset),
                    Size((right.value - left.value - inset * 2).coerceAtLeast(0f), size.height - inset * 2),
                    CornerRadius(size.height / 2),
                )
            }
        },
    ) {
        row(idleContent, true)
        Box(
            Modifier.drawWithContent {
                if (placed) {
                    val inset = press.value * insetPx
                    clipRect(left.value + inset, 0f, right.value - inset, size.height) { this@drawWithContent.drawContent() }
                }
            },
        ) { row(activeContent, false) }
    }
}

/** BaseTabs' `segmented` variant: labels in a bordered pill track with a black (white) pill. */
@Composable
fun <T> SegmentedControl(
    items: List<TabItem<T>>,
    selected: T,
    onSelect: (T) -> Unit,
    modifier: Modifier = Modifier,
    stretch: Boolean = false,
) {
    val colors = AppTheme.colors
    val shape = CircleShape
    Box(
        modifier
            .then(if (stretch) Modifier.fillMaxWidth() else Modifier)
            .inputShadow(shape)
            .clip(shape)
            .background(colors.surface)
            .border(1.dp, colors.ghostBorder, shape)
            .then(if (stretch) Modifier else Modifier.horizontalScroll(rememberScrollState())),
    ) {
        PillTabs(
            items, selected, onSelect, colors.action, colors.onAction, colors.onGhostMuted, overhang = true,
            if (stretch) Modifier.fillMaxWidth() else Modifier,
        ) { item, i, content, measure ->
            Row(
                measure
                    .then(if (stretch) Modifier.weight(1f) else Modifier)
                    .defaultMinSize(36.dp, 36.dp)
                    .padding(
                        start = if (i == 0) 20.dp else 14.dp,
                        end = if (i == items.lastIndex) 20.dp else 14.dp,
                        top = 8.dp,
                        bottom = 8.dp,
                    ),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally),
            ) {
                item.icon?.let { Icon(it, null, size = 20.dp, tint = content, strokeWidth = 1.8f) }
                Text(item.label, style = AppText.sm.copy(lineHeight = 16.sp), fontWeight = FontWeight.Medium, color = content, maxLines = 1)
            }
        }
    }
}

/**
 * BaseTabs' `tab-bar` variant, the phone's bottom navigation: a glass capsule over [backdrop]
 * whose tabs share the width, each a 24dp icon over a 10sp label, with a soft grey pill.
 */
@Composable
fun <T> TabBar(
    items: List<TabItem<T>>,
    selected: T,
    onSelect: (T) -> Unit,
    modifier: Modifier = Modifier,
    backdrop: HazeState? = null,
) {
    val colors = AppTheme.colors
    val shape = CircleShape
    // Without the blur, sharp content through the site's 20% gap reads as noise.
    val tint = colors.surface.copy(alpha = if (backdrop != null && BackdropBlurSupported) 0.8f else 0.95f)
    Box(
        modifier
            .widthIn(max = 448.dp)
            .fillMaxWidth()
            .menuShadow(shape, colors.shadowHeavy)
            .clip(shape),
    ) {
        backdrop?.let { GlassBackdrop(it, Modifier.matchParentSize()) }
        TabBarTabs(items, selected, onSelect, Modifier.background(tint).border(1.dp, colors.ghostBorder, shape).padding(4.dp))
    }
}

@Composable
private fun <T> TabBarTabs(items: List<TabItem<T>>, selected: T, onSelect: (T) -> Unit, modifier: Modifier) {
    val colors = AppTheme.colors
    Box(modifier) {
        PillTabs(
            items, selected, onSelect, colors.ghostHover, colors.onGhost, colors.onGhostMuted, overhang = false,
            Modifier.fillMaxWidth(),
        ) { item, _, content, measure ->
            Column(
                measure.weight(1f).padding(horizontal = 8.dp, vertical = 6.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(2.dp),
            ) {
                CompositionLocalProvider(LocalContentColor provides content) {
                    item.icon?.let { Icon(it, null, size = 24.dp, strokeWidth = 1.8f) }
                    Text(item.label, style = AppText.xs2, fontWeight = FontWeight.Medium, maxLines = 1)
                }
            }
        }
    }
}
