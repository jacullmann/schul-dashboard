package app.schuldashboard.ui.icons

import androidx.compose.foundation.layout.size
import androidx.compose.material3.LocalContentColor
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.PathParser
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * A Lucide glyph: stroked 24×24 paths with round caps and joins. Vectors are built on first use
 * and kept per stroke width, since the site draws a few icons thinner (the tab bar) or filled
 * (a pinned task's pin).
 */
class LucideIcon(private vararg val paths: String) {
    private val vectors = HashMap<Long, ImageVector>()

    fun vector(strokeWidth: Float = 2f, filled: Boolean = false): ImageVector {
        val key = strokeWidth.toRawBits().toLong() * 2 + if (filled) 1 else 0
        return vectors.getOrPut(key) {
            ImageVector.Builder(defaultWidth = 24.dp, defaultHeight = 24.dp, viewportWidth = 24f, viewportHeight = 24f)
                .apply {
                    paths.forEach { data ->
                        addPath(
                            pathData = PathParser().parsePathString(data).toNodes(),
                            fill = if (filled) SolidColor(Color.Black) else null,
                            stroke = SolidColor(Color.Black),
                            strokeLineWidth = strokeWidth,
                            strokeLineCap = StrokeCap.Round,
                            strokeLineJoin = StrokeJoin.Round,
                        )
                    }
                }
                .build()
        }
    }
}

/** Draws [icon] tinted like the site's `currentColor` icons; [size] matches their `:size` prop. */
@Composable
fun Icon(
    icon: LucideIcon,
    contentDescription: String?,
    modifier: Modifier = Modifier,
    size: Dp = 24.dp,
    tint: Color = LocalContentColor.current,
    strokeWidth: Float = 2f,
    filled: Boolean = false,
) {
    androidx.compose.material3.Icon(icon.vector(strokeWidth, filled), contentDescription, modifier.size(size), tint)
}
