package com.fab.wab.customer.designsystem.icons

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathFillType
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.path
import androidx.compose.ui.unit.dp

object AppIcons {

    val Add: ImageVector = ImageVector.Builder(
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        path(
            fill = SolidColor(Color.Black),
            pathFillType = PathFillType.NonZero,
        ) {
            moveTo(19f, 13f)
            horizontalLineTo(13f)
            verticalLineTo(19f)
            horizontalLineTo(11f)
            verticalLineTo(13f)
            horizontalLineTo(5f)
            verticalLineTo(11f)
            horizontalLineTo(11f)
            verticalLineTo(5f)
            horizontalLineTo(13f)
            verticalLineTo(11f)
            horizontalLineTo(19f)
            verticalLineTo(13f)
            close()
        }
    }.build()

    val ArrowBack: ImageVector = ImageVector.Builder(
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        path(
            fill = SolidColor(Color.Black),
            pathFillType = PathFillType.NonZero,
        ) {
            moveTo(20f, 11f)
            horizontalLineTo(7.83f)
            lineTo(13.42f, 5.41f)
            lineTo(12f, 4f)
            lineTo(4f, 12f)
            lineTo(12f, 20f)
            lineTo(13.41f, 18.59f)
            lineTo(7.83f, 13f)
            horizontalLineTo(20f)
            verticalLineTo(11f)
            close()
        }
    }.build()

    val ArrowForward: ImageVector = ImageVector.Builder(
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        path(
            fill = SolidColor(Color.Black),
            pathFillType = PathFillType.NonZero,
        ) {
            moveTo(12f, 4f)
            lineTo(10.59f, 5.41f)
            lineTo(16.17f, 11f)
            horizontalLineTo(4f)
            verticalLineTo(13f)
            horizontalLineTo(16.17f)
            lineTo(10.59f, 18.59f)
            lineTo(12f, 20f)
            lineTo(20f, 12f)
            lineTo(12f, 4f)
            close()
        }
    }.build()

    val CalendarMonth: ImageVector = ImageVector.Builder(
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        path(
            fill = SolidColor(Color.Black),
            pathFillType = PathFillType.NonZero,
        ) {
            moveTo(19f, 4f)
            horizontalLineTo(18f)
            verticalLineTo(2f)
            horizontalLineTo(16f)
            verticalLineTo(4f)
            horizontalLineTo(8f)
            verticalLineTo(2f)
            horizontalLineTo(6f)
            verticalLineTo(4f)
            horizontalLineTo(5f)
            curveTo(3.89f, 4f, 3.01f, 4.9f, 3.01f, 6f)
            lineTo(3f, 20f)
            curveTo(3f, 21.1f, 3.89f, 22f, 5f, 22f)
            horizontalLineTo(19f)
            curveTo(20.11f, 22f, 21f, 21.1f, 21f, 20f)
            verticalLineTo(6f)
            curveTo(21f, 4.9f, 20.11f, 4f, 19f, 4f)
            close()
            moveTo(19f, 20f)
            horizontalLineTo(5f)
            verticalLineTo(9f)
            horizontalLineTo(19f)
            verticalLineTo(20f)
            close()
        }
    }.build()

    val Call: ImageVector = ImageVector.Builder(
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        path(
            fill = SolidColor(Color.Black),
            pathFillType = PathFillType.NonZero,
        ) {
            moveTo(6.62f, 10.79f)
            curveTo(8.06f, 13.62f, 10.38f, 15.94f, 13.21f, 17.38f)
            lineTo(15.41f, 15.18f)
            curveTo(15.69f, 14.9f, 16.08f, 14.82f, 16.43f, 14.94f)
            curveTo(17.55f, 15.31f, 18.75f, 15.5f, 20f, 15.5f)
            curveTo(20.55f, 15.5f, 21f, 15.95f, 21f, 16.5f)
            verticalLineTo(20f)
            curveTo(21f, 20.55f, 20.55f, 21f, 20f, 21f)
            curveTo(10.61f, 21f, 3f, 13.39f, 3f, 4f)
            curveTo(3f, 3.45f, 3.45f, 3f, 4f, 3f)
            horizontalLineTo(7.5f)
            curveTo(8.05f, 3f, 8.5f, 3.45f, 8.5f, 4f)
            curveTo(8.5f, 5.25f, 8.69f, 6.45f, 9.06f, 7.57f)
            curveTo(9.18f, 7.92f, 9.1f, 8.31f, 8.82f, 8.59f)
            lineTo(6.62f, 10.79f)
            close()
        }
    }.build()

    val Check: ImageVector = ImageVector.Builder(
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        path(
            fill = SolidColor(Color.Black),
            pathFillType = PathFillType.NonZero,
        ) {
            moveTo(9f, 16.17f)
            lineTo(4.83f, 12f)
            lineTo(3.41f, 13.41f)
            lineTo(9f, 19f)
            lineTo(21f, 7f)
            lineTo(19.59f, 5.59f)
            lineTo(9f, 16.17f)
            close()
        }
    }.build()

    val CheckCircle: ImageVector = ImageVector.Builder(
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        path(
            fill = SolidColor(Color.Black),
            pathFillType = PathFillType.NonZero,
        ) {
            moveTo(12f, 2f)
            curveTo(6.48f, 2f, 2f, 6.48f, 2f, 12f)
            reflectiveCurveTo(6.48f, 22f, 12f, 22f)
            reflectiveCurveTo(22f, 17.52f, 22f, 12f)
            reflectiveCurveTo(17.52f, 2f, 12f, 2f)
            close()
            moveTo(10f, 17f)
            lineTo(5f, 12f)
            lineTo(6.41f, 10.59f)
            lineTo(10f, 14.17f)
            lineTo(17.59f, 6.58f)
            lineTo(19f, 8f)
            lineTo(10f, 17f)
            close()
        }
    }.build()

    val Close: ImageVector = ImageVector.Builder(
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        path(
            fill = SolidColor(Color.Black),
            pathFillType = PathFillType.NonZero,
        ) {
            moveTo(19f, 6.41f)
            lineTo(17.59f, 5f)
            lineTo(12f, 10.59f)
            lineTo(6.41f, 5f)
            lineTo(5f, 6.41f)
            lineTo(10.59f, 12f)
            lineTo(5f, 17.59f)
            lineTo(6.41f, 19f)
            lineTo(12f, 13.41f)
            lineTo(17.59f, 19f)
            lineTo(19f, 17.59f)
            lineTo(13.41f, 12f)
            close()
        }
    }.build()

    val CloudOff: ImageVector = ImageVector.Builder(
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        path(
            fill = SolidColor(Color.Black),
            pathFillType = PathFillType.NonZero,
        ) {
            moveTo(19.35f, 10.04f)
            curveTo(18.67f, 6.59f, 15.64f, 4f, 12f, 4f)
            curveTo(9.11f, 4f, 6.6f, 5.64f, 5.35f, 8.04f)
            lineTo(2f, 8f)
            verticalLineTo(16f)
            horizontalLineTo(6f)
            curveTo(6.67f, 16.67f, 7.67f, 17f, 8.5f, 17f)
            curveTo(9.33f, 17f, 10.33f, 16.67f, 11f, 16f)
            horizontalLineTo(14.5f)
            curveTo(15.17f, 16.67f, 16.17f, 17f, 17f, 17f)
            curveTo(17.83f, 17f, 18.83f, 16.67f, 19.5f, 16f)
            lineTo(22.1f, 19f)
            lineTo(20.7f, 20.4f)
            lineTo(19.35f, 10.04f)
            close()
            moveTo(3f, 5.27f)
            curveTo(3.39f, 4.56f, 4.4f, 4f, 5.5f, 4f)
            curveTo(6.6f, 4f, 7.61f, 4.56f, 8f, 5.27f)
            lineTo(10.22f, 10f)
            horizontalLineTo(6f)
            curveTo(4.89f, 10f, 3.9f, 10.56f, 3.5f, 11.27f)
            lineTo(3f, 10.75f)
            verticalLineTo(5.27f)
            close()
        }
    }.build()

