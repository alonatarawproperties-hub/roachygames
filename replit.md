# Roachy Games - P2E Arcade Platform

## Overview
Roachy Games is an arcade platform for play-to-earn (P2E) games featuring Roachies (cockroach-themed creatures) on the Solana blockchain. It launches with Roachy Hunt and plans to expand its game offerings, aiming to build an engaging P2E ecosystem. The platform integrates a simplified authentication system with Google, Wallet, and Guest options, and features native games like Roachy Hunt, Roachy Mate (chess), and Flappy Roachy. The business vision is to create a vibrant P2E gaming community with a clear path to market potential through engaging games and a robust token economy.

## User Preferences
- Custom Roachy images to be provided later (currently using class icons)
- Bundle identifiers kept as "com.cryptocreatures.app"
- Future: Wallet connection and NFT minting via marketplace dApp
- Deployment Preference: OTA updates can be pushed automatically. AAB/TestFlight builds require explicit user confirmation before building.

## System Architecture

### High-Level Design
The project uses an arcade platform architecture, separating platform-wide features from game-specific functionalities. It's designed for scalability, supporting multiple P2E games, starting with "Roachy Hunt."

### Frontend (Expo/React Native)
The client is built with Expo and React Native for cross-platform compatibility (iOS, Android, web).

**Key Features:**
- **Arcade Home:** Central hub for game selection, token balances, live player counts, and access to rewards, profile, and marketplace links. Includes Home, Games, Rewards, and Profile tabs.
- **Roachy Hunt Game:** GPS-based creature hunting with an "AR-like" camera system, 12 unique Roachies across 4 classes and 5 rarity tiers, egg collection and hatching, in-game economy with energy/pity mechanics. Features onboarding, earnings tracker, activity history, achievements, and game-specific leaderboards. Uses an interactive dark-themed Leaflet WebView map with custom markers and a 100m catch radius.
- **Native Games:**
    - **Roachy Mate (Chess):** Native chess game using `chess.js` with Unicode piece rendering, touch-move, board flip, move validation, and check/checkmate detection. Features a Weekend Arena Tournament system. **Stockfish AI** provides adjustable difficulty with 4 levels: Rookie (~1500 ELO), Club (~1800 ELO), Expert (~2200 ELO), Magnus (full strength ~3200+ ELO). AI runs server-side with minimum depth calculations for smarter play.
    - **Flappy Roachy:** Endless flyer game with an NFT skin system.
- **UI/UX:** Gold/brown theme with distinct class colors for Roachies (Tank: Green, Assassin: Red, Mage: Purple, Support: Cyan).
- **Authentication:** Login screen with "Sign in with Google" (OAuth via `expo-auth-session`), "Connect Wallet" (Phantom/Solflare signature), and "Continue as Guest" options. Guest users have restricted wallet features.
- **Daily Bonus Anti-Fraud:** Implements device fingerprinting, progressive rewards, new account cooldowns, and IP/User Agent tracking.
- **Dual Map Implementation:** `MapViewWrapper.tsx` contains two map implementations (Native maps using `react-native-maps` for production and Leaflet WebView fallback for Expo Go) that must be kept synchronized for all map features.

### Backend (Express)
An Express.js server handles API routes and data storage. It includes routes specific to Roachy Hunt, economy, and secure proxying for webapp integration.

### Game Catalog
- **Roachy Hunt (LIVE):** GPS-based creature hunting, catch, collect.
- **Roachy Mate (LIVE):** Native chess game with a weekly arena tournament.
- **Flappy Roachy (LIVE):** Endless flyer game with an NFT skin system.
- **Coming Soon:** Roachy Battles (PvP).

### Web App Integration
The mobile app integrates with `roachy.games` (webapp) for token trading (redirects only), powerup shop, balance synchronization, and OAuth synchronization. All webapp API calls from the client are proxied through the mobile backend for security.

## External Dependencies

### Blockchain Integration
- **Network:** Solana Mainnet Beta
- **Tokens:** ROACHY (SPL Token), DIAMOND (Token-2022)
- **Price Feed:** DexScreener API for ROACHY price and 24h change.
- **Balance Fetching:** Real on-chain balances via `@solana/web3.js`.

### Wallet Integration
- **Direct Deep-Link Protocol:** Phantom, Solflare, and Backpack wallets are supported using `tweetnacl` for encryption.
- **Reown AppKit SDK:** Used for WalletConnect-compatible wallets.

### Mapping and Location
- **OpenStreetMap tiles:** For Leaflet WebView map fallback.
- **Google Maps API Key:** For future native Google Maps on Android.
- **Apple Developer Account:** For future native Apple Maps on iOS.

### Build and Deployment
- **Expo SDK 53:** Core framework.
- **EAS Build:** For creating development, preview, and production builds.

### Cross-Platform Integration
- **Mobile App:** Handles game backend (spawns, catching, eggs, GPS gameplay).
- **Web App (roachy.games):** Handles landing page, marketplace, trading, analytics.
- **Shared Identity:** Wallet address serves as the universal user ID.
- **Integration Points:** Marketplace button, Deep Linking (`roachy-games://` scheme, `https://roachy.games/app/*` links), Universal Links (iOS), Intent Filters (Android).

### Force Update System
- **Purpose:** Block outdated native builds from accessing the app until users update via TestFlight/Play Store.
- **Trigger:** Webapp controls platform locks remotely via `/api/mobile/config` endpoint using simple toggle buttons.
- **Behavior:** Blocking screen shown ONLY in lobby/home screens and at game entry - NEVER during active gameplay.
- **Webapp API Contract:** The webapp should expose `GET /api/mobile/config` returning:
  ```json
  {
    "iosLocked": false,
    "androidLocked": false,
    "iosStoreUrl": "https://testflight.apple.com/join/YOUR_CODE",
    "androidStoreUrl": "https://play.google.com/store/apps/details?id=com.cryptocreatures.app",
    "message": "A new update is available. Please update to continue using Roachy Games."
  }
  ```
- **How to use:** When you release a new native build, toggle `iosLocked: true` or `androidLocked: true` to force users to update. Toggle back to `false` once everyone has updated.
- **Fallback:** If webapp is unavailable, defaults to unlocked (no blocking).
- **Protected Screens:** ArcadeHomeScreen, FlappyRoachScreen (checked at entry, before gameplay starts).