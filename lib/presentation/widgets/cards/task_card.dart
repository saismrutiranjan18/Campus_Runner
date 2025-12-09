import 'package:flutter/material.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

class TaskCard extends StatelessWidget {
  final String title;
  final String pickup;
  final String drop;
  final String price;
  final String time;

  const TaskCard({
    super.key,
    required this.title,
    required this.pickup,
    required this.drop,
    required this.price,
    required this.time,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.cardColor,
        borderRadius: BorderRadius.circular(16),
        // FIXED: Using withValues instead of withOpacity
        border: Border.all(color: theme.dividerColor.withValues(alpha: 0.1)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ICON BOX
              Container(
                height: 48,
                width: 48,
                decoration: BoxDecoration(
                  // FIXED: Using withValues
                  color: theme.primaryColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(PhosphorIcons.hamburger(), color: theme.primaryColor),
              ),
              const SizedBox(width: 16),
              
              // DETAILS
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    const SizedBox(height: 4),
                    _buildIconText(PhosphorIcons.storefront(), pickup, Colors.grey),
                    const SizedBox(height: 2),
                    Icon(PhosphorIcons.arrowDown(PhosphorIconsStyle.bold), size: 12, color: theme.primaryColor),
                    const SizedBox(height: 2),
                    _buildIconText(PhosphorIcons.mapPin(), drop, theme.primaryColor),
                  ],
                ),
              ),
              
              // PRICE & TIME
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.green.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(price, style: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
                  ),
                  const SizedBox(height: 8),
                  Text(time, style: TextStyle(color: Colors.grey[400], fontSize: 11)),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildIconText(IconData icon, String text, Color color) {
    return Row(
      children: [
        Icon(icon, size: 14, color: color),
        const SizedBox(width: 4),
        Text(text, style: TextStyle(color: color == Colors.grey ? Colors.grey[600] : color, fontSize: 13)),
      ],
    );
  }
}