    val Delete: ImageVector = ImageVector.Builder(
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        path(
            fill = SolidColor(Color.Black),
            pathFillType = PathFillType.NonZero,
        ) {
            moveTo(6f, 19f)
            curveTo(6f, 20.1f, 6.9f, 21f, 8f, 21f)
            horizontalLineTo(16f)
            curveTo(17.1f, 21f, 18f, 20.1f, 18f, 19f)
            verticalLineTo(7f)
            horizontalLineTo(6f)
            verticalLineTo(19f)
            close()
            moveTo(8f, 9f)
            horizontalLineTo(16f)
            verticalLineTo(19f)
            horizontalLineTo(8f)
            verticalLineTo(9f)
            close()
            moveTo(15.5f, 4f)
            lineTo(14.5f, 3f)
            horizontalLineTo(9.5f)
            lineTo(8.5f, 4f)
            horizontalLineTo(5f)
            verticalLineTo(6f)
            horizontalLineTo(19f)
            verticalLineTo(4f)
            horizontalLineTo(15.5f)
            close()
        }
    }.build()

    val Edit: ImageVector = ImageVector.Builder(
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        path(
            fill = SolidColor(Color.Black),
            pathFillType = PathFillType.NonZero,
        ) {
            moveTo(3f, 17.25f)
            verticalLineTo(21f)
            horizontalLineTo(6.75f)
            lineTo(17.81f, 9.94f)
            lineTo(14.06f, 6.19f)
            lineTo(3f, 17.25f)
            close()
            moveTo(20.71f, 7.04f)
            curveTo(21.1f, 6.65f, 21.1f, 6.02f, 20.71f, 5.63f)
            reflectiveCurveTo(19.73f, 5.25f, 19.34f, 5.63f)
            lineTo(18.34f, 6.63f)
            lineTo(20.37f, 8.66f)
            lineTo(21.37f, 7.66f)
            curveTo(21.76f, 7.26f, 21.76f, 6.64f, 21.37f, 6.25f)
            lineTo(20.71f, 7.04f)
            close()
        }
    }.build()

    val Email: ImageVector = ImageVector.Builder(
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        path(
            fill = SolidColor(Color.Black),
            pathFillType = PathFillType.NonZero,
        ) {
            moveTo(20f, 4f)
            horizontalLineTo(4f)
            curveTo(2.9f, 4f, 2.01f, 4.9f, 2.01f, 6f)
            lineTo(2f, 18f)
            curveTo(2f, 19.1f, 2.9f, 20f, 4f, 20f)
            horizontalLineTo(20f)
            curveTo(21.1f, 20f, 22f, 19.1f, 22f, 18f)
            verticalLineTo(6f)
            curveTo(22f, 4.9f, 21.1f, 4f, 20f, 4f)
            close()
            moveTo(20f, 8f)
            horizontalLineTo(4f)
            lineTo(12f, 13f)
            lineTo(20f, 8f)
            close()
        }
    }.build()

    val Error: ImageVector = ImageVector.Builder(
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        path(
            fill = SolidColor(Color.Black),
            pathFillType = PathFillType.NonZero,
        ) {
            moveTo(12f, 2f)
            curveTo(6.48f, 2f, 2f, 6.48f, 2f, 12f)
            reflectiveCurveTo(6.48f, 22f, 12f, 22f)
            reflectiveCurveTo(22f, 17.52f, 22f, 12f)
            reflectiveCurveTo(17.52f, 2f, 12f, 2f)
            close()
            moveTo(13f, 17f)
            horizontalLineTo(11f)
            verticalLineTo(15f)
            horizontalLineTo(13f)
            verticalLineTo(17f)
            close()
            moveTo(13f, 13f)
            horizontalLineTo(11f)
            verticalLineTo(7f)
            horizontalLineTo(13f)
            verticalLineTo(13f)
            close()
        }
    }.build()

    val ExitToApp: ImageVector = ImageVector.Builder(
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        path(
            fill = SolidColor(Color.Black),
            pathFillType = PathFillType.NonZero,
        ) {
            moveTo(10.09f, 15.59f)
            lineTo(11.5f, 17f)
            lineTo(16.5f, 12f)
            lineTo(11.5f, 7f)
            lineTo(10.09f, 8.41f)
            lineTo(13.67f, 12f)
            lineTo(10.09f, 15.59f)
            close()
            moveTo(17f, 11f)
            verticalLineTo(13f)
            horizontalLineTo(7f)
            verticalLineTo(11f)
            horizontalLineTo(17f)
            close()
        }
    }.build()

    val ExpandLess: ImageVector = ImageVector.Builder(
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        path(
            fill = SolidColor(Color.Black),
            pathFillType = PathFillType.NonZero,
        ) {
            moveTo(12f, 8f)
            lineTo(6.41f, 13.59f)
            lineTo(7.83f, 15f)
            lineTo(12f, 10.83f)
            lineTo(16.17f, 15f)
            lineTo(17.58f, 13.59f)
            lineTo(12f, 8f)
            close()
        }
    }.build()

    val ExpandMore: ImageVector = ImageVector.Builder(
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        path(
            fill = SolidColor(Color.Black),
            pathFillType = PathFillType.NonZero,
        ) {
            moveTo(16.59f, 8.59f)
            lineTo(12f, 13.17f)
            lineTo(7.41f, 8.59f)
            lineTo(6f, 10f)
            lineTo(12f, 16f)
            lineTo(18f, 10f)
            lineTo(16.59f, 8.59f)
            close()
        }
    }.build()

    val Favorite: ImageVector = ImageVector.Builder(
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        path(
            fill = SolidColor(Color.Black),
            pathFillType = PathFillType.NonZero,
        ) {
            moveTo(12f, 21.35f)
            lineTo(10.55f, 20.03f)
            curveTo(5.4f, 15.36f, 2f, 12.27f, 2f, 8.5f)
            curveTo(2f, 5.41f, 4.42f, 3f, 7.5f, 3f)
            curveTo(9.24f, 3f, 10.91f, 3.81f, 12f, 5.08f)
            curveTo(13.09f, 3.81f, 14.76f, 3f, 16.5f, 3f)
            curveTo(19.58f, 3f, 22f, 5.41f, 22f, 8.5f)
            curveTo(22f, 12.27f, 18.6f, 15.36f, 13.45f, 20.03f)
            lineTo(12f, 21.35f)
            close()
        }
    }.build()

    val FilterList: ImageVector = ImageVector.Builder(
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        path(
            fill = SolidColor(Color.Black),
            pathFillType = PathFillType.NonZero,
        ) {
            moveTo(10f, 18f)
            horizontalLineTo(14f)
            verticalLineTo(16f)
            horizontalLineTo(10f)
            verticalLineTo(18f)
            close()
            moveTo(3f, 6f)
            verticalLineTo(8f)
            horizontalLineTo(21f)
            verticalLineTo(6f)
            horizontalLineTo(3f)
            close()
            moveTo(6f, 13f)
            horizontalLineTo(18f)
            verticalLineTo(11f)
            horizontalLineTo(6f)
            verticalLineTo(13f)
            close()
        }
    }.build()

    val Home: ImageVector = ImageVector.Builder(
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        path(
            fill = SolidColor(Color.Black),
            pathFillType = PathFillType.NonZero,
        ) {
            moveTo(10f, 20f)
            verticalLineTo(14f)
            horizontalLineTo(14f)
            verticalLineTo(20f)
            horizontalLineTo(19f)
            verticalLineTo(12f)
            horizontalLineTo(22f)
            lineTo(12f, 3f)
            lineTo(2f, 12f)
            horizontalLineTo(5f)
            verticalLineTo(20f)
            close()
        }
    }.build()

    val Info: ImageVector = ImageVector.Builder(
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        path(
            fill = SolidColor(Color.Black),
            pathFillType = PathFillType.NonZero,
        ) {
            moveTo(12f, 2f)
            curveTo(6.48f, 2f, 2f, 6.48f, 2f, 12f)
            reflectiveCurveTo(6.48f, 22f, 12f, 22f)
            reflectiveCurveTo(22f, 17.52f, 22f, 12f)
            reflectiveCurveTo(17.52f, 2f, 12f, 2f)
            close()
            moveTo(11f, 17f)
            verticalLineTo(11f)
            horizontalLineTo(13f)
            verticalLineTo(17f)
            horizontalLineTo(11f)
            close()
            moveTo(11f, 9f)
            horizontalLineTo(13f)
            verticalLineTo(7f)
            horizontalLineTo(11f)
            verticalLineTo(9f)
            close()
        }
    }.build()

