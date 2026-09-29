package app.schuldashboard.ui.design

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.graphics.vector.PathParser
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.schuldashboard.ui.theme.InterFamily

private const val TOP_BAND = "M0,160 0,475 1024,472.6 1024,159.9 853.5,44.1 173.1,43.7Z"
private const val PAGE = "M0,352V896A128,128 0 0 0 128,1024H896A128,128 0 0 0 1024,896V352a32,32 0 0 0 -32,-32h-64a32,32 0 0 0 -32,32v32a48,48 0 0 1 -48,48 48,48 0 0 1 -48,-48V352A32,32 0 0 0 768,320H256a32,32 0 0 0 -32,32v32a48,48 0 0 1 -48,48 48,48 0 0 1 -48,-48V352A32,32 0 0 0 96,320H32A32,32 0 0 0 0,352Z"
private const val BINDING = "m0,128v64A32,32 0 0 0 32,224h64a32,32 0 0 0 32,-32v-32a48,48 0 0 1 48,-48 48,48 0 0 1 48,48v32a32,32 0 0 0 32,32h512a32,32 0 0 0 32,-32v-32a48,48 0 0 1 48,-48 48,48 0 0 1 48,48v32a32,32 0 0 0 32,32h64a32,32 0 0 0 32,-32V128A128,128 0 0 0 896,0H128A128,128 0 0 0 0,128Z"

/** The site's calendar logo (AppLogo.vue): a "30" page under a bismuth-gradient binding. */
@Composable
fun AppLogo(size: Dp = 50.dp, modifier: Modifier = Modifier) {
    val paths = remember {
        listOf(TOP_BAND, PAGE, BINDING).map { PathParser().parsePathString(it).toPath() }
    }
    val measurer = rememberTextMeasurer()
    val gradient = remember {
        Brush.linearGradient(
            0.084f to Color(0xFFFFA91A), 0.384f to Color(0xFFFF335A), 0.691f to Color(0xFFAF00FF), 1f to Color(0xFF5600FF),
            start = Offset(58.5f, -160.8f), end = Offset(1114.1f, 333.7f),
        )
    }
    val onyx = Color(0xFF0F0F0F)
    Canvas(modifier.size(size)) {
        scale(this.size.width / 1024f, androidx.compose.ui.geometry.Offset.Zero) {
            drawPath(paths[0], onyx)
            drawPath(paths[1], Color.White)
            drawPath(paths[2], gradient)
            val layout = measurer.measure(
                "30",
                TextStyle(fontFamily = InterFamily, fontWeight = FontWeight.Black, fontSize = (560 / density / fontScale).sp),
            )
            drawText(layout, onyx, Offset(512f - layout.size.width / 2f, 880f - layout.firstBaseline))
        }
    }
}
