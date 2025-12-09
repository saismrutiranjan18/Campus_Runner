class AppValidators {
  // Enforces University Email Policy
  static String? validateEmail(String? value) {
    if (value == null || value.isEmpty) {
      return 'Email is required';
    }
    // Regex to check if email ends with .edu or .edu.in or similar academic domains
    // You can customize this to your specific college domain, e.g., "@srm.edu.in"
    final bool isEduEmail = value.contains('.edu');
    
    if (!value.contains('@')) {
      return 'Please enter a valid email';
    }
    if (!isEduEmail) {
      return 'Please use your college (.edu) email ID';
    }
    return null;
  }

  // Ensures Price is reasonable (e.g., not ₹0 or ₹10,000)
  static String? validatePrice(String? value) {
    if (value == null || value.isEmpty) {
      return 'Enter amount';
    }
    final amount = int.tryParse(value);
    if (amount == null) return 'Invalid number';
    if (amount < 10) return 'Min ₹10';
    if (amount > 500) return 'Max ₹500';
    return null;
  }

  static String? validateRequired(String? value, String fieldName) {
    if (value == null || value.isEmpty) {
      return '$fieldName is required';
    }
    return null;
  }
}