    val Lock: ImageVector = ImageVector.Builder(
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        path(
            fill = SolidColor(Color.Black),
            pathFillType = PathFillType.NonZero,
        ) {
            moveTo(18f, 8f)
            horizontalLineTo(17f)
            verticalLineTo(6f)
            curveTo(17f, 3.65f, 15.35f, 2f, 13f, 2f)
            curveTo(10.65f, 2f, 9f, 3.65f, 9f, 6f)
            verticalLineTo(8f)
            horizontalLineTo(8f)
            curveTo(6.9f, 8f, 6f, 8.9f, 6f, 10f)
            verticalLineTo(20f)
            curveTo(6f, 21.1f, 6.9f, 22f, 8f, 22f)
            horizontalLineTo(18f)
            curveTo(19.1f, 22f, 20f, 21.1f, 20f, 20f)
            verticalLineTo(10f)
            curveTo(20f, 8.9f, 19.1f, 8f, 18f, 8f)
            close()
            moveTo(15f, 8f)
            verticalLineTo(6f)
            curveTo(15f, 4.34f, 13.66f, 3f, 12f, 3f)
            curveTo(10.34f, 3f, 9f, 4.34f, 9f, 6f)
            verticalLineTo(8f)
            horizontalLineTo(15f)
            close()
            moveTo(12f, 17f)
            curveTo(13.1f, 17f, 14f, 16.1f, 14f, 15f)
            curveTo(14f, 13.9f, 13.1f, 13f, 12f, 13f)
            curveTo(10.9f, 13f, 10f, 13.9f, 10f, 15f)
            curveTo(10f, 16.1f, 10.9f, 17f, 12f, 17f)
            close()
        }
    }.build()

    val Menu: ImageVector = ImageVector.Builder(
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        path(
            fill = SolidColor(Color.Black),
            pathFillType = PathFillType.NonZero,
        ) {
            moveTo(3f, 18f)
            horizontalLineTo(21f)
            verticalLineTo(20f)
            horizontalLineTo(3f)
            verticalLineTo(18f)
            close()
            moveTo(3f, 13f)
            horizontalLineTo(21f)
            verticalLineTo(11f)
            horizontalLineTo(3f)
            verticalLineTo(13f)
            close()
            moveTo(3f, 6f)
            verticalLineTo(8f)
            horizontalLineTo(21f)
            verticalLineTo(6f)
            horizontalLineTo(3f)
            close()
        }
    }.build()

    val MoreVert: ImageVector = ImageVector.Builder(
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        path(
            fill = SolidColor(Color.Black),
            pathFillType = PathFillType.NonZero,
        ) {
            moveTo(12f, 8f)
            curveTo(13.1f, 8f, 14f, 7.1f, 14f, 6f)
            curveTo(14f, 4.9f, 13.1f, 4f, 12f, 4f)
            curveTo(10.9f, 4f, 10f, 4.9f, 10f, 6f)
            curveTo(10f, 7.1f, 10.9f, 8f, 12f, 8f)
            close()
            moveTo(12f, 14f)
            curveTo(13.1f, 14f, 14f, 13.1f, 14f, 12f)
            curveTo(14f, 10.9f, 13.1f, 10f, 12f, 10f)
            curveTo(10.9f, 10f, 10f, 10.9f, 10f, 12f)
            curveTo(10f, 13.1f, 10.9f, 14f, 12f, 14f)
            close()
            moveTo(12f, 20f)
            curveTo(13.1f, 20f, 14f, 19.1f, 14f, 18f)
            curveTo(14f, 16.9f, 13.1f, 16f, 12f, 16f)
            curveTo(10.9f, 16f, 10f, 16.9f, 10f, 18f)
            curveTo(10f, 19.1f, 10.9f, 20f, 12f, 20f)
            close()
        }
    }.build()

    val Notifications: ImageVector = ImageVector.Builder(
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        path(
            fill = SolidColor(Color.Black),
            pathFillType = PathFillType.NonZero,
        ) {
            moveTo(12f, 22f)
            curveTo(13.1f, 22f, 14f, 21.1f, 14f, 20f)
            horizontalLineTo(10f)
            curveTo(10f, 21.1f, 10.9f, 22f, 12f, 22f)
            close()
            moveTo(18f, 16f)
            verticalLineTo(11f)
            curveTo(18f, 7.93f, 15.64f, 5.36f, 12.75f, 4.68f)
            lineTo(12.5f, 4.61f)
            verticalLineTo(2.5f)
            horizontalLineTo(11.5f)
            verticalLineTo(4.61f)
            curveTo(8.36f, 5.36f, 6f, 7.93f, 6f, 11f)
            verticalLineTo(16f)
            lineTo(4f, 18f)
            verticalLineTo(19f)
            horizontalLineTo(20f)
            verticalLineTo(18f)
            lineTo(18f, 16f)
            close()
        }
    }.build()

    val Person: ImageVector = ImageVector.Builder(
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        path(
            fill = SolidColor(Color.Black),
            pathFillType = PathFillType.NonZero,
        ) {
            moveTo(12f, 12f)
            curveTo(14.21f, 12f, 16f, 10.21f, 16f, 8f)
            reflectiveCurveTo(14.21f, 4f, 12f, 4f)
            reflectiveCurveTo(8f, 5.79f, 8f, 8f)
            reflectiveCurveTo(9.79f, 12f, 12f, 12f)
            close()
            moveTo(12f, 14f)
            curveTo(8.67f, 14f, 6f, 16.67f, 6f, 20f)
            horizontalLineTo(18f)
            curveTo(18f, 16.67f, 15.33f, 14f, 12f, 14f)
            close()
        }
    }.build()

    val Phone: ImageVector = Call

    val Plus: ImageVector = Add

    val Refresh: ImageVector = ImageVector.Builder(
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        path(
            fill = SolidColor(Color.Black),
            pathFillType = PathFillType.NonZero,
        ) {
            moveTo(17.65f, 6.35f)
            curveTo(16.2f, 4.9f, 14.21f, 4f, 12f, 4f)
            curveTo(7.58f, 4f, 4.01f, 7.58f, 4.01f, 12f)
            curveTo(4.01f, 16.42f, 7.58f, 19.99f, 12f, 19.99f)
            curveTo(15.73f, 19.99f, 18.84f, 17.87f, 20.1f, 14.28f)
            lineTo(17.65f, 14.28f)
            verticalLineTo(19f)
            horizontalLineTo(21f)
            verticalLineTo(12f)
            horizontalLineTo(13f)
            verticalLineTo(16.65f)
            curveTo(13f, 17.04f, 12.91f, 17.41f, 12.74f, 17.74f)
            curveTo(12.38f, 18.42f, 11.66f, 18.86f, 10.85f, 18.86f)
            curveTo(9.68f, 18.86f, 8.73f, 18f, 8.64f, 16.85f)
            lineTo(4.64f, 16.85f)
            curveTo(4.62f, 18.68f, 6.05f, 20.13f, 7.88f, 20.13f)
            curveTo(9.56f, 20.13f, 10.92f, 18.94f, 11.15f, 17.28f)
            curveTo(11.23f, 16.55f, 11.64f, 15.92f, 12.23f, 15.47f)
            curveTo(13.33f, 14.67f, 14.1f, 13.42f, 14.1f, 12f)
            curveTo(14.1f, 9.79f, 12.96f, 7.83f, 10.95f, 7.05f)
            curveTo(10.63f, 6.93f, 10.32f, 6.93f, 10f, 6.93f)
            curveTo(9.05f, 6.93f, 8.17f, 7.45f, 7.57f, 8.33f)
            lineTo(6.22f, 6.98f)
            curveTo(7.15f, 5.71f, 8.49f, 4.88f, 10f, 4.88f)
            curveTo(12.21f, 4.88f, 14.17f, 6.02f, 14.95f, 8.03f)
            curveTo(15.07f, 8.35f, 15.07f, 8.68f, 15.07f, 9f)
            curveTo(15.07f, 9.95f, 14.55f, 10.83f, 13.67f, 11.43f)
            curveTo(12.83f, 11.98f, 11.75f, 12.23f, 10.65f, 12.23f)
            curveTo(8.96f, 12.23f, 7.46f, 11.17f, 6.97f, 9.55f)
            curveTo(6.9f, 9.33f, 6.86f, 9.1f, 6.86f, 8.87f)
            curveTo(6.86f, 7.31f, 8.04f, 6.02f, 9.6f, 5.92f)
            lineTo(9.61f, 5.92f)
            curveTo(10.05f, 5.89f, 10.46f, 6.03f, 10.8f, 6.28f)
            curveTo(11.15f, 6.53f, 11.41f, 6.89f, 11.53f, 7.31f)
            curveTo(11.73f, 8.09f, 11.56f, 8.93f, 11.09f, 9.58f)
            curveTo(10.63f, 10.22f, 9.88f, 10.63f, 9.05f, 10.71f)
            curveTo(8.28f, 10.79f, 7.53f, 10.48f, 6.97f, 9.92f)
            curveTo(5.82f, 8.77f, 5.82f, 6.93f, 6.97f, 5.78f)
            curveTo(8.12f, 4.63f, 9.96f, 4.63f, 11.11f, 5.78f)
            curveTo(11.53f, 6.2f, 11.81f, 6.77f, 11.92f, 7.4f)
            curveTo(12.15f, 8.86f, 13.31f, 9.96f, 14.78f, 10.12f)
            curveTo(16.25f, 10.28f, 17.58f, 9.52f, 18.19f, 8.22f)
            curveTo(18.81f, 6.91f, 18.55f, 5.41f, 17.65f, 4.3f)
            lineTo(17.65f, 6.35f)
            close()
        }
    }.build()

