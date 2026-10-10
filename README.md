# Poultry Farm

A React Native mobile application for managing poultry farming operations.

## Overview

Poultry Farm is a mobile app designed to help farmers efficiently manage their poultry operations. Whether you're tracking livestock, managing feed inventory, or monitoring farm activities, this app provides an intuitive interface to streamline your daily tasks.

## Features

- 🐔 Livestock management
- 📊 Inventory tracking
- 📅 Activity logging
- 📱 Cross-platform support (iOS & Android)

## Tech Stack

- **React Native** - Cross-platform mobile development
- **TypeScript** - Type-safe development
- **Metro** - JavaScript bundler for React Native

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v14 or higher)
- npm or Yarn
- For iOS: Xcode and CocoaPods
- For Android: Android Studio and Android SDK

### Installation

1. Clone the repository
```bash
git clone https://github.com/tinah-67/poultryfarm.git
cd poultryfarm
```

2. Install dependencies
```bash
npm install
# or
yarn install
```

### Running the App

#### Start Metro (development server)
```bash
npm start
# or
yarn start
```

#### Run on Android
```bash
npm run android
# or
yarn android
```

#### Run on iOS
First, install CocoaPods dependencies:
```bash
bundle install
bundle exec pod install
```

Then run the app:
```bash
npm run ios
# or
yarn ios
```

### Development

To make changes to the app:

1. Edit files (particularly `App.tsx`)
2. Changes will automatically reload with **Fast Refresh**
3. To force a full reload:
   - **Android**: Press `R` twice or access Dev Menu with `Ctrl + M` (Windows/Linux) or `Cmd + M` (macOS)
   - **iOS**: Press `R` in the iOS Simulator

## Troubleshooting

If you encounter issues:

1. Clear cache and reinstall dependencies:
```bash
npm install --legacy-peer-deps
# or
yarn install
```

2. For iOS issues, try:
```bash
cd ios && rm -rf Pods Podfile.lock
cd ..
bundle exec pod install
```

3. Consult the [React Native Troubleshooting Guide](https://reactnative.dev/docs/troubleshooting)

## Learn More

- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [React Native Blog](https://reactnative.dev/blog)
- [CocoaPods Guide](https://guides.cocoapods.org)

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

Happy farming! 🚜
