package app.schuldashboard.ui.design

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.snap
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathMeasure
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.clipPath
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.PathParser
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.schuldashboard.ui.theme.AppText
import app.schuldashboard.ui.theme.AppTheme
import app.schuldashboard.ui.theme.Motion
import app.schuldashboard.ui.theme.Radius
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch

private val CheckPath: Path = PathParser().parsePathString("M20 6 9 17l-5-5").toPath()

/**
 * BaseCheckbox. Checking grows the fill out of the centre as a widening circle and then draws
 * the tick along its stroke; unchecking snaps back, as on the site. [round] is the private
 * list's circular box, which is covered once the circle reaches its edge.
 */
@Composable
fun Checkbox(
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    round: Boolean = false,
    label: (@Composable RowScope.() -> Unit)? = null,
) {
    val colors = AppTheme.colors
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val border by animateColorAsState(
        if (checked || pressed) colors.action else colors.onGhostMuted, tween(300, easing = Motion.EaseOut), label = "border",
    )
    val halo by animateFloatAsState(if (pressed) 1f else 0f, tween(150, easing = Motion.EaseInOut), label = "halo")
    val fill = remember { Animatable(if (checked) 1f else 0f) }
    val tick = remember { Animatable(if (checked) 1f else 0f) }
    LaunchedEffect(checked) {
        if (checked) {
            if (fill.value < 1f) {
                fill.snapTo(0f)
                tick.snapTo(0f)
                coroutineScope {
                    launch { fill.animateTo(1f, tween(400, easing = Motion.Check)) }
                    launch { tick.animateTo(1f, tween(250, 50, Motion.Check)) }
                }
            }
        } else {
            fill.animateTo(0f, snap())
            tick.animateTo(0f, snap())
        }
    }

    Row(
        modifier
            .alpha(if (enabled) 1f else 0.5f)
            .toggleable(checked, interaction, null, enabled, Role.Checkbox, onCheckedChange),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.Top,
    ) {
        Box(Modifier.size(18.dp), contentAlignment = Alignment.Center) {
            // The pressed halo, the site's hover circle behind the box.
            Box(
                Modifier.size(34.dp).graphicsLayer {
                    alpha = halo
                    scaleX = 0.5f + halo * 0.5f
                    scaleY = scaleX
                }.clip(CircleShape).background(colors.surfaceHover),
            )
            val shapeRadius = if (round) 9.dp else Radius.sm
            Canvas(Modifier.size(18.dp)) {
                val stroke = 2.dp.toPx()
                val r = shapeRadius.toPx()
                val side = size.width
                if (fill.value > 0f) {
                    val maxRadius = if (round) side / 2 else side
                    val circle = Path().apply {
                        addOval(androidx.compose.ui.geometry.Rect(center, (0.2f + 0.8f * fill.value) * maxRadius))
                    }
                    clipPath(circle) {
                        drawRoundRect(colors.action, cornerRadius = CornerRadius(if (round) r else 1.dp.toPx().coerceAtLeast(r - stroke)))
                    }
                }
                drawRoundRect(
                    border,
                    topLeft = Offset(stroke / 2, stroke / 2),
                    size = Size(side - stroke, side - stroke),
                    cornerRadius = CornerRadius((r - stroke / 2).coerceAtLeast(0f)),
                    style = Stroke(stroke),
                )
                if (tick.value > 0f) {
                    val iconSize = 16.dp.toPx()
                    val measure = PathMeasure().apply { setPath(CheckPath, false) }
                    val segment = Path()
                    measure.getSegment(0f, measure.length * tick.value, segment, true)
                    translate((side - iconSize) / 2, (side - iconSize) / 2) {
                        scale(iconSize / 24f, Offset.Zero) {
                            drawPath(segment, colors.onAction, style = Stroke(3f, cap = StrokeCap.Round, join = StrokeJoin.Round))
                        }
                    }
                }
            }
        }
        label?.invoke(this)
    }
}

/** A checkbox followed by its label in the site's `text-sm/[18px]`. */
@Composable
fun LabeledCheckbox(checked: Boolean, onCheckedChange: (Boolean) -> Unit, text: String, modifier: Modifier = Modifier) {
    Checkbox(checked, onCheckedChange, modifier) {
        Text(text, Modifier.weight(1f), style = AppText.sm.copy(lineHeight = 18.sp), color = AppTheme.colors.onGhost)
    }
}

/**
 * BaseToggle: a 56×24 track in accent or ghost grey carrying a white 32×20 pill thumb, which
 * slides over and squeezes to 80% while pressed.
 */
@Composable
fun Toggle(checked: Boolean, onCheckedChange: ((Boolean) -> Unit)?, modifier: Modifier = Modifier, enabled: Boolean = true) {
    val colors = AppTheme.colors
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val track by animateColorAsState(if (checked) colors.accent else colors.onGhostSubtle, tween(150, easing = Motion.EaseInOut), label = "track")
    val offset by animateFloatAsState(if (checked) 1f else 0f, tween(150, easing = Motion.EaseInOut), label = "thumb")
    val squeeze by animateFloatAsState(if (pressed) 0.8f else 1f, tween(200, easing = Motion.EaseInOut), label = "press")
    Box(
        modifier
            .alpha(if (enabled) 1f else 0.5f)
            .then(
                if (onCheckedChange != null) Modifier.toggleable(checked, interaction, null, enabled, Role.Switch, onCheckedChange)
                else Modifier,
            )
            .size(56.dp, 24.dp)
            .clip(CircleShape)
            .background(track)
            .padding(2.dp),
    ) {
        Box(
            Modifier
                .graphicsLayer {
                    translationX = offset * 20.dp.toPx()
                    scaleX = squeeze
                    scaleY = squeeze
                }
                .size(32.dp, 20.dp)
                .clip(CircleShape)
                .background(Color.White),
        )
    }
}