    val Search: ImageVector = ImageVector.Builder(
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        path(
            fill = SolidColor(Color.Black),
            pathFillType = PathFillType.NonZero,
        ) {
            moveTo(15.5f, 14f)
            horizontalLineTo(14.71f)
            lineTo(14.43f, 13.73f)
            curveTo(15.41f, 12.59f, 16f, 11.11f, 16f, 9.5f)
            curveTo(16f, 5.91f, 13.09f, 3f, 9.5f, 3f)
            reflectiveCurveTo(3f, 5.91f, 3f, 9.5f)
            reflectiveCurveTo(5.91f, 16f, 9.5f, 16f)
            curveTo(11.11f, 16f, 12.59f, 15.41f, 13.73f, 14.43f)
            lineTo(14f, 14.71f)
            verticalLineTo(15.5f)
            lineTo(19f, 20.49f)
            lineTo(20.49f, 19f)
            lineTo(15.5f, 14f)
            close()
            moveTo(9.5f, 14f)
            curveTo(7.01f, 14f, 5f, 11.99f, 5f, 9.5f)
            reflectiveCurveTo(7.01f, 5f, 9.5f, 5f)
            reflectiveCurveTo(14f, 7.01f, 14f, 9.5f)
            reflectiveCurveTo(11.99f, 14f, 9.5f, 14f)
            close()
        }
    }.build()

    val Settings: ImageVector = ImageVector.Builder(
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        path(
            fill = SolidColor(Color.Black),
            pathFillType = PathFillType.NonZero,
        ) {
            moveTo(19.14f, 12.94f)
            curveTo(19.18f, 12.64f, 19.2f, 12.33f, 19.2f, 12f)
            curveTo(19.2f, 11.68f, 19.18f, 11.36f, 19.13f, 11.06f)
            lineTo(21.16f, 9.48f)
            curveTo(21.34f, 9.34f, 21.39f, 9.07f, 21.28f, 8.87f)
            lineTo(19.36f, 5.55f)
            curveTo(19.24f, 5.33f, 18.99f, 5.26f, 18.77f, 5.33f)
            lineTo(16.38f, 6.29f)
            curveTo(15.88f, 5.91f, 15.35f, 5.59f, 14.76f, 5.35f)
            lineTo(14.4f, 2.81f)
            curveTo(14.36f, 2.57f, 14.16f, 2.4f, 13.92f, 2.4f)
            horizontalLineTo(10.08f)
            curveTo(9.84f, 2.4f, 9.65f, 2.57f, 9.61f, 2.81f)
            lineTo(9.25f, 5.35f)
            curveTo(8.66f, 5.59f, 8.12f, 5.92f, 7.63f, 6.29f)
            lineTo(5.24f, 5.33f)
            curveTo(5.01f, 5.25f, 4.76f, 5.33f, 4.65f, 5.55f)
            lineTo(2.74f, 8.87f)
            curveTo(2.62f, 9.08f, 2.66f, 9.34f, 2.86f, 9.48f)
            lineTo(4.89f, 11.06f)
            curveTo(4.84f, 11.36f, 4.8f, 11.69f, 4.8f, 12f)
            curveTo(4.8f, 12.31f, 4.82f, 12.64f, 4.87f, 12.94f)
            lineTo(2.84f, 14.52f)
            curveTo(2.66f, 14.66f, 2.61f, 14.93f, 2.72f, 15.13f)
            lineTo(4.64f, 18.45f)
            curveTo(4.76f, 18.67f, 5.01f, 18.74f, 5.23f, 18.67f)
            lineTo(7.62f, 17.71f)
            curveTo(8.12f, 18.09f, 8.65f, 18.41f, 9.24f, 18.65f)
            lineTo(9.6f, 21.19f)
            curveTo(9.65f, 21.43f, 9.84f, 21.6f, 10.08f, 21.6f)
            horizontalLineTo(13.92f)
            curveTo(14.16f, 21.6f, 14.36f, 21.43f, 14.39f, 21.19f)
            lineTo(14.75f, 18.65f)
            curveTo(15.34f, 18.41f, 15.88f, 18.09f, 16.36f, 17.72f)
            lineTo(18.75f, 18.68f)
            curveTo(18.97f, 18.76f, 19.22f, 18.68f, 19.34f, 18.46f)
            lineTo(21.26f, 15.14f)
            curveTo(21.37f, 14.94f, 21.33f, 14.67f, 21.14f, 14.53f)
            lineTo(19.14f, 12.94f)
            close()
            moveTo(12f, 15.6f)
            curveTo(10.02f, 15.6f, 8.4f, 13.98f, 8.4f, 12f)
            curveTo(8.4f, 10.02f, 10.02f, 8.4f, 12f, 8.4f)
            curveTo(13.98f, 8.4f, 15.6f, 10.02f, 15.6f, 12f)
            curveTo(15.6f, 13.98f, 13.98f, 15.6f, 12f, 15.6f)
            close()
        }
    }.build()

    val Star: ImageVector = ImageVector.Builder(
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        path(
            fill = SolidColor(Color.Black),
            pathFillType = PathFillType.NonZero,
        ) {
            moveTo(12f, 17.27f)
            lineTo(18.18f, 21f)
            lineTo(16.54f, 13.97f)
            lineTo(22f, 9.24f)
            lineTo(14.81f, 8.63f)
            lineTo(12f, 2f)
            lineTo(9.19f, 8.63f)
            lineTo(2f, 9.24f)
            lineTo(7.46f, 13.97f)
            lineTo(5.82f, 21f)
            lineTo(12f, 17.27f)
            close()
        }
    }.build()

    val Warning: ImageVector = ImageVector.Builder(
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        path(
            fill = SolidColor(Color.Black),
            pathFillType = PathFillType.NonZero,
        ) {
            moveTo(1f, 21f)
            horizontalLineTo(23f)
            lineTo(12f, 2f)
            lineTo(1f, 21f)
            close()
            moveTo(13f, 18f)
            horizontalLineTo(11f)
            verticalLineTo(16f)
            horizontalLineTo(13f)
            verticalLineTo(18f)
            close()
            moveTo(13f, 14f)
            horizontalLineTo(11f)
            verticalLineTo(10f)
            horizontalLineTo(13f)
            verticalLineTo(14f)
            close()
        }
    }.build()

    val WarningAmber: ImageVector = Warning

    val Visibility: ImageVector = ImageVector.Builder(
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        path(
            fill = SolidColor(Color.Black),
            pathFillType = PathFillType.NonZero,
        ) {
            moveTo(12f, 4.5f)
            curveTo(7f, 4.5f, 2.73f, 7.61f, 1f, 12f)
            curveTo(2.73f, 16.39f, 7f, 19.5f, 12f, 19.5f)
            curveTo(17f, 19.5f, 21.27f, 16.39f, 23f, 12f)
            curveTo(21.27f, 7.61f, 17f, 4.5f, 12f, 4.5f)
            close()
            moveTo(12f, 17f)
            curveTo(9.24f, 17f, 7f, 14.76f, 7f, 12f)
            reflectiveCurveTo(9.24f, 7f, 12f, 7f)
            reflectiveCurveTo(17f, 9.24f, 17f, 12f)
            reflectiveCurveTo(14.76f, 17f, 12f, 17f)
            close()
            moveTo(12f, 9f)
            curveTo(10.34f, 9f, 9f, 10.34f, 9f, 12f)
            reflectiveCurveTo(10.34f, 15f, 12f, 15f)
            reflectiveCurveTo(15f, 13.66f, 15f, 12f)
            reflectiveCurveTo(13.66f, 9f, 12f, 9f)
            close()
        }
    }.build()

