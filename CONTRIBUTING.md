# Contributing to Campus Runner 🎓🏃

Thank you for your interest in contributing to **Campus Runner**! Whether you're fixing a bug, adding a feature, improving docs, or reporting an issue — every contribution is welcome and appreciated.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [How to Contribute](#how-to-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Features](#suggesting-features)
  - [Submitting Code](#submitting-code)
- [Development Setup](#development-setup)
- [Coding Guidelines](#coding-guidelines)
- [Commit Message Convention](#commit-message-convention)
- [Pull Request Process](#pull-request-process)
- [Platform-Specific Notes](#platform-specific-notes)

---

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone. Be kind, constructive, and collaborative.

---

## Getting Started

1. **Fork** the repository by clicking the "Fork" button on GitHub.
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/<your-username>/Campus_Runner.git
   cd Campus_Runner
   ```
3. **Add the upstream remote** to stay in sync:
   ```bash
   git remote add upstream https://github.com/saismrutiranjan18/Campus_Runner.git
   ```

---

## Project Structure

```
Campus_Runner/
├── lib/           # Dart source code (main app logic & UI)
├── android/       # Android platform-specific code
├── ios/           # iOS platform-specific code
├── linux/         # Linux desktop platform code
├── macos/         # macOS desktop platform code
├── windows/       # Windows desktop platform code
├── web/           # Web platform code
├── pubspec.yaml   # Flutter dependencies & project config
└── analysis_options.yaml  # Dart lint rules
```

The primary source of truth is the `lib/` directory — most of your Dart/Flutter work will happen there.

---

## How to Contribute

### Reporting Bugs

Before opening a bug report, please:
- Search [existing issues](https://github.com/saismrutiranjan18/Campus_Runner/issues) to avoid duplicates.

When filing a bug, include:
- **Platform** (Android, iOS, Web, Windows, macOS, Linux)
- **Flutter version** (`flutter --version`)
- **Steps to reproduce** the issue
- **Expected vs. actual behavior**
- **Screenshots or logs** if applicable

### Suggesting Features

Open an issue with the title prefix `[Feature Request]:` and describe:
- The problem you're trying to solve
- Your proposed solution
- Any alternatives you considered

### Submitting Code

1. Pick an open issue or create one first to discuss the change.
2. Create a new branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```
3. Make your changes, test thoroughly, and commit.
4. Push to your fork and open a Pull Request.

---

## Development Setup

### Prerequisites

| Tool | Minimum Version |
|------|----------------|
| Flutter SDK | 3.x |
| Dart SDK | 3.x (bundled with Flutter) |
| Android Studio / Xcode | Latest stable |
| Git | Any recent version |

### Install dependencies

```bash
flutter pub get
```

### Run the app

```bash
# On connected Android/iOS device or emulator
flutter run

# On specific platform
flutter run -d chrome       # Web
flutter run -d windows      # Windows
flutter run -d linux        # Linux
flutter run -d macos        # macOS
```

### Run tests

```bash
flutter test
```

### Analyze code

```bash
flutter analyze
```

---

## Coding Guidelines

- Follow the [Effective Dart](https://dart.dev/guides/language/effective-dart) style guide.
- Run `flutter analyze` before every commit — fix any warnings or errors.
- Format your code with:
  ```bash
  dart format .
  ```
- Keep widgets small and composable — prefer extracting reusable widgets.
- Use meaningful variable and function names.
- Add comments for non-obvious logic.
- Avoid hardcoded strings — use constants or localization where applicable.

---

## Commit Message Convention

Use clear, imperative commit messages following this format:

```
<type>: <short description>

[optional body]
```

**Types:**

| Type | When to use |
|------|-------------|
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation changes only |
| `style` | Formatting, missing semicolons, etc. (no logic change) |
| `refactor` | Code restructuring without behavior change |
| `test` | Adding or updating tests |
| `chore` | Build process, dependency updates, tooling |

**Examples:**
```
feat: add campus map screen with route highlighting
fix: resolve crash on Android when navigating back from event page
docs: update README with setup instructions
```

---

## Pull Request Process

1. Ensure your branch is up to date with `main`:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```
2. Make sure `flutter analyze` passes with no issues.
3. Write a clear PR description:
   - What problem does it solve?
   - What changes were made?
   - How was it tested?
   - Link any related issues (e.g., `Closes #12`)
4. Request a review from the maintainer.
5. Be responsive to feedback — PRs with no activity for 14 days may be closed.

> **Note:** PRs that break existing functionality or fail analysis will not be merged until resolved.

---

## Platform-Specific Notes

- **Android:** Changes in `android/` must be tested on an emulator or physical device.
- **iOS:** Requires a macOS machine with Xcode installed. Run `pod install` inside the `ios/` directory if you update native dependencies.
- **Web:** Test with `flutter run -d chrome`. Avoid platform-specific APIs not available on web.
- **Desktop (Windows/Linux/macOS):** Ensure you have the required build tools for the respective platform. See [Flutter desktop docs](https://docs.flutter.dev/desktop).

---

## Questions?

Feel free to open an [issue](https://github.com/saismrutiranjan18/Campus_Runner/issues) or start a [discussion](https://github.com/saismrutiranjan18/Campus_Runner/discussions) if you have any questions.

Happy coding! 🚀
