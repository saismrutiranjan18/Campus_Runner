import 'package:intl/intl.dart';

class AppFormatters {
  // Converts 20 -> "₹20"
  static String formatCurrency(int amount) {
    final format = NumberFormat.simpleCurrency(locale: 'en_IN', decimalDigits: 0);
    return format.format(amount);
  }

  // Converts DateTime -> "2 mins ago"
  static String formatTimeAgo(DateTime date) {
    final Duration diff = DateTime.now().difference(date);
    
    if (diff.inMinutes < 1) return "Just now";
    if (diff.inMinutes < 60) return "${diff.inMinutes} mins ago";
    if (diff.inHours < 24) return "${diff.inHours} hours ago";
    return DateFormat('dd MMM, hh:mm a').format(date);
  }
}