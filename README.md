# Campus Runner
### A Smart Campus Delivery & Errand Service Platform 🎓

[![Flutter](https://img.shields.io/badge/Flutter-3.0+-02569B?logo=flutter)](https://flutter.dev)
[![Dart](https://img.shields.io/badge/Dart-3.0+-0175C2?logo=dart)](https://dart.dev)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Contributions Welcome](https://img.shields.io/badge/Contributions-Welcome-blue.svg)](CONTRIBUTING.md)

---

## Overview

**Campus Runner** is a full-stack platform that connects students who need quick deliveries or errands done on campus with other students willing to earn money by fulfilling those requests. Whether it's grabbing lunch, picking up notes, or delivering packages within campus, Campus Runner makes student life easier and creates earning opportunities.

The platform consists of three components:

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Mobile App** | Flutter / Dart | Cross-platform app for requesters and runners |
| **Backend API** | Node.js / Express / MongoDB | REST API, business logic, and data persistence |
| **Web Client** | React / Vite | Admin dashboard and web interface |

---

## Objectives

- Enable peer-to-peer campus delivery and errands
- Create earning opportunities for students
- Provide quick and reliable on-campus services
- Ensure safe and verified transactions
- Build a connected campus community

---

## Key Features

### For Requesters (Customers)
- **Quick Service Requests** — Post delivery or errand requests instantly
- **Live Tracking** — Track your runner's location in real-time
- **Wallet & Payments** — In-app wallet with top-up and withdrawal
- **Rating & Disputes** — Rate runners and raise disputes when needed
- **Push Notifications** — Real-time updates on request status

### For Runners
- **Task Feed** — Browse open tasks filtered by campus
- **Smart Routing** — Optimised routes via Google Maps Directions API
- **Earnings Dashboard** — Track completed tasks and income
- **Leaderboard** — Compete with other runners for bonus incentives
- **Performance Stats** — View acceptance rate, completion rate, and more

### Platform Features
- **Dual Mode** — Run with Firebase backend or in offline *demo mode* (no Firebase required)
- **Secure Authentication** — Phone / email + JWT session management
- **Dynamic Pricing Engine** — Price adjusts based on distance, urgency, zone, and demand
- **Referral & Promotions** — Invite codes and discount coupons
- **Fraud Detection** — Automatic flagging of suspicious activity
- **Idempotency** — Safe retries on critical write APIs
- **Maintenance Mode** — Pause the platform with a single admin toggle
- **Dark Mode** — Full Material 3 light/dark theming

---

## Project Structure

```
Campus_Runner/
│
├── lib/                          # Flutter mobile app (Dart)
│   ├── core/                     # App-wide utilities
│   │   ├── config/
│   │   │   └── app_mode.dart     # Feature flag: ENABLE_BACKEND
│   │   ├── constants/            # App colours & constants
│   │   ├── themes/               # Riverpod theme provider
│   │   └── utils/                # Formatters & validators
│   │
│   ├── data/                     # Data layer
│   │   ├── models/               # Dart data classes (TaskModel, UserModel, …)
│   │   ├── repositories/         # Firestore data access (auth, task, user, …)
│   │   └── services/             # Business services (location, notifications,
│   │                             #   smart routing, ETA, transactions, …)
│   │
│   ├── logic/                    # State management (Riverpod providers)
│   │   ├── auth_provider.dart
│   │   ├── task_provider.dart
│   │   ├── user_provider.dart
│   │   ├── campus_provider.dart
│   │   ├── active_order_provider.dart
│   │   ├── location_provider.dart
│   │   ├── shop_provider.dart
│   │   ├── storage_provider.dart
│   │   └── transaction_provider.dart
│   │
│   ├── presentation/             # UI layer
│   │   ├── screens/
│   │   │   ├── auth/             # Login & phone verification
│   │   │   ├── home/             # Runner & requester home screens,
│   │   │   │                     #   campus browser, smart route, shop
│   │   │   ├── profile/          # Profile, edit profile, wallet
│   │   │   ├── tracking/         # Live tracking, my tasks, leaderboard
│   │   │   ├── transactions/     # Runner earnings screen
│   │   │   ├── leaderboard/      # Global leaderboard
│   │   │   ├── task_history/     # Completed task history
│   │   │   └── splash_screen.dart
│   │   └── widgets/
│   │       ├── cards/            # Task, zone, earnings, timeline cards
│   │       ├── dialogs/          # OTP dialog
│   │       ├── fields/           # Custom text field
│   │       ├── inputs/           # Primary button
│   │       └── loaders/          # Aurora skeleton loader
│   │
│   └── main.dart                 # App entry point
│
├── backend/                      # Node.js REST API
│   └── src/
│       ├── controllers/          # Request handlers (auth, task, wallet, admin, …)
│       ├── routes/               # Express routers (auth, tasks, wallet, disputes, …)
│       ├── models/               # Mongoose schemas (User, Task, WalletTransaction, …)
│       ├── services/             # Business logic (pricing, fraud, settlement,
│       │                         #   incentives, promotions, referrals, …)
│       ├── middlewares/          # Auth (JWT), rate limiting, idempotency,
│       │                         #   maintenance mode, error handling
│       ├── background/           # Cron/monitor jobs (task expiry monitor)
│       ├── db/                   # MongoDB connection
│       ├── docs/                 # Swagger / OpenAPI spec
│       ├── utils/                # ApiError, ApiResponse, asyncHandler, …
│       ├── constants.js
│       ├── app.js                # Express app setup
│       └── index.js              # Server entry point
│   ├── test/                     # 25+ integration test files (Node test runner)
│   ├── sample.env                # Environment variable template
│   └── package.json
│
├── web-client/                   # React admin web client
│   └── src/
│       ├── api/                  # API call helpers
│       ├── components/           # Reusable React components
│       ├── context/              # React context providers
│       ├── App.jsx
│       └── main.jsx
│   ├── vite.config.js
│   └── package.json
│
├── android/                      # Android native wrapper
├── ios/                          # iOS native wrapper
├── web/                          # Flutter web build target
├── linux/                        # Flutter Linux build target
├── macos/                        # Flutter macOS build target
├── windows/                      # Flutter Windows build target
│
├── scripts/                      # Utility scripts
│   ├── vercel-build.sh           # Vercel deployment helper
│   └── migrate_user_earnings.dart
│
├── firestore.indexes.json        # Firestore composite index definitions
├── firestore.rules               # Firestore security rules
├── storage.rules                 # Firebase Storage security rules
├── vercel.json                   # Vercel deployment config
├── pubspec.yaml                  # Flutter dependencies
├── analysis_options.yaml         # Dart analyser settings
└── README.md
```

---

## Technologies Used

### Mobile App (Flutter)
| Library | Purpose |
|---------|---------|
| `flutter_riverpod` | State management |
| `flex_color_scheme` | Material 3 theming (Bahama Blue palette) |
| `google_fonts` (Poppins) | Typography |
| `firebase_core / firebase_auth` | Authentication |
| `cloud_firestore` | Real-time database |
| `firebase_storage` | File/image storage |
| `google_maps_flutter` | Maps and live tracking |
| `geolocator` | Device GPS |
| `flutter_background_service` | Background location updates |
| `flutter_local_notifications` | Local push notifications |
| `flutter_animate` | Animations |
| `skeletonizer` | Skeleton loading states |
| `connectivity_plus` | Network status |
| `shared_preferences` | Local key-value storage |
| `file_picker` | File and image selection |
| `speech_to_text` | Voice input |
| `cached_network_image` | Image caching |
| `http` | HTTP requests |
| `intl` | Internationalisation / date formatting |

### Backend API (Node.js)
| Library | Purpose |
|---------|---------|
| `express` v5 | HTTP server framework |
| `mongoose` | MongoDB ODM |
| `jsonwebtoken` | JWT auth tokens |
| `bcryptjs` | Password hashing |
| `cookie-parser` | Cookie-based token delivery |
| `cors` | Cross-origin resource sharing |
| `swagger-ui-express` | Interactive API docs at `/api-docs` |
| `dotenv` | Environment variable loading |
| `nodemon` | Dev auto-reload |
| `mongodb-memory-server` | In-memory MongoDB for tests |
| `supertest` | HTTP integration testing |

### Web Client (React)
| Library | Purpose |
|---------|---------|
| `react` + `react-dom` v18 | UI framework |
| `react-router-dom` v6 | Client-side routing |
| `vite` + `@vitejs/plugin-react` | Build tool and dev server |

---

## Architecture Overview

### Mobile App — Clean Architecture

```
Presentation  →  Logic (Riverpod providers)  →  Data (repositories/services)  →  Firebase
```

- **`core/`** — Shared config, theming, constants, and utilities
- **`data/`** — All data access: Firestore repositories, Firebase services, external API calls
- **`logic/`** — Riverpod `Provider`, `StateProvider`, `StreamProvider` expose data to the UI
- **`presentation/`** — Stateless/`ConsumerWidget` screens read from providers; no business logic in widgets

The app supports a **demo mode** (`ENABLE_BACKEND=false` by default) where Firebase is not initialised and mock/local data is used. Pass `--dart-define=ENABLE_BACKEND=true` at build time to enable live Firebase connectivity.

### Backend — MVC + Service Layer

```
Routes  →  Middlewares  →  Controllers  →  Services  →  Mongoose Models  →  MongoDB
```

- **Routes** declare endpoints and attach middleware chains
- **Middlewares** handle authentication (JWT + session), role-based access, rate limiting, idempotency, and maintenance mode
- **Controllers** parse requests and call services
- **Services** encapsulate complex business logic (pricing, fraud detection, settlement, promotions, etc.)
- **Background jobs** (e.g., task expiry monitor) run as long-polling loops

All API endpoints are under `/api/v1/`. Interactive API documentation is served at `/api-docs` via Swagger UI.

---

## Installation & Setup

### Prerequisites
- Flutter SDK ≥ 3.9
- Dart SDK ≥ 3.9
- Node.js ≥ 18
- Android Studio / VS Code
- Xcode (for iOS development)
- MongoDB Atlas account (or local MongoDB)
- Firebase project (optional — only required for live mode)

---

### Mobile App

#### 1. Clone the repository
```bash
git clone https://github.com/saismrutiranjan18/Campus_Runner.git
cd Campus_Runner
```

#### 2. Install Flutter dependencies
```bash
flutter pub get
```

#### 3. Run in demo mode (no Firebase required)
```bash
flutter run
```

#### 4. Run with live Firebase backend
1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Add an Android app (package: `com.example.campus_runner`) and download `google-services.json` → `android/app/`
3. Add an iOS app (bundle ID: `com.example.campusRunner`) and download `GoogleService-Info.plist` → `ios/Runner/`
4. Enable Authentication (Email/Phone), Firestore, and Storage in Firebase
5. Configure Google Maps:
   - **Android** — add your key to `android/app/src/main/AndroidManifest.xml`:
     ```xml
     <meta-data
         android:name="com.google.android.geo.API_KEY"
         android:value="YOUR_MAPS_API_KEY"/>
     ```
   - **iOS** — add your key in `ios/Runner/AppDelegate.swift`:
     ```swift
     GMSServices.provideAPIKey("YOUR_MAPS_API_KEY")
     ```
6. Run with the backend feature flag:
   ```bash
   flutter run --dart-define=ENABLE_BACKEND=true
   ```

#### Build for production
```bash
flutter build apk --release --dart-define=ENABLE_BACKEND=true   # Android APK
flutter build appbundle --release --dart-define=ENABLE_BACKEND=true  # Android AAB
flutter build ios --release --dart-define=ENABLE_BACKEND=true   # iOS
flutter build web --release --dart-define=ENABLE_BACKEND=true   # Web
```

---

### Backend API

#### 1. Install dependencies
```bash
cd backend
npm install
```

#### 2. Configure environment variables
```bash
cp sample.env .env
# Edit .env with your values
```

```env
PORT=3000
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/<dbname>
CORS_ORIGIN=http://localhost:5173

ACCESS_TOKEN_SECRET=replace_with_strong_secret
ACCESS_TOKEN_EXPIRY=1d

REFRESH_TOKEN_SECRET=replace_with_strong_secret
REFRESH_TOKEN_EXPIRY=10d

NODE_ENV=development
```

#### 3. Start the server
```bash
npm run dev      # Development (nodemon auto-reload)
npm start        # Production
```

API base URL: `http://localhost:3000/api/v1`  
Swagger docs: `http://localhost:3000/api-docs`  
Health check: `http://localhost:3000/api/v1/health`

#### 4. Run backend tests
```bash
npm test
```

---

### Web Client

#### 1. Install dependencies
```bash
cd web-client
npm install
```

#### 2. Start the dev server
```bash
npm run dev      # Starts at http://localhost:5173
```

#### 3. Build for production
```bash
npm run build
```

---

## API Endpoints

| Prefix | Description |
|--------|-------------|
| `POST /api/v1/auth/*` | Register, login, refresh token, logout |
| `GET/PUT /api/v1/profile/*` | User profile management |
| `GET/POST /api/v1/tasks/*` | Task CRUD, accept, complete, cancel |
| `GET/POST /api/v1/wallet/*` | Wallet balance, top-up, withdraw |
| `POST /api/v1/disputes/*` | Raise and resolve disputes |
| `GET/POST /api/v1/referrals/*` | Referral codes and rewards |
| `GET/POST /api/v1/campuses/*` | Campus and zone configuration |
| `GET/POST /api/v1/admin/*` | Admin controls, analytics, exports |

Full interactive documentation is available at `/api-docs` when the backend is running.

---

## Screenshots

<!-- Add your app screenshots here -->
| Home Screen | Request Details | Live Tracking |
|------------|----------------|---------------|
| ![Home](screenshots/home.png) | ![Details](screenshots/details.png) | ![Tracking](screenshots/tracking.png) |

| Runner Dashboard | Earnings | Profile |
|-----------------|------|---------|
| ![Dashboard](screenshots/dashboard.png) | ![Earnings](screenshots/earnings.png) | ![Profile](screenshots/profile.png) |

---

## Testing

### Flutter
```bash
# Run all Flutter tests
flutter test

# Run with coverage
flutter test --coverage
```

### Backend
```bash
cd backend
npm test         # Runs all 25+ integration tests with Node's built-in test runner
```

---

## Future Enhancements

- **AI-Based Route Optimisation** — Smart routing for multiple deliveries
- **Subscription Plans** — Premium features for frequent users
- **Campus Store Integration** — Direct ordering from campus shops
- **Gamification** — Badges, achievements, and expanded leaderboards
- **Multi-Campus Support** — Expand to multiple universities
- **Voice Commands** — Hands-free request creation
- **Multiple Transport Modes** — Walking, cycling, vehicle options

---

## Contributing

We welcome contributions from the community!

### How to Contribute
1. Fork the repository
2. Create a new branch (`git checkout -b feature/AmazingFeature`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
5. Push to the branch (`git push origin feature/AmazingFeature`)
6. Open a Pull Request

### Contribution Guidelines
- Write clean, documented code
- Follow Flutter/Dart and Node.js style guidelines
- Add tests for new backend features
- Update documentation as needed
- Be respectful and constructive

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

---

## Known Issues

- [ ] iOS push notifications occasionally delayed
- [ ] Map rendering slow on older devices

See the [Issues](https://github.com/saismrutiranjan18/Campus_Runner/issues) page for a full list.

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## Team

**Project Lead & Developer**
- Sai Smruti Ranjan — [@saismrutiranjan18](https://github.com/saismrutiranjan18)

**Contributors**
- See [CONTRIBUTORS.md](CONTRIBUTORS.md) for a list of contributors

---

## Contact & Support

- **GitHub Issues**: [Report a bug or request a feature](https://github.com/saismrutiranjan18/Campus_Runner/issues)

---

## Acknowledgments

- Flutter team for the amazing framework
- Google Maps Platform for location services
- Firebase for backend infrastructure
- All contributors and testers
- Campus community for support and feedback

---

## Project Stats

![GitHub stars](https://img.shields.io/github/stars/saismrutiranjan18/Campus_Runner?style=social)
![GitHub forks](https://img.shields.io/github/forks/saismrutiranjan18/Campus_Runner?style=social)
![GitHub issues](https://img.shields.io/github/issues/saismrutiranjan18/Campus_Runner)
![GitHub pull requests](https://img.shields.io/github/issues-pr/saismrutiranjan18/Campus_Runner)
![GitHub last commit](https://img.shields.io/github/last-commit/saismrutiranjan18/Campus_Runner)

---

<div align="center">

**Built with ❤️ by students, for students**

*Making campus life easier, one delivery at a time!*

[Report Bug](https://github.com/saismrutiranjan18/Campus_Runner/issues) • [Request Feature](https://github.com/saismrutiranjan18/Campus_Runner/issues) • [Documentation](https://github.com/saismrutiranjan18/Campus_Runner/wiki)

</div>
