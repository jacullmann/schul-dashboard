package app.schuldashboard.ui.design

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.material3.ripple
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.layout
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Constraints
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import app.schuldashboard.R
import app.schuldashboard.ui.icons.Icon
import app.schuldashboard.ui.icons.Lucide
import app.schuldashboard.ui.icons.LucideIcon
import app.schuldashboard.ui.theme.AppText
import app.schuldashboard.ui.theme.AppTheme
import app.schuldashboard.ui.theme.Motion

/** The `.card` page padding every group page sits in. */
val PagePadding = 16.dp

/** A page's padding, grown by the header above and the floating tab bar below that it scrolls under. */
fun pagePadding(topInset: Dp, bottomInset: Dp) =
    PaddingValues(start = PagePadding, top = PagePadding + topInset, end = PagePadding, bottom = PagePadding + bottomInset)

/** PageHeader: an h2 with optional info beside it and an action on the right, 16dp above content. */
@Composable
fun PageHeader(
    title: String,
    modifier: Modifier = Modifier,
    info: (@Composable RowScope.() -> Unit)? = null,
    action: (@Composable () -> Unit)? = null,
) {
    Row(
        modifier.fillMaxWidth().padding(bottom = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Row(Modifier.weight(1f), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(title, Modifier.weight(1f, fill = false), style = AppText.h2, color = AppTheme.colors.onGhost, maxLines = 1, overflow = TextOverflow.Ellipsis)
            info?.invoke(this)
        }
        // The site's `-my-2`: the 40dp button keeps its size without making the row taller.
        action?.let { Box(Modifier.overhangVertically(8.dp)) { it() } }
    }
}

/**
 * A negative block margin (`-my-*`): the content keeps its full height but takes [overhang] less
 * room above and below, spilling over its neighbours instead of pushing them apart.
 */
fun Modifier.overhangVertically(overhang: Dp): Modifier = layout { measurable, constraints ->
    val placeable = measurable.measure(constraints.copy(minHeight = 0, maxHeight = Constraints.Infinity))
    val overhangPx = overhang.roundToPx()
    layout(placeable.width, (placeable.height - 2 * overhangPx).coerceAtLeast(0)) { placeable.place(0, -overhangPx) }
}

/**
 * The round black (white) "+" the site uses as a page's primary action. Like the site's
 * `icon-classes="size-6"`, the plus is drawn at 24dp in the usual 40dp button.
 */
@Composable
fun AddButton(contentDescription: String, onClick: () -> Unit) =
    IconButton(Lucide.Plus, contentDescription, onClick, variant = ButtonVariant.Action, iconSize = 24.dp)

/** BaseEmptyState: an optional 40dp icon, an h3, a muted line and up to two buttons. */
@Composable
fun EmptyState(
    title: String?,
    modifier: Modifier = Modifier,
    message: String? = null,
    icon: LucideIcon? = null,
    primaryLabel: String? = null,
    onPrimary: (() -> Unit)? = null,
    secondaryLabel: String? = null,
    onSecondary: (() -> Unit)? = null,
) {
    val colors = AppTheme.colors
    Column(modifier.fillMaxWidth().padding(vertical = 48.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        icon?.let { Icon(it, null, Modifier.padding(bottom = 16.dp), size = 40.dp, tint = colors.onGhostMuted) }
        title?.let { Text(it, style = AppText.h3, color = colors.onGhost, textAlign = TextAlign.Center) }
        message?.let {
            Text(
                it, Modifier.widthIn(max = 384.dp).padding(top = 4.dp), style = AppText.base, color = colors.onGhostMuted,
                textAlign = TextAlign.Center,
            )
        }
        if (onPrimary != null || onSecondary != null) {
            Row(Modifier.padding(top = 24.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                if (onPrimary != null && primaryLabel != null) AppButton(onPrimary, variant = ButtonVariant.Action, text = primaryLabel)
                if (onSecondary != null && secondaryLabel != null) AppButton(onSecondary, text = secondaryLabel)
            }
        }
    }
}

/** The dashed panel the dashboard shows when a section has nothing in it. */
@Composable
fun DashedPanel(text: String, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    Box(
        modifier.fillMaxWidth().dashedBorder(colors.ghostBorder, app.schuldashboard.ui.theme.Radius.xl).padding(16.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(text, style = AppText.xs, color = colors.onGhostMuted, textAlign = TextAlign.Center)
    }
}

fun Modifier.dashedBorder(color: Color, radius: Dp): Modifier = drawBehind {
    val stroke = 1.dp.toPx()
    drawRoundRect(
        color,
        topLeft = Offset(stroke / 2, stroke / 2),
        size = androidx.compose.ui.geometry.Size(size.width - stroke, size.height - stroke),
        cornerRadius = androidx.compose.ui.geometry.CornerRadius(radius.toPx()),
        style = androidx.compose.ui.graphics.drawscope.Stroke(
            stroke, pathEffect = androidx.compose.ui.graphics.PathEffect.dashPathEffect(floatArrayOf(3.dp.toPx(), 3.dp.toPx())),
        ),
    )
}

/**
 * The header of the site's full-page settings views: a back arrow beside an h1 (or h2 for a
 * detail pane) and an optional muted subtitle, over a hairline.
 */
@Composable
fun SubPageHeader(
    title: String,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
    subtitle: String? = null,
    large: Boolean = true,
    action: (@Composable () -> Unit)? = null,
) {
    val colors = AppTheme.colors
    Column(modifier.fillMaxWidth().background(colors.canvas)) {
        Row(
            Modifier.fillMaxWidth().padding(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            IconButton(Lucide.ArrowLeft, stringResource(R.string.action_back), onBack)
            Column(Modifier.weight(1f)) {
                Text(title, style = if (large) AppText.h1 else AppText.h2, color = colors.onGhost, maxLines = 1, overflow = TextOverflow.Ellipsis)
                subtitle?.let {
                    Text(it, style = AppText.base, fontWeight = FontWeight.SemiBold, color = colors.onGhostMuted, maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
            }
            action?.invoke()
        }
        Divider()
    }
}

/**
 * BaseList as it looks on a phone: a full-bleed row with an icon slot and a label, pressed like
 * a hovered ghost button. [unread] shows a notification dot.
 */
@Composable
fun ListRow(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    unread: Boolean = false,
    icon: (@Composable () -> Unit)? = null,
    label: @Composable () -> Unit,
) {
    val colors = AppTheme.colors
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val background by animateColorAsState(if (pressed) colors.ghostHover else Color.Transparent, Motion.hover(), label = "bg")
    Row(
        modifier
            .fillMaxWidth()
            .background(background)
            .clickable(interaction, ripple(color = colors.onGhost), enabled, role = Role.Button, onClick = onClick)
            .padding(horizontal = 24.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        icon?.invoke()
        Box(Modifier.weight(1f)) { label() }
        if (unread) NotificationDot(12.dp)
    }
}

/** A labelled list row with a 40dp icon cell and a muted description, as in account settings. */
@Composable
fun NavRow(title: String, description: String?, icon: LucideIcon, onClick: () -> Unit, unread: Boolean = false) {
    val colors = AppTheme.colors
    ListRow(onClick, unread = unread, icon = {
        Box(Modifier.size(40.dp), contentAlignment = Alignment.Center) { Icon(icon, null, size = 24.dp, tint = colors.onGhost) }
    }) {
        Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(title, style = AppText.base, fontWeight = FontWeight.Medium, color = colors.onGhost)
            description?.let { Text(it, style = AppText.xs, color = colors.onGhostMuted) }
        }
    }
}

/** A section heading (the site's bare `h3`) with an optional muted description below. */
@Composable
fun Section(
    title: String,
    modifier: Modifier = Modifier,
    description: String? = null,
    titleColor: Color = AppTheme.colors.onGhost,
    content: @Composable () -> Unit = {},
) {
    Column(modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(title, style = AppText.h3, color = titleColor)
        description?.let { Text(it, style = AppText.sm.copy(lineHeight = AppText.sm.fontSize * 1.625f), color = AppTheme.colors.onGhostMuted) }
        content()
    }
}

/** A round pressable area like the header's avatar and group buttons (`rounded-full p-1`). */
fun Modifier.pillButton(onClick: () -> Unit): Modifier = this.clip(CircleShape).clickable(onClick = onClick)

