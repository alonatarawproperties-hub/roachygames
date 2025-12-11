# Roachy Games - P2E Arcade Platform

## Overview
Roachy Games is an arcade platform for play-to-earn (P2E) games featuring Roachies (cockroach-themed creatures). The platform launches with Roachy Hunt and plans to add more games, aiming to create an engaging P2E ecosystem on the Solana blockchain.

## User Preferences
- Custom Roachy images to be provided later (currently using class icons)
- Bundle identifiers kept as "com.cryptocreatures.app"
- Future: Wallet connection and NFT minting via marketplace dApp

## System Architecture

### High-Level Design
The project is built as an arcade platform with a clear separation between platform-wide features and game-specific functionalities. It supports multiple games, starting with "Roachy Hunt," and is designed for scalability to integrate more P2E games.

### Frontend (Expo/React Native)
The client is developed using Expo and React Native, ensuring cross-platform compatibility (iOS, Android, and web with specific fallbacks).

**Key Features:**
- **Arcade Home (Platform-Wide Only):** Central hub for game selection, token balances, live player counts, and access to rewards, profile, and marketplace links. Contains only platform-wide features:
    - Home Tab: Featured games, game tiles, search
    - Games Tab: Full game catalog
    - Rewards Tab: Daily login bonus, earnings tracker, game shortcuts (no game-specific leaderboards/achievements)
    - Profile Tab: Wallet connection, user info, account settings
- **Roachy Hunt Game:**
    - GPS-based creature hunting with an "AR-like" camera encounter system for catching Roachies.
    - 12 unique Roachies across 4 classes and 5 rarity tiers.
    - Egg collection and hatching system with Mystery and Roachy eggs.
    - In-game economy with energy/pity mechanics.
    - Player engagement features: Onboarding flow, Earnings Tracker, Activity History, Achievement Badges, and Leaderboards (game-specific).
    - Unified Egg System: All spawns appear as mystery golden markers on the map, revealing creature type only upon encounter.
    - Advanced GPS: Uses `Location.Accuracy.BestForNavigation` for high accuracy, with directional arrow on the map.
    - Map: Interactive dark-themed Leaflet WebView map (Expo Go compatible) with custom markers and a 100m catch radius.
- **UI/UX:** Adheres to a gold/brown theme with distinct class colors for Roachies (Tank: Green, Assassin: Red, Mage: Purple, Support: Cyan).
- **Wallet Integration UI:** Components for displaying token balances, network status, and wallet connection/disconnection.

**Folder Structure (Client):**
- `client/App.tsx`: Root component.
- `client/components/`: Reusable UI components (e.g., `ArcadeHeader`, `GameTile`, `Button`, `Card`, `CreatureCard`).
- `client/constants/`: Game data, creature definitions, game catalog, and design theme.
- `client/navigation/`: Stack and tab navigators for app flow.
- `client/screens/`: Screen-specific UI for Arcade, Catch, Inventory, etc.

### Backend (Express)
A simple Express.js server handles API routes and data storage.
- `server/index.ts`: Entry point.
- `server/hunt-routes.ts`: API routes specific to Roachy Hunt.
- `server/storage.ts`: Database storage handling.

### Game Catalog
- **Roachy Hunt (LIVE):** GPS-based creature hunting, catch, collect, battle.
- **Coming Soon:** Roachy Battles (PvP), Flappy Roach (endless runner), Roachy Mate (breeding/evolution).

## External Dependencies

### Blockchain Integration
- **Solana Blockchain:** The underlying blockchain for P2E mechanics and assets.

### Wallet Integration
- **Direct Deep-Link Protocol (tweetnacl encryption):**
    - **Phantom Wallet:** Primary supported wallet.
    - **Solflare Wallet:** Alternative supported wallet.
    - **Backpack Wallet:** Additional supported wallet.
    - Uses `tweetnacl` for X25519 keypair generation and encryption/decryption, `tweetnacl-util` for encoding/decoding, and `bs58` for Base58 encoding.
- **Reown AppKit SDK:** Used for WalletConnect-compatible wallets, platform-specific implementation for native builds. Requires `WALLETCONNECT_PROJECT_ID`.

### Mapping and Location
- **OpenStreetMap tiles:** Used for the Leaflet WebView map fallback.
- **Google Maps API Key:** Required for future upgrades to native Google Maps on Android.
- **Apple Developer Account:** Required for future upgrades to native Apple Maps on iOS.

**CRITICAL: Dual Map Implementation**
- `MapViewWrapper.tsx` has TWO map implementations that must stay in sync:
  1. **Native maps (`react-native-maps`)** - Used in production iOS/Android TestFlight builds
  2. **Leaflet WebView fallback (`LeafletMapView.tsx`)** - Used in Expo Go and when native maps fail
- When adding map features (controls, indicators, overlays), you MUST update BOTH implementations
- Native map controls are React Native components; Leaflet controls are HTML/JS in the WebView template
- Features to keep synchronized: GPS indicator, map controls position, button animations, heading arrow

### Build and Deployment
- **Expo SDK 53:** Core framework for React Native development.
- **EAS Build:** Used for creating development, preview, and production builds, especially for native capabilities like full Apple/Google Maps.

## Pending Actions (December 11, 2025)

### Submit Build 79 to TestFlight
- **Status:** Build 79 is ready, waiting for Apple upload limit to reset (~24 hours)
- **Build ID:** 2b943211-d0d0-427c-9a24-245d8653e956
- **IPA URL:** https://expo.dev/artifacts/eas/6o7Hz9z8gCkPRWdAEgzpTU.ipa
- **Fixes included:**
  - LeafletMapView controls repositioned to `bottom: 140px` (above tab bar)
  - Location info repositioned to `bottom: 140px` (above tab bar)
  - 118 active spawns in database near user location (14.676, 121.043)
- **Command to submit:** `npx eas-cli submit --platform ios --id 2b943211-d0d0-427c-9a24-245d8653e956 --non-interactive`

### Current TestFlight Build
- Build 76 is currently on TestFlight (has UI positioning bugs)

## Cross-Platform Integration (roachy.games)

### Architecture
- **Mobile App (this Replit):** Game backend for Roachy Hunt (spawns, catching, eggs, GPS gameplay)
- **Web App (roachy.games):** Landing page, marketplace, trading, analytics
- **Shared Identity:** Wallet address (Phantom/Solflare) is the universal user ID across both platforms

### Integration Points
1. **Marketplace Button:** Profile screen has "Marketplace" button that opens roachy.games
2. **Deep Linking:** App responds to `roachy-games://` scheme and `https://roachy.games/app/*` links
3. **Universal Links (iOS):** Associated domains configured for `applinks:roachy.games`
4. **Intent Filters (Android):** Configured for `https://roachy.games/app/*`

### To Complete Integration (on roachy.games web app)
1. Add `/.well-known/apple-app-site-association` file for iOS universal links
2. Add `/.well-known/assetlinks.json` file for Android app links
3. Add "Open in App" buttons that link to `roachy-games://` scheme
4. Share database or sync inventory via wallet-based API calls