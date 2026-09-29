package app.schuldashboard.ui.design

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.schuldashboard.R
import app.schuldashboard.ui.icons.Lucide
import app.schuldashboard.ui.theme.AppText
import app.schuldashboard.ui.theme.AppTheme
import app.schuldashboard.ui.theme.Motion
import app.schuldashboard.ui.theme.Radius

private val FoldIn = tween<androidx.compose.ui.unit.IntSize>(300, easing = Motion.Fold)
private val FoldFade = tween<Float>(300, easing = Motion.Fold)

/**
 * ItemCard, the site's task card: a 16dp-rounded surface with a 4dp inset. The title row holds
 * the checkbox, an 18sp heading and trailing actions; badges and body fold away when
 * [collapsed], the way a checked task tucks itself in.
 */
@Composable
fun ItemCard(
    title: String,
    modifier: Modifier = Modifier,
    collapsed: Boolean = false,
    highlighted: Boolean = false,
    checkbox: (@Composable () -> Unit)? = null,
    badges: (@Composable ColumnScope.() -> Unit)? = null,
    actions: (@Composable RowScope.() -> Unit)? = null,
    onMenu: (() -> Unit)? = null,
    hasBody: Boolean = false,
    body: (@Composable ColumnScope.() -> Unit)? = null,
) {
    val colors = AppTheme.colors
    val shape = RoundedCornerShape(Radius.xl)
    Column(
        modifier
            .fillMaxWidth()
            .inputShadow(shape)
            .clip(shape)
            .background(colors.surface)
            .border(if (highlighted) 2.dp else 1.dp, if (highlighted) colors.accent else colors.ghostBorder, shape)
            .padding(4.dp),
    ) {
        Row(verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Column(
                Modifier.weight(1f).padding(start = 8.dp, top = 8.dp, bottom = if (hasBody && !collapsed) 8.dp else 4.dp),
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    checkbox?.invoke()
                    Text(
                        title,
                        style = AppText.h4.copy(lineHeight = 24.sp),
                        color = colors.onGhost,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                if (badges != null) {
                    AnimatedVisibility(
                        !collapsed,
                        enter = expandVertically(FoldIn) + fadeIn(FoldFade),
                        exit = shrinkVertically(FoldIn) + fadeOut(FoldFade),
                    ) {
                        Column(Modifier.padding(top = 4.dp), content = badges)
                    }
                }
            }
            actions?.invoke(this)
            onMenu?.let { IconButton(Lucide.Ellipsis, stringResource(R.string.a11y_more), it, size = ButtonSize.Sm) }
        }
        if (body != null) {
            AnimatedVisibility(
                !collapsed,
                enter = expandVertically(FoldIn) + fadeIn(FoldFade),
                exit = shrinkVertically(FoldIn) + fadeOut(FoldFade),
            ) {
                Column(Modifier.padding(start = 8.dp, end = 8.dp, bottom = 4.dp), content = body)
            }
        }
    }
}

/** The muted "Subject • date" line under a card title. */
@Composable
fun BadgeLine(text: String) {
    Text(text, style = AppText.base, color = AppTheme.colors.onGhostMuted)
}
