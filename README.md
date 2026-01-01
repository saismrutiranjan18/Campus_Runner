#  Campus Runner
### A Smart Campus Delivery & Errand Service Platform 🎓

[![Flutter](https://img.shields.io/badge/Flutter-3.0+-02569B?logo=flutter)](https://flutter.dev)
[![Dart](https://img.shields.io/badge/Dart-3.0+-0175C2?logo=dart)](https://dart.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Contributions Welcome](https://img.shields.io/badge/Contributions-Welcome-blue.svg)](CONTRIBUTING.md)

---

##  Overview

**Campus Runner** is a cross-platform mobile application built with Flutter that connects students who need quick deliveries or errands done with other students willing to earn money by fulfilling these requests. Whether it's grabbing lunch, picking up notes, or delivering packages within campus, Campus Runner makes student life easier and creates earning opportunities.

This platform promotes a collaborative campus economy where students help each other while building a strong community network.

---

##  Objectives

-  Enable peer-to-peer campus delivery and errands
-  Create earning opportunities for students
-  Provide quick and reliable on-campus services
-  Ensure safe and verified transactions
-  Build a connected campus community

---

##  Key Features

### For Requesters (Customers)
-  **Quick Service Requests** - Post delivery or errand requests instantly
- **Live Tracking** - Track your runner's location in real-time
-  **Multiple Payment Options** - UPI, Wallet, Cash on Delivery
-  **Rating System** - Rate and review runners
-  **Push Notifications** - Real-time updates on request status
-  **In-App Chat** - Communicate with your runner

### General Features
-  **Secure Authentication** - Email/Phone verification
-  **User Profiles** - Complete profile with verification
-  **Smart Notifications** - Stay updated on all activities
-  **Analytics** - View usage statistics and trends
- **Dark Mode Support** - Easy on the eyes
-  **Multi-language Support** - Accessible to all students

---

##  Project Structure

```
campus_runner/
│
├── android/                  # Android-specific native code
├── ios/                      # iOS-specific native code
├── lib/                      # Main Dart application code
│   ├── models/              # Data models
│   │   ├── user_model.dart
│   │   ├── request_model.dart
│   │   └── transaction_model.dart
│   ├── screens/             # UI screens
│   │   ├── auth/           # Authentication screens
│   │   ├── home/           # Home & dashboard
│   │   ├── requests/       # Request management
│   │   ├── profile/        # User profile
│   │   └── tracking/       # Live tracking
│   ├── widgets/            # Reusable UI components
│   │   ├── custom_button.dart
│   │   ├── request_card.dart
│   │   └── runner_card.dart
│   ├── services/           # Backend services
│   │   ├── api_service.dart
│   │   ├── auth_service.dart
│   │   ├── location_service.dart
│   │   └── notification_service.dart
│   ├── providers/          # State management
│   │   ├── auth_provider.dart
│   │   ├── request_provider.dart
│   │   └── user_provider.dart
│   ├── utils/              # Utility functions
│   │   ├── constants.dart
│   │   ├── helpers.dart
│   │   └── validators.dart
│   └── main.dart           # Application entry point
│
├── assets/                  # Static assets
│   ├── images/
│   ├── icons/
│   └── fonts/
│
├── test/                    # Unit and widget tests
├── .vscode/                 # VS Code settings
├── linux/                   # Linux platform support
├── macos/                   # macOS platform support
├── web/                     # Web platform support
├── windows/                 # Windows platform support
│
├── pubspec.yaml            # Dependencies configuration
├── analysis_options.yaml   # Dart analyzer settings
├── .gitignore
├── README.md
└── LICENSE
```

---

##  Technologies Used

### Frontend
- **Flutter** - Cross-platform UI framework
- **Dart** - Programming language
- **Provider/Riverpod** - State management
- **Google Maps Flutter** - Maps and location services

### Backend & Services
- **Firebase Authentication** - User authentication
- **Cloud Firestore** - Real-time database
- **Firebase Cloud Messaging** - Push notifications
- **Firebase Storage** - Media storage
- **Google Maps API** - Location and navigation

### Tools & Libraries
- **geolocator** - Location tracking
- **flutter_local_notifications** - Local notifications
- **image_picker** - Image selection
- **shared_preferences** - Local storage
- **http/dio** - API calls
- **intl** - Internationalization

---

##  Installation & Setup

### Prerequisites
- Flutter SDK (3.0 or higher)
- Dart SDK (3.0 or higher)
- Android Studio / VS Code
- Xcode (for iOS development)
- Firebase account

### Steps

#### 1. Clone the Repository
```bash
git clone https://github.com/saismrutiranjan18/Campus_Runner.git
cd Campus_Runner
```

#### 2. Install Dependencies
```bash
flutter pub get
```

#### 3. Firebase Setup
1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Add Android app (package name: com.yourcompany.campus_runner)
3. Download `google-services.json` and place it in `android/app/`
4. Add iOS app (bundle ID: com.yourcompany.campusRunner)
5. Download `GoogleService-Info.plist` and place it in `ios/Runner/`
6. Enable Authentication, Firestore, and Cloud Messaging in Firebase

#### 4. Configure Google Maps
1. Get API key from [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Maps SDK for Android and iOS
3. Add the API key:
   - **Android**: In `android/app/src/main/AndroidManifest.xml`
   ```xml
   <meta-data
       android:name="com.google.android.geo.API_KEY"
       android:value="YOUR_API_KEY_HERE"/>
   ```
   - **iOS**: In `ios/Runner/AppDelegate.swift`
   ```swift
   GMSServices.provideAPIKey("YOUR_API_KEY_HERE")
   ```

#### 5. Run the App
```bash
# Check available devices
flutter devices

# Run on connected device
flutter run

# Build for production
flutter build apk --release  # Android
flutter build ios --release  # iOS
```

---

##  Screenshots

<!-- Add your app screenshots here -->
| Home Screen | Request Details | Live Tracking |
|------------|----------------|---------------|
| ![Home](screenshots/home.png) | ![Details](screenshots/details.png) | ![Tracking](screenshots/tracking.png) |

| Runner Dashboard | Chat | Profile |
|-----------------|------|---------|
| ![Dashboard](screenshots/dashboard.png) | ![Chat](screenshots/chat.png) | ![Profile](screenshots/profile.png) |

---

##  Configuration

### Environment Variables
Create a `.env` file in the root directory:
```env
GOOGLE_MAPS_API_KEY=your_api_key_here
FIREBASE_API_KEY=your_firebase_key_here
PAYMENT_GATEWAY_KEY=your_payment_key_here
```

### App Constants
Edit `lib/utils/constants.dart` to configure app-specific settings:
```dart
class AppConstants {
  static const String appName = 'Campus Runner';
  static const double minimumDeliveryFee = 20.0;
  static const double maxDeliveryRadius = 5.0; // km
  static const int requestTimeout = 300; // seconds
}
```

---

##  Testing

```bash
# Run all tests
flutter test

# Run with coverage
flutter test --coverage

# Run integration tests
flutter test integration_test/
```

---

##  Future Enhancements

-  **AI-Based Route Optimization** - Smart routing for multiple deliveries
-  **Subscription Plans** - Premium features for frequent users
-  **Campus Store Integration** - Direct ordering from campus shops
-  **Advanced Analytics** - Detailed insights for runners
-  **Gamification** - Badges, leaderboards, and achievements
-  **Multi-Campus Support** - Expand to multiple universities
-  **Voice Commands** - Hands-free operation
-  **Multiple Transport Modes** - Walking, cycling, vehicle options
-  **Cryptocurrency Payments** - Crypto wallet integration
-  **Carbon Footprint Tracking** - Track environmental impact

---

##  Contributing

We welcome contributions from the community! Here's how you can help:

### How to Contribute
1. Fork the repository
2.  Create a new branch (`git checkout -b feature/AmazingFeature`)
3. Make your changes
4.  Commit your changes (`git commit -m 'Add some AmazingFeature'`)
5.  Push to the branch (`git push origin feature/AmazingFeature`)
6.  Open a Pull Request

### Contribution Guidelines
- Write clean, documented code
- Follow Flutter/Dart style guidelines
- Add tests for new features
- Update documentation as needed
- Be respectful and constructive

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

---

##  Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

---

##  Known Issues

- [ ] iOS push notifications occasionally delayed
- [ ] Map rendering slow on older devices
- [ ] Chat images take time to load on slow networks

See the [Issues](https://github.com/saismrutiranjan18/Campus_Runner/issues) page for a full list.

---

##  License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2025 Sai Smruti Ranjan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction...
```

---

##  Team

**Project Lead & Developer**
- Sai Smruti Ranjan - [@saismrutiranjan18](https://github.com/saismrutiranjan18)

**Contributors**
- See [CONTRIBUTORS.md](CONTRIBUTORS.md) for a list of contributors

---

##  Contact & Support

-  **Email**: saismrutiranjan18@example.com
-  **Discord**: [Join our server](https://discord.gg/yourserver)
- **Twitter**: [@campusrunner](https://twitter.com/campusrunner)
-  **Website**: [campusrunner.app](https://campusrunner.app)

For bug reports and feature requests, please use [GitHub Issues](https://github.com/saismrutiranjan18/Campus_Runner/issues).

---

##  Acknowledgments

- Flutter team for the amazing framework
- Google Maps Platform for location services
- Firebase for backend infrastructure
- All contributors and testers
- Campus community for support and feedback

---

##  Project Stats

![GitHub stars](https://img.shields.io/github/stars/saismrutiranjan18/Campus_Runner?style=social)
![GitHub forks](https://img.shields.io/github/forks/saismrutiranjan18/Campus_Runner?style=social)
![GitHub issues](https://img.shields.io/github/issues/saismrutiranjan18/Campus_Runner)
![GitHub pull requests](https://img.shields.io/github/issues-pr/saismrutiranjan18/Campus_Runner)
![GitHub last commit](https://img.shields.io/github/last-commit/saismrutiranjan18/Campus_Runner)

---

##  Show Your Support

If you like this project, please consider:
-  Starring the repository
-  Forking and contributing
-  Sharing with friends
- Reporting bugs
-  Suggesting new features

---

##  Deployment

### Android
```bash
flutter build apk --release
flutter build appbundle --release
```

### iOS
```bash
flutter build ios --release
```

### Web
```bash
flutter build web --release
```

---

##  Download

[<img src="https://play.google.com/intl/en_us/badges/images/generic/en_badge_web_generic.png" alt="Get it on Google Play" height="80">](https://play.google.com/store)
[<img src="https://developer.apple.com/app-store/marketing/guidelines/images/badge-download-on-the-app-store.svg" alt="Download on App Store" height="80">](https://apps.apple.com)

---

<div align="center">

** Built with ❤️ by students, for students**

*Making campus life easier, one delivery at a time!*

[Report Bug](https://github.com/saismrutiranjan18/Campus_Runner/issues) • [Request Feature](https://github.com/saismrutiranjan18/Campus_Runner/issues) • [Documentation](https://github.com/saismrutiranjan18/Campus_Runner/wiki)

</div>
