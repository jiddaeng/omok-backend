import 'package:flutter/material.dart';
import 'drawingBoard.dart';

class PlayScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('온라인 대국'), centerTitle: true),
      body: Column(
        children: [
          SizedBox(height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              Row(
                children: [
                  Icon(Icons.circle, color: Colors.black, size: 30),
                  Text('흑', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700)),
                  SizedBox(width: 10),
                  Text('YOU', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w300)),
                ],
              ),
              Text(
                '1:30',
                style: TextStyle(
                  fontSize: 24, 
                  fontWeight: FontWeight.w700,
                  ),
              ),
              Row(
                children: [
                  Icon(
                    Icons.circle,
                    color: Colors.white,
                    size: 30,
                    shadows: [Shadow(color: Colors.black, blurRadius: 1)],
                  ),
                  Text('백', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700)),
                  SizedBox(width: 10),
                  Text('오목의 신', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w300)),
                ],
              ),
            ],
          ),
          SizedBox(height: 20),
          CustomPaint(size: Size(270, 270), painter: BoardPainter()),
          SizedBox(height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              ElevatedButton(child: Text('기권'), onPressed: () {}),
              ElevatedButton(child: Text('설정'), onPressed: () {}),
              ElevatedButton(child: Text('채팅'), onPressed: () {}),
              ElevatedButton(child: Text('기보'), onPressed: () {}),
            ],
          ),
        ],
      ),
    );
  }
}
