import 'package:flutter/material.dart';
import 'playScreen.dart';

void main() {
  runApp(MaterialApp(home: OmokGame()));
}

class OmokGame extends StatelessWidget {
  const OmokGame({super.key});
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Padding(
        padding: EdgeInsets.all(16.0),
        child: Column(
          children: [
            SizedBox(height: 60), // 상단 여백
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(Icons.account_circle, size: 30),
                    Text(
                      'Player1',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                Icon(Icons.settings, size: 32),
              ],
            ),
            SizedBox(height: 50),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.push(
                    context,
              
                    MaterialPageRoute(builder: (context) => PlayScreen()),
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.blue,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
              
                child: Text('온라인 대국하기',
                    style: TextStyle(fontSize: 20, ),
              ),
            ),
        ),],
        ),
      ),
    );
  }
}