    val VisibilityOff: ImageVector = ImageVector.Builder(
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        path(
            fill = SolidColor(Color.Black),
            pathFillType = PathFillType.NonZero,
        ) {
            moveTo(12f, 7f)
            curveTo(14.76f, 7f, 17f, 9.24f, 17f, 12f)
            curveTo(17f, 12.65f, 16.87f, 13.26f, 16.64f, 13.83f)
            lineTo(19.56f, 16.75f)
            curveTo(21.07f, 15.49f, 22.26f, 13.86f, 23f, 12f)
            curveTo(21.27f, 7.61f, 17f, 4.5f, 12f, 4.5f)
            curveTo(10.6f, 4.5f, 9.26f, 4.75f, 8.02f, 5.2f)
            lineTo(10.18f, 7.36f)
            curveTo(10.74f, 7.13f, 11.35f, 7f, 12f, 7f)
            close()
            moveTo(2f, 4.27f)
            lineTo(4.28f, 6.55f)
            lineTo(4.74f, 7.01f)
            curveTo(3.08f, 8.3f, 1.78f, 10.02f, 1f, 12f)
            curveTo(2.73f, 16.39f, 7f, 19.5f, 12f, 19.5f)
            curveTo(13.55f, 19.5f, 15.03f, 19.2f, 16.38f, 18.66f)
            lineTo(16.8f, 19.08f)
            lineTo(19.73f, 22f)
            lineTo(21f, 20.73f)
            lineTo(3.27f, 3f)
            lineTo(2f, 4.27f)
            close()
            moveTo(9.53f, 9.8f)
            lineTo(11.08f, 11.35f)
            curveTo(11.03f, 11.56f, 11f, 11.78f, 11f, 12f)
            curveTo(11f, 13.66f, 12.34f, 15f, 14f, 15f)
            curveTo(14.22f, 15f, 14.44f, 14.97f, 14.65f, 14.92f)
            lineTo(16.2f, 16.47f)
            curveTo(15.53f, 16.8f, 14.79f, 17f, 14f, 17f)
            curveTo(11.24f, 17f, 9f, 14.76f, 9f, 12f)
            curveTo(9f, 11.21f, 9.2f, 10.47f, 9.53f, 9.8f)
            close()
            moveTo(13.84f, 9.02f)
            lineTo(16.99f, 12.17f)
            lineTo(17.01f, 12.01f)
            curveTo(17.01f, 10.35f, 15.67f, 9.01f, 14.01f, 9.01f)
            lineTo(13.84f, 9.02f)
            close()
        }
    }.build()

    val List: ImageVector = ImageVector.Builder(
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        path(
            fill = SolidColor(Color.Black),
            pathFillType = PathFillType.NonZero,
        ) {
            moveTo(3f, 13f)
            horizontalLineTo(2f)
            verticalLineTo(11f)
            horizontalLineTo(3f)
            verticalLineTo(13f)
            close()
            moveTo(3f, 17f)
            horizontalLineTo(2f)
            verticalLineTo(15f)
            horizontalLineTo(3f)
            verticalLineTo(17f)
            close()
            moveTo(3f, 9f)
            horizontalLineTo(2f)
            verticalLineTo(7f)
            horizontalLineTo(3f)
            verticalLineTo(9f)
            close()
            moveTo(7f, 13f)
            horizontalLineTo(21f)
            verticalLineTo(11f)
            horizontalLineTo(7f)
            verticalLineTo(13f)
            close()
            moveTo(7f, 17f)
            horizontalLineTo(21f)
            verticalLineTo(15f)
            horizontalLineTo(7f)
            verticalLineTo(17f)
            close()
            moveTo(7f, 9f)
            horizontalLineTo(21f)
            verticalLineTo(7f)
            horizontalLineTo(7f)
            verticalLineTo(9f)
            close()
        }
    }.build()

