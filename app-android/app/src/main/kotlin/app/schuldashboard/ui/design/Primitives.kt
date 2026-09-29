package app.schuldashboard.ui.design

import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.keyframes
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathMeasure
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawOutline
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import app.schuldashboard.ui.theme.AppText
import app.schuldashboard.ui.theme.AppTheme
import app.schuldashboard.ui.theme.Radius
import app.schuldashboard.ui.theme.pulseSpec

/**
 * The site's `shadow-input`/`shadow-card` (0 1px 2px 5% black). Android's elevation shadows
 * fall off differently, so the soft 1px drop is drawn directly beneath the shape.
 */
fun Modifier.inputShadow(shape: Shape): Modifier = drawBehind {
    val outline = shape.createOutline(size, layoutDirection, this)
    val color = Color.Black.copy(alpha = 0.05f)
    val dy = 1.dp.toPx()
    for (spread in 0..1) {
        translate(0f, dy + spread * 0.5f.dp.toPx()) { drawOutline(outline, color.copy(alpha = color.alpha / (spread + 1))) }
    }
}

/**
 * `shadow-menu` (0 12px 24px -2px shadow-heavy). Android's own elevation shadow is the native
 * equivalent; tinting it with the token keeps it as faint in light mode and as deep in dark.
 */
fun Modifier.menuShadow(shape: Shape, color: Color): Modifier =
    shadow(16.dp, shape, clip = false, ambientColor = color, spotColor = color)

/** The site's BaseSpinner: an arc that grows and shrinks while the whole ring turns. */
@Composable
fun Spinner(size: Dp = 16.dp, color: Color = AppTheme.colors.onGhostMuted, strokeWidth: Dp = 2.dp, modifier: Modifier = Modifier) {
    val transition = rememberInfiniteTransition(label = "spinner")
    val rotation by transition.animateFloat(0f, 360f, infiniteRepeatable(tween(2200, easing = LinearEasing)), label = "rot")
    val dashEasing = CubicBezierEasing(0.4f, 0f, 0.2f, 1f)
    val dash by transition.animateFloat(
        1f, 1f,
        infiniteRepeatable(keyframes { durationMillis = 1600; 1f at 0 using dashEasing; 85f at 800 using dashEasing; 1f at 1600 }),
        label = "dash",
    )
    val offset by transition.animateFloat(
        0f, -100f,
        infiniteRepeatable(keyframes { durationMillis = 1600; 0f at 0 using dashEasing; -5f at 800 using dashEasing; -100f at 1600 }),
        label = "offset",
    )
    Canvas(modifier.size(size)) {
        val stroke = strokeWidth.toPx()
        val radius = (this.size.minDimension - stroke) / 2
        val circle = Path().apply {
            addOval(androidx.compose.ui.geometry.Rect(center, radius))
        }
        val measure = PathMeasure().apply { setPath(circle, false) }
        val length = measure.length
        // pathLength=100 in the SVG: dash values are percentages of the circumference.
        val start = ((-offset) / 100f * length) % length
        val arc = dash / 100f * length
        rotate(rotation) {
            val segment = Path()
            if (start + arc <= length) {
                measure.getSegment(start, start + arc, segment, true)
            } else {
                measure.getSegment(start, length, segment, true)
                measure.getSegment(0f, start + arc - length, segment, true)
            }
            drawPath(segment, color, style = Stroke(stroke, cap = StrokeCap.Round))
        }
    }
}

/** BaseSkeleton: a pulsing placeholder in `ghost-hover`. */
@Composable
fun Skeleton(modifier: Modifier = Modifier, shape: Shape = CircleShape, color: Color = AppTheme.colors.ghostHover) {
    val transition = rememberInfiniteTransition(label = "pulse")
    val alpha by transition.animateFloat(1f, 0.5f, pulseSpec(), label = "alpha")
    Box(modifier.graphicsLayer { this.alpha = alpha }.clip(shape).background(color))
}

/** A skeleton block like the dashboard's: `bg-surface-highlight rounded-xl animate-pulse`. */
@Composable
fun SkeletonBlock(height: Dp, modifier: Modifier = Modifier) =
    Skeleton(modifier.fillMaxWidth().height(height), RoundedCornerShape(Radius.xl), AppTheme.colors.surfaceHighlight)

/** A bordered surface: the site's card pattern (`bg-surface border border-ghost-border`). */
@Composable
fun Card(
    modifier: Modifier = Modifier,
    radius: Dp = Radius.xl,
    padding: PaddingValues = PaddingValues(16.dp),
    borderColor: Color = AppTheme.colors.ghostBorder,
    borderWidth: Dp = 1.dp,
    background: Color = AppTheme.colors.surface,
    shadow: Boolean = false,
    content: @Composable ColumnScope.() -> Unit,
) {
    val shape = RoundedCornerShape(radius)
    Column(
        modifier
            .then(if (shadow) Modifier.inputShadow(shape) else Modifier)
            .clip(shape)
            .background(background)
            .border(borderWidth, borderColor, shape)
            .padding(padding),
        content = content,
    )
}

/** NotificationDot: a small danger-coloured dot. */
@Composable
fun NotificationDot(size: Dp = 8.dp, modifier: Modifier = Modifier) {
    Box(modifier.size(size).clip(CircleShape).background(AppTheme.colors.danger))
}

/** The count pill beside page titles (`bg-ghost-hover` rounded, small bold number). */
@Composable
fun CountBadge(count: Int, modifier: Modifier = Modifier) {
    Box(
        modifier.clip(CircleShape).background(AppTheme.colors.ghostHover).padding(horizontal = 8.dp, vertical = 2.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(count.toString(), style = AppText.sm, fontWeight = FontWeight.SemiBold, color = AppTheme.colors.onGhostMuted)
    }
}

/** The 1px `border-ghost-border` rule used between list rows. */
@Composable
fun Divider(modifier: Modifier = Modifier, color: Color = AppTheme.colors.ghostBorder) {
    Box(modifier.fillMaxWidth().height(1.dp).background(color))
}
