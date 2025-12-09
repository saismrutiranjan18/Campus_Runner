import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';
import '../inputs/primary_button.dart';

class OTPDialog extends StatefulWidget {
  final Function(String) onVerify;

  const OTPDialog({super.key, required this.onVerify});

  @override
  State<OTPDialog> createState() => _OTPDialogState();
}

class _OTPDialogState extends State<OTPDialog> {
  final TextEditingController _controller = TextEditingController();

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(PhosphorIcons.lockKey(PhosphorIconsStyle.duotone), size: 48, color: Theme.of(context).primaryColor)
                .animate()
                .shake(),
            const SizedBox(height: 16),
            const Text(
              "Verify Delivery",
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            const Text(
              "Ask the student for the 4-digit code to complete the order.",
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey),
            ),
            const SizedBox(height: 24),
            TextField(
              controller: _controller,
              keyboardType: TextInputType.number,
              textAlign: TextAlign.center,
              maxLength: 4,
              style: const TextStyle(fontSize: 24, letterSpacing: 8, fontWeight: FontWeight.bold),
              decoration: InputDecoration(
                hintText: "0 0 0 0",
                counterText: "",
                filled: true,
                fillColor: Colors.grey[100],
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
            const SizedBox(height: 24),
            PrimaryButton(
              text: "Verify & Earn",
              onPressed: () {
                if (_controller.text.length == 4) {
                  widget.onVerify(_controller.text);
                  Navigator.pop(context);
                }
              },
            )
          ],
        ),
      ),
    );
  }
}