    val Eco: ImageVector = ImageVector.Builder(
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {

        // Background
        path(
            fill = SolidColor(Color(0xFF0D3B2E)),
            pathFillType = PathFillType.NonZero,
        ) {
            moveTo(6f, 0f)
            lineTo(18f, 0f)
            curveTo(21.3137f, 0f, 24f, 2.6863f, 24f, 6f)
            lineTo(24f, 18f)
            curveTo(24f, 21.3137f, 21.3137f, 24f, 18f, 24f)
            lineTo(6f, 24f)
            curveTo(2.6863f, 24f, 0f, 21.3137f, 0f, 18f)
            lineTo(0f, 6f)
            curveTo(0f, 2.6863f, 2.6863f, 0f, 6f, 0f)
            close()
        }

        // Leaf
        path(
            fill = SolidColor(Color(0xFF58D3A5)),
            pathFillType = PathFillType.NonZero,
        ) {
            moveTo(12f, 5f)
            curveTo(8.5f, 5f, 6f, 7.5f, 6f, 10.5f)
            curveTo(6f, 13.5f, 8.5f, 16f, 11.5f, 16f)
            curveTo(15.5f, 16f, 17f, 13f, 17f, 9.5f)
            curveTo(17f, 7.5f, 17f, 6f, 17f, 5f)
            curveTo(15.5f, 5f, 14f, 5f, 12f, 5f)
            close()
        }

        // Leaf detail line
        path(
            fill = null,
            stroke = SolidColor(Color(0xFF0D3B2E)),
            strokeLineWidth = 1.2f,
            strokeLineCap = StrokeCap.Round,
            pathFillType = PathFillType.NonZero,
        ) {
            moveTo(10f, 14f)
            curveTo(11.5f, 11f, 13.5f, 9f, 16f, 7f)
        }

    }.build()

    val Diamond: ImageVector = ImageVector.Builder(
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        path(
            fill = SolidColor(Color.Black),
            pathFillType = PathFillType.NonZero,
        ) {
            moveTo(19f, 3f)
            horizontalLineTo(5f)
            lineTo(2f, 9f)
            lineToRelative(10f, 12f)
            lineTo(22f, 9f)
            lineToRelative(-3f, -6f)
            close()
            moveTo(9.62f, 8f)
            lineToRelative(1.5f, -3f)
            horizontalLineToRelative(1.76f)
            lineToRelative(1.5f, 3f)
            horizontalLineTo(9.62f)
            close()
            moveTo(11f, 10f)
            verticalLineToRelative(6.68f)
            lineTo(5.44f, 10f)
            horizontalLineTo(11f)
            close()
            moveTo(13f, 10f)
            horizontalLineToRelative(5.56f)
            lineTo(13f, 16.68f)
            verticalLineTo(10f)
            close()
            moveTo(14.38f, 8f)
            lineToRelative(-1.5f, -3f)
            horizontalLineToRelative(1.76f)
            lineToRelative(1.5f, 3f)
            horizontalLineTo(14.38f)
            close()
            moveTo(17.62f, 8f)
            lineToRelative(-1.5f, -3f)
            horizontalLineToRelative(1.88f)
            lineToRelative(1.5f, 3f)
            horizontalLineTo(17.62f)
            close()
            moveTo(6f, 5f)
            horizontalLineToRelative(1.88f)
            lineToRelative(-1.5f, 3f)
            horizontalLineTo(4.5f)
            lineTo(6f, 5f)
            close()
        }
    }.build()

    val Verified: ImageVector = ImageVector.Builder(
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        path(
            fill = SolidColor(Color.Black),
            pathFillType = PathFillType.NonZero,
        ) {
            moveTo(23f, 12f)
            lineToRelative(-2.44f, -2.79f)
            lineToRelative(0.34f, -3.69f)
            lineToRelative(-3.61f, -0.82f)
            lineToRelative(-1.89f, -3.2f)
            lineTo(12f, 2.96f)
            lineTo(8.6f, 1.5f)
            lineTo(6.71f, 4.69f)
            lineTo(3.1f, 5.5f)
            lineTo(3.44f, 9.2f)
            lineTo(1f, 12f)
            lineToRelative(2.44f, 2.79f)
            lineToRelative(-0.34f, 3.7f)
            lineToRelative(3.61f, 0.82f)
            lineTo(8.6f, 22.5f)
            lineToRelative(3.4f, -1.47f)
            lineToRelative(3.4f, 1.46f)
            lineToRelative(1.89f, -3.19f)
            lineToRelative(3.61f, -0.82f)
            lineToRelative(-0.34f, -3.69f)
            lineTo(23f, 12f)
            close()
            moveTo(10.09f, 16.72f)
            lineToRelative(-3.8f, -3.81f)
            lineToRelative(1.48f, -1.48f)
            lineToRelative(2.32f, 2.33f)
            lineToRelative(5.32f, -5.33f)
            lineToRelative(1.48f, 1.48f)
            lineToRelative(-6.8f, 6.81f)
            close()
        }
    }.build()

    val Remove: ImageVector = ImageVector.Builder(
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        path(
            fill = SolidColor(Color.Black),
            pathFillType = PathFillType.NonZero,
        ) {
            moveTo(19f, 13f)
            horizontalLineTo(5f)
            verticalLineTo(11f)
            horizontalLineTo(19f)
            verticalLineTo(13f)
            close()
        }
    }.build()

    val Mail: ImageVector = Email

    val EmptyIcon: ImageVector get() = AppIcons.List

    // Environmental/Insights Icons
    val Co2: ImageVector = ImageVector.Builder(
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        // Cloud shape
        path(
            fill = SolidColor(Color.Black),
            pathFillType = PathFillType.NonZero,
        ) {
            moveTo(19.35f, 10.04f)
            curveTo(18.67f, 6.59f, 15.64f, 4f, 12f, 4f)
            curveTo(9.11f, 4f, 6.6f, 5.64f, 5.35f, 8.04f)
            lineTo(2f, 8f)
            verticalLineTo(16f)
            horizontalLineTo(6f)
            curveTo(6.67f, 16.67f, 7.67f, 17f, 8.5f, 17f)
            curveTo(9.33f, 17f, 10.33f, 16.67f, 11f, 16f)
            horizontalLineTo(14.5f)
            curveTo(15.17f, 16.67f, 16.17f, 17f, 17f, 17f)
            curveTo(17.83f, 17f, 18.83f, 16.67f, 19.5f, 16f)
            lineTo(22f, 16f)
            verticalLineTo(10.04f)
            horizontalLineTo(19.35f)
            close()
        }
        // Leaf inside cloud
        path(
            fill = SolidColor(Color.Black),
            pathFillType = PathFillType.NonZero,
        ) {
            moveTo(12f, 7f)
            curveTo(10f, 7f, 8.5f, 8.5f, 8.5f, 10.5f)
            curveTo(8.5f, 12.5f, 10f, 14f, 12f, 14f)
            curveTo(14f, 14f, 15.5f, 12.5f, 15.5f, 10.5f)
            curveTo(15.5f, 9.5f, 15.5f, 8.5f, 15.5f, 7.5f)
            curveTo(14.5f, 7.5f, 13.5f, 7f, 12f, 7f)
            close()
        }
    }.build()

    val WaterDrop: ImageVector = ImageVector.Builder(
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        path(
            fill = SolidColor(Color.Black),
            pathFillType = PathFillType.NonZero,
        ) {
            moveTo(12f, 2f)
            curveTo(12f, 2f, 5f, 10f, 5f, 14f)
            curveTo(5f, 17.87f, 8.13f, 21f, 12f, 21f)
            curveTo(15.87f, 21f, 19f, 17.87f, 19f, 14f)
            curveTo(19f, 10f, 12f, 2f, 12f, 2f)
            close()
        }
    }.build()

    val Flash: ImageVector = ImageVector.Builder(
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        path(
            fill = SolidColor(Color.Black),
            pathFillType = PathFillType.NonZero,
        ) {
            moveTo(7f, 2f)
            verticalLineTo(13f)
            horizontalLineTo(10f)
            verticalLineTo(22f)
            lineTo(17f, 10f)
            horizontalLineTo(13f)
            lineTo(17f, 2f)
            horizontalLineTo(7f)
            close()
        }
    }.build()

    val Tree: ImageVector = ImageVector.Builder(
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        // Tree foliage
        path(
            fill = SolidColor(Color.Black),
            pathFillType = PathFillType.NonZero,
        ) {
            moveTo(12f, 2f)
            lineTo(2f, 14f)
            horizontalLineTo(6f)
            verticalLineTo(22f)
            horizontalLineTo(18f)
            verticalLineTo(14f)
            horizontalLineTo(22f)
            lineTo(12f, 2f)
            close()
        }
    }.build()

    val Scale: ImageVector = ImageVector.Builder(
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        path(
            fill = SolidColor(Color.Black),
            pathFillType = PathFillType.NonZero,
        ) {
            moveTo(12f, 3f)
            lineTo(2f, 9f)
            verticalLineTo(11f)
            horizontalLineTo(22f)
            verticalLineTo(9f)
            lineTo(12f, 3f)
            close()
            moveTo(5f, 11f)
            verticalLineTo(16.18f)
            curveTo(5f, 18.23f, 6.76f, 20f, 9f, 20f)
            curveTo(11.24f, 20f, 13f, 18.23f, 13f, 16.18f)
            verticalLineTo(11f)
            horizontalLineTo(5f)
            close()
            moveTo(11f, 16.18f)
            curveTo(11f, 17.17f, 10.1f, 18f, 9f, 18f)
            curveTo(7.9f, 18f, 7f, 17.17f, 7f, 16.18f)
            verticalLineTo(13f)
            horizontalLineTo(11f)
            verticalLineTo(16.18f)
            close()
            moveTo(15f, 11f)
            horizontalLineTo(19f)
            verticalLineTo(14f)
            horizontalLineTo(15f)
            verticalLineTo(11f)
            close()
        }
    }.build()

    val Package: ImageVector = ImageVector.Builder(
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        // Box
        path(
            fill = SolidColor(Color.Black),
            pathFillType = PathFillType.NonZero,
        ) {
            moveTo(12f, 2f)
            lineTo(2f, 7f)
            lineTo(2f, 17f)
            lineTo(12f, 22f)
            lineTo(22f, 17f)
            lineTo(22f, 7f)
            lineTo(12f, 2f)
            close()
            moveTo(12f, 4.24f)
            lineTo(18.3f, 7.5f)
            lineTo(12f, 10.76f)
            lineTo(5.7f, 7.5f)
            lineTo(12f, 4.24f)
            close()
            moveTo(4f, 8.6f)
            lineTo(11f, 12.33f)
            verticalLineTo(19.6f)
            lineTo(4f, 16.1f)
            lineTo(4f, 8.6f)
            close()
            moveTo(20f, 16.1f)
            lineTo(13f, 19.6f)
            verticalLineTo(12.33f)
            lineTo(20f, 8.6f)
            lineTo(20f, 16.1f)
            close()
        }
    }.build()

    val Recycling: ImageVector = ImageVector.Builder(
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        // Recycling symbol - three arrows forming triangle
        path(
            fill = SolidColor(Color.Black),
            pathFillType = PathFillType.NonZero,
        ) {
            moveTo(12f, 6f)
            curveTo(9.79f, 6f, 7.79f, 7.05f, 6.5f, 8.71f)
            lineTo(4.5f, 7.34f)
            curveTo(6.29f, 4.76f, 9.0f, 3.0f, 12.0f, 3.0f)
            curveTo(15.0f, 3.0f, 17.71f, 4.76f, 19.5f, 7.34f)
            lineTo(17.5f, 8.71f)
            curveTo(16.21f, 7.05f, 14.21f, 6f, 12f, 6f)
            close()
            moveTo(18f, 10f)
            lineTo(21f, 10f)
            verticalLineTo(16f)
            lineTo(18.5f, 16f)
            lineTo(16.5f, 13f)
            horizontalLineTo(14.5f)
            lineTo(18f, 10f)
            close()
            moveTo(6f, 10f)
            lineTo(9.5f, 13f)
            horizontalLineTo(7.5f)
            lineTo(5.5f, 16f)
            lineTo(3f, 16f)
            verticalLineTo(10f)
            lineTo(6f, 10f)
            close()
            moveTo(12f, 21f)
            curveTo(9.79f, 21f, 7.79f, 19.95f, 6.5f, 18.29f)
            lineTo(4.5f, 19.66f)
            curveTo(6.29f, 22.24f, 9.0f, 24.0f, 12.0f, 24.0f)
            curveTo(15.0f, 24.0f, 17.71f, 22.24f, 19.5f, 19.66f)
            lineTo(17.5f, 18.29f)
            curveTo(16.21f, 19.95f, 14.21f, 21f, 12f, 21f)
            close()
        }
    }.build()

    val TrendingUp: ImageVector = ImageVector.Builder(
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        path(
            fill = SolidColor(Color.Black),
            pathFillType = PathFillType.NonZero,
        ) {
            moveTo(16f, 6f)
            lineTo(18.29f, 8.29f)
            lineTo(13.41f, 13.17f)
            lineTo(9.41f, 9.17f)
            lineTo(2f, 16.59f)
            lineTo(3.41f, 18f)
            lineTo(9.41f, 12f)
            lineTo(13.41f, 16f)
            lineTo(19.71f, 9.71f)
            lineTo(22f, 12f)
            verticalLineTo(6f)
            horizontalLineTo(16f)
            close()
        }
    }.build()

    val Wallet: ImageVector = ImageVector.Builder(
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        path(
            fill = SolidColor(Color.Black),
            pathFillType = PathFillType.NonZero,
        ) {
            moveTo(21f, 18f)
            verticalLineTo(19f)
            curveTo(21f, 20.1f, 20.1f, 21f, 19f, 21f)
            horizontalLineTo(5f)
            curveTo(3.89f, 21f, 3f, 20.1f, 3f, 19f)
            verticalLineTo(5f)
            curveTo(3f, 3.9f, 3.89f, 3f, 5f, 3f)
            horizontalLineTo(19f)
            curveTo(20.1f, 3f, 21f, 3.9f, 21f, 5f)
            verticalLineTo(6f)
            horizontalLineTo(12f)
            curveTo(10.89f, 6f, 10f, 6.9f, 10f, 8f)
            verticalLineTo(16f)
            curveTo(10f, 17.1f, 10.89f, 18f, 12f, 18f)
            horizontalLineTo(21f)
            close()
            moveTo(12f, 16f)
            horizontalLineTo(22f)
            verticalLineTo(8f)
            horizontalLineTo(12f)
            verticalLineTo(16f)
            close()
            moveTo(16f, 13.5f)
            curveTo(16.83f, 13.5f, 17.5f, 12.83f, 17.5f, 12f)
            curveTo(17.5f, 11.17f, 16.83f, 10.5f, 16f, 10.5f)
            curveTo(15.17f, 10.5f, 14.5f, 11.17f, 14.5f, 12f)
            curveTo(14.5f, 12.83f, 15.17f, 13.5f, 16f, 13.5f)
            close()
        }
    }.build()

    val EmojiEvents: ImageVector = ImageVector.Builder(
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        // Trophy icon
        path(
            fill = SolidColor(Color.Black),
            pathFillType = PathFillType.NonZero,
        ) {
            moveTo(19f, 5f)
            horizontalLineTo(17f)
            verticalLineTo(3f)
            horizontalLineTo(7f)
            verticalLineTo(5f)
            horizontalLineTo(5f)
            curveTo(3.9f, 5f, 3f, 5.9f, 3f, 7f)
            verticalLineTo(9f)
            curveTo(3f, 13.97f, 6.97f, 18f, 11.5f, 18f)
            horizontalLineTo(12.5f)
            curveTo(12.78f, 18f, 13.05f, 17.98f, 13.32f, 17.95f)
            curveTo(14.84f, 19.62f, 16.95f, 20.58f, 19.28f, 20.47f)
            curveTo(19.73f, 20.45f, 20.1f, 20.08f, 20.1f, 19.63f)
            verticalLineTo(19.5f)
            curveTo(20.1f, 19.22f, 19.88f, 19f, 19.6f, 19f)
            curveTo(17.8f, 19f, 16.21f, 18.1f, 15.31f, 16.78f)
            curveTo(18.19f, 15.84f, 20.43f, 13.35f, 20.9f, 10.25f)
            curveTo(20.96f, 9.87f, 21f, 9.44f, 21f, 9f)
            verticalLineTo(7f)
            curveTo(21f, 5.9f, 20.1f, 5f, 19f, 5f)
            close()
            moveTo(5f, 7f)
            horizontalLineTo(7f)
            verticalLineTo(9f)
            curveTo(7f, 11.76f, 9.24f, 14f, 12f, 14f)
            horizontalLineTo(12.5f)
            curveTo(12.5f, 14f, 12.5f, 14f, 12.5f, 14f)
            curveTo(12.5f, 14f, 12.5f, 14f, 12.5f, 14f)
            curveTo(15.26f, 14f, 17.5f, 11.76f, 17.5f, 9f)
            verticalLineTo(7f)
            horizontalLineTo(19f)
            verticalLineTo(9f)
            curveTo(19f, 12.87f, 15.87f, 16f, 12f, 16f)
            curveTo(8.13f, 16f, 5f, 12.87f, 5f, 9f)
            verticalLineTo(7f)
            close()
            moveTo(12f, 20f)
            curveTo(11.17f, 20f, 10.5f, 20.67f, 10.5f, 21.5f)
            curveTo(10.5f, 22.33f, 11.17f, 23f, 12f, 23f)
            curveTo(12.83f, 23f, 13.5f, 22.33f, 13.5f, 21.5f)
            curveTo(13.5f, 20.67f, 12.83f, 20f, 12f, 20f)
            close()
        }
    }.build()

    val CalendarToday: ImageVector = ImageVector.Builder(
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        path(
            fill = SolidColor(Color.Black),
            pathFillType = PathFillType.NonZero,
        ) {
            moveTo(20f, 3f)
            horizontalLineTo(19f)
            verticalLineTo(1f)
            horizontalLineTo(17f)
            verticalLineTo(3f)
            horizontalLineTo(7f)
            verticalLineTo(1f)
            horizontalLineTo(5f)
            verticalLineTo(3f)
            horizontalLineTo(4f)
            curveTo(2.9f, 3f, 2f, 3.9f, 2f, 5f)
            verticalLineTo(21f)
            curveTo(2f, 22.1f, 2.9f, 23f, 4f, 23f)
            horizontalLineTo(20f)
            curveTo(21.1f, 23f, 22f, 22.1f, 22f, 21f)
            verticalLineTo(5f)
            curveTo(22f, 3.9f, 21.1f, 3f, 20f, 3f)
            close()
            moveTo(20f, 21f)
            horizontalLineTo(4f)
            verticalLineTo(10f)
            horizontalLineTo(20f)
            verticalLineTo(21f)
            close()
            moveTo(20f, 8f)
            horizontalLineTo(4f)
            verticalLineTo(5f)
            horizontalLineTo(20f)
            verticalLineTo(8f)
            close()
            moveTo(9f, 14f)
            horizontalLineTo(7f)
            verticalLineTo(16f)
            horizontalLineTo(9f)
            verticalLineTo(14f)
            close()
        }
    }.build()

    // Material Design Icons for Schedule Pickup
    val LightMode: ImageVector = ImageVector.Builder(
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        path(
            fill = SolidColor(Color.Black),
            pathFillType = PathFillType.NonZero,
        ) {
            moveTo(12f, 7f)
            curveTo(9.2f, 7f, 7f, 9.2f, 7f, 12f)
            curveTo(7f, 14.8f, 9.2f, 17f, 12f, 17f)
            curveTo(14.8f, 17f, 17f, 14.8f, 17f, 12f)
            curveTo(17f, 9.2f, 14.8f, 7f, 12f, 7f)
            close()
            moveTo(2f, 13f)
            horizontalLineTo(4f)
            verticalLineTo(11f)
            horizontalLineTo(2f)
            close()
            moveTo(20f, 13f)
            horizontalLineTo(22f)
            verticalLineTo(11f)
            horizontalLineTo(20f)
            close()
            moveTo(11f, 2f)
            horizontalLineTo(13f)
            verticalLineTo(4f)
            horizontalLineTo(11f)
            close()
            moveTo(11f, 20f)
            horizontalLineTo(13f)
            verticalLineTo(22f)
            horizontalLineTo(11f)
            close()
            moveTo(5.6f, 5.6f)
            lineTo(7f, 7f)
            lineTo(5.6f, 5.6f)
            close()
            moveTo(18.4f, 5.6f)
            lineTo(17f, 7f)
            lineTo(18.4f, 5.6f)
            close()
            moveTo(7f, 17f)
            lineTo(5.6f, 18.4f)
            lineTo(7f, 17f)
            close()
            moveTo(17f, 17f)
            lineTo(18.4f, 18.4f)
            lineTo(17f, 17f)
            close()
        }
    }.build()

    val WbSunny: ImageVector = ImageVector.Builder(
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        path(
            fill = SolidColor(Color.Black),
            pathFillType = PathFillType.NonZero,
        ) {
            moveTo(6.76f, 4.84f)
            lineTo(5.35f, 3.43f)
            lineTo(3.95f, 4.84f)
            lineTo(5.36f, 6.25f)
            close()
            moveTo(4f, 11f)
            horizontalLineTo(1f)
            verticalLineTo(13f)
            horizontalLineTo(4f)
            close()
            moveTo(13f, 1f)
            horizontalLineTo(11f)
            verticalLineTo(4f)
            horizontalLineTo(13f)
            close()
            moveTo(20.1f, 4.84f)
            lineTo(18.69f, 3.43f)
            lineTo(17.28f, 4.84f)
            lineTo(18.69f, 6.25f)
            close()
            moveTo(17.24f, 18.16f)
            lineTo(18.65f, 19.57f)
            lineTo(20.05f, 18.16f)
            lineTo(18.64f, 16.75f)
            close()
            moveTo(20f, 11f)
            verticalLineTo(13f)
            horizontalLineTo(23f)
            verticalLineTo(11f)
            close()
            moveTo(12f, 6f)
            curveTo(8.69f, 6f, 6f, 8.69f, 6f, 12f)
            curveTo(6f, 15.31f, 8.69f, 18f, 12f, 18f)
            curveTo(15.31f, 18f, 18f, 15.31f, 18f, 12f)
            curveTo(18f, 8.69f, 15.31f, 6f, 12f, 6f)
            close()
            moveTo(11f, 22f)
            horizontalLineTo(13f)
            verticalLineTo(19f)
            horizontalLineTo(11f)
            close()
            moveTo(3.95f, 18.16f)
            lineTo(5.36f, 19.57f)
            lineTo(6.77f, 18.16f)
            lineTo(5.36f, 16.75f)
            close()
        }
    }.build()

    val Bedtime: ImageVector = ImageVector.Builder(
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        path(
            fill = SolidColor(Color.Black),
            pathFillType = PathFillType.NonZero,
        ) {
            moveTo(9.5f, 2f)
            curveTo(11.8f, 2f, 13.9f, 2.7f, 15.6f, 4f)
            curveTo(15.4f, 4f, 15.2f, 4f, 15f, 4f)
            curveTo(9.5f, 4f, 5f, 8.5f, 5f, 14f)
            curveTo(5f, 16.2f, 5.7f, 18.2f, 7f, 19.8f)
            curveTo(4.6f, 18f, 3f, 15.1f, 3f, 12f)
            curveTo(3f, 6.5f, 7.5f, 2f, 9.5f, 2f)
            close()
            moveTo(15.5f, 4f)
            curveTo(18.5f, 4f, 21f, 6.5f, 21f, 9.5f)
            curveTo(21f, 12.5f, 18.5f, 15f, 15.5f, 15f)
            curveTo(12.5f, 15f, 10f, 12.5f, 10f, 9.5f)
            curveTo(10f, 6.5f, 12.5f, 4f, 15.5f, 4f)
            close()
        }
    }.build()

    val LocationOn: ImageVector = ImageVector.Builder(
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        path(
            fill = SolidColor(Color.Black),
            pathFillType = PathFillType.NonZero,
        ) {
            moveTo(12f, 2f)
            curveTo(8.1f, 2f, 5f, 5.1f, 5f, 9f)
            curveTo(5f, 14.2f, 12f, 22f, 12f, 22f)
            curveTo(12f, 22f, 19f, 14.2f, 19f, 9f)
            curveTo(19f, 5.1f, 15.9f, 2f, 12f, 2f)
            close()
            moveTo(12f, 11.5f)
            curveTo(10.6f, 11.5f, 9.5f, 10.4f, 9.5f, 9f)
            curveTo(9.5f, 7.6f, 10.6f, 6.5f, 12f, 6.5f)
            curveTo(13.4f, 6.5f, 14.5f, 7.6f, 14.5f, 9f)
            curveTo(14.5f, 10.4f, 13.4f, 11.5f, 12f, 11.5f)
            close()
        }
    }.build()

    val Work: ImageVector = ImageVector.Builder(
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        path(
            fill = SolidColor(Color.Black),
            pathFillType = PathFillType.NonZero,
        ) {
            moveTo(20f, 6f)
            horizontalLineTo(16f)
            verticalLineTo(4f)
            curveTo(16f, 2.9f, 15.1f, 2f, 14f, 2f)
            horizontalLineTo(10f)
            curveTo(8.9f, 2f, 8f, 2.9f, 8f, 4f)
            verticalLineTo(6f)
            horizontalLineTo(4f)
            curveTo(2.9f, 6f, 2f, 6.9f, 2f, 8f)
            verticalLineTo(20f)
            curveTo(2f, 21.1f, 2.9f, 22f, 4f, 22f)
            horizontalLineTo(20f)
            curveTo(21.1f, 22f, 22f, 21.1f, 22f, 20f)
            verticalLineTo(8f)
            curveTo(22f, 6.9f, 21.1f, 6f, 20f, 6f)
            close()
            moveTo(14f, 6f)
            horizontalLineTo(10f)
            verticalLineTo(4f)
            horizontalLineTo(14f)
            close()
        }
    }.build()

    val RadioButtonChecked: ImageVector = ImageVector.Builder(
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        path(
            fill = SolidColor(Color.Black),
            pathFillType = PathFillType.NonZero,
        ) {
            moveTo(12f, 2f)
            curveTo(6.48f, 2f, 2f, 6.48f, 2f, 12f)
            curveTo(2f, 17.52f, 6.48f, 22f, 12f, 22f)
            curveTo(17.52f, 22f, 22f, 17.52f, 22f, 12f)
            curveTo(22f, 6.48f, 17.52f, 2f, 12f, 2f)
            close()
            moveTo(12f, 20f)
            curveTo(7.58f, 20f, 4f, 16.42f, 4f, 12f)
            curveTo(4f, 7.58f, 7.58f, 4f, 12f, 4f)
            curveTo(16.42f, 4f, 20f, 7.58f, 20f, 12f)
            curveTo(20f, 16.42f, 16.42f, 20f, 12f, 20f)
            close()
            moveTo(12f, 17f)
            curveTo(9.24f, 17f, 7f, 14.76f, 7f, 12f)
            curveTo(7f, 9.24f, 9.24f, 7f, 12f, 7f)
            curveTo(14.76f, 7f, 17f, 9.24f, 17f, 12f)
            curveTo(17f, 14.76f, 14.76f, 17f, 12f, 17f)
            close()
        }
    }.build()

    val RadioButtonUnchecked: ImageVector = ImageVector.Builder(
        defaultWidth = 24.dp,
        defaultHeight = 24.dp,
        viewportWidth = 24f,
        viewportHeight = 24f,
    ).apply {
        path(
            fill = SolidColor(Color.Black),
            pathFillType = PathFillType.NonZero,
        ) {
            moveTo(12f, 2f)
            curveTo(6.48f, 2f, 2f, 6.48f, 2f, 12f)
            curveTo(2f, 17.52f, 6.48f, 22f, 12f, 22f)
            curveTo(17.52f, 22f, 22f, 17.52f, 22f, 12f)
            curveTo(22f, 6.48f, 17.52f, 2f, 12f, 2f)
            close()
            moveTo(12f, 20f)
            curveTo(7.58f, 20f, 4f, 16.42f, 4f, 12f)
            curveTo(4f, 7.58f, 7.58f, 4f, 12f, 4f)
            curveTo(16.42f, 4f, 20f, 7.58f, 20f, 12f)
            curveTo(20f, 16.42f, 16.42f, 20f, 12f, 20f)
            close()
        }
    }.build()
}
