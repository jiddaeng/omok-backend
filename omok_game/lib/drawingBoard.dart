import 'package:flutter/material.dart';

class BoardPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.black
      ..strokeWidth = 1;

    double gap = size.width / 8;

    for (int i = 0; i < 9; i++) {
      // 가로
      canvas.drawLine(
        Offset(0, gap * i),
        Offset(size.width, gap * i),
        paint,
      );

      // 세로
      canvas.drawLine(
        Offset(gap * i, 0),
        Offset(gap * i, size.height),
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}