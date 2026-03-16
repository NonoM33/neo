import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('Basic widget test', (WidgetTester tester) async {
    // Build a simple widget and verify it renders
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: Center(
            child: Text('Neo Intégrateur'),
          ),
        ),
      ),
    );

    // Verify that our text is displayed
    expect(find.text('Neo Intégrateur'), findsOneWidget);
  });
}
