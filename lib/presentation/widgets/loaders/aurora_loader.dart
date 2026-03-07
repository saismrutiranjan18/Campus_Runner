import 'dart:math' as math;

import 'package:flutter/material.dart';

class AuroraLoader extends StatefulWidget {
  const AuroraLoader({
    super.key,
    this.size = 88,
    this.strokeWidth = 10,
    this.showLabel = true,
    this.label = 'Loading',
  });

  final double size;
  final double strokeWidth;
  final bool showLabel;
  final String label;

  @override
  State<AuroraLoader> createState() => _AuroraLoaderState();
}

class _AuroraLoaderState extends State<AuroraLoader>
    with TickerProviderStateMixin {
  late final AnimationController _rotationController;
  late final AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _rotationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2200),
    )..repeat();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _rotationController.dispose();
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;

    return AnimatedBuilder(
      animation: Listenable.merge([_rotationController, _pulseController]),
      builder: (context, child) {
        final pulse = Curves.easeInOut.transform(_pulseController.value);
        final outerScale = 0.92 + (pulse * 0.1);
        final innerScale = 0.86 + ((1 - pulse) * 0.12);

        return Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              width: widget.size,
              height: widget.size,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  Transform.scale(
                    scale: outerScale,
                    child: Transform.rotate(
                      angle: _rotationController.value * math.pi * 2,
                      child: _GradientRing(
                        size: widget.size,
                        strokeWidth: widget.strokeWidth,
                        colors: [
                          colors.primary,
                          colors.secondary,
                          colors.tertiary,
                          colors.primary,
                        ],
                      ),
                    ),
                  ),
                  Transform.scale(
                    scale: innerScale,
                    child: Transform.rotate(
                      angle: -_rotationController.value * math.pi * 1.6,
                      child: _GradientRing(
                        size: widget.size * 0.74,
                        strokeWidth: widget.strokeWidth * 0.82,
                        colors: [
                          colors.tertiary,
                          colors.primary,
                          colors.secondary,
                          colors.tertiary,
                        ],
                      ),
                    ),
                  ),
                  Container(
                    width: widget.size * 0.34,
                    height: widget.size * 0.34,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [colors.primary, colors.secondary],
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: colors.primary.withValues(alpha: 0.28),
                          blurRadius: 18,
                          spreadRadius: 2,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            if (widget.showLabel) ...[
              const SizedBox(height: 16),
              Text(
                widget.label,
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: colors.onSurface,
                ),
              ),
            ],
          ],
        );
      },
    );
  }
}

class FullScreenAuroraLoader extends StatelessWidget {
  const FullScreenAuroraLoader({
    super.key,
    this.label = 'Loading',
    this.subtitle,
  });

  final String label;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = theme.colorScheme;

    return Center(
      child: Container(
        margin: const EdgeInsets.all(24),
        padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 24),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(28),
          color: colors.surface.withValues(alpha: 0.84),
          border: Border.all(
            color: colors.outlineVariant.withValues(alpha: 0.28),
          ),
          boxShadow: [
            BoxShadow(
              color: colors.shadow.withValues(alpha: 0.08),
              blurRadius: 24,
              offset: const Offset(0, 12),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AuroraLoader(label: label),
            if (subtitle != null) ...[
              const SizedBox(height: 8),
              Text(
                subtitle!,
                textAlign: TextAlign.center,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: colors.onSurfaceVariant,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _GradientRing extends StatelessWidget {
  const _GradientRing({
    required this.size,
    required this.strokeWidth,
    required this.colors,
  });

  final double size;
  final double strokeWidth;
  final List<Color> colors;

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      size: Size.square(size),
      painter: _GradientRingPainter(strokeWidth: strokeWidth, colors: colors),
    );
  }
}

class _GradientRingPainter extends CustomPainter {
  const _GradientRingPainter({required this.strokeWidth, required this.colors});

  final double strokeWidth;
  final List<Color> colors;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;
    final paint = Paint()
      ..shader = SweepGradient(
        startAngle: 0,
        endAngle: math.pi * 2,
        colors: colors,
      ).createShader(rect)
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    canvas.drawArc(
      Rect.fromCircle(
        center: rect.center,
        radius: size.width / 2 - strokeWidth,
      ),
      0,
      math.pi * 1.75,
      false,
      paint,
    );
  }

  @override
  bool shouldRepaint(covariant _GradientRingPainter oldDelegate) {
    return oldDelegate.strokeWidth != strokeWidth ||
        oldDelegate.colors != colors;
  }